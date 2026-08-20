<?php

namespace App\Http\Controllers\Auth;

use App\Domains\Auth\Actions\ForgotPasswordAction;
use App\Domains\Auth\Actions\LoginAction;
use App\Domains\Auth\Actions\ResetPasswordAction;
use App\Domains\Auth\DTOs\LoginDTO;
use App\Domains\System\Services\AuditService;
use App\Exceptions\Auth\InvalidCredentialsException;
use App\Exceptions\Auth\InvalidResetTokenException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\Auth\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class AuthController extends Controller
{
    public function __construct(
        private readonly LoginAction $loginAction,
        private readonly ForgotPasswordAction $forgotPasswordAction,
        private readonly ResetPasswordAction $resetPasswordAction,
        private readonly AuditService $auditService,
    ) {}

    /**
     * POST /api/v1/auth/login
     *
     * The plain-text token is delivered EXCLUSIVELY through the HttpOnly
     * cookie, never through the response body — a XSS read on the admin
     * page cannot steal it, and browser devtools cannot log it. Clients
     * must call /auth/me with credentials to prove the session.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->loginAction->execute(
                LoginDTO::fromRequest($request)
            );

            $response = response()->json([
                'success' => true,
                'data' => [
                    'user' => new UserResource($result['user']),
                    'expires_at' => $result['expires_at'],
                ],
            ]);

            $response->headers->setCookie(
                $this->authCookie($result['token'], $result['expires_at'])
            );

            return $response;

        } catch (InvalidCredentialsException $e) {
            $status = $e->getCode() === 429
                ? Response::HTTP_TOO_MANY_REQUESTS
                : Response::HTTP_UNAUTHORIZED;

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => 'INVALID_CREDENTIALS',
            ], $status);
        }
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
                'code' => 'UNAUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Revoke current token only — and stay idempotent when the token
        // is already gone (deleted on another device/request): a missing
        // currentAccessToken() must not fatal the request.
        $token = $user->currentAccessToken();
        if ($token !== null) {
            $token->delete();
        }

        $this->auditService->log(
            action: 'auth.logout',
            resourceType: 'User',
            resourceId: $user->id,
            userId: $user->id,
        );

        $response = response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);

        // Expire the cookie with the same attributes used to set it —
        // a mismatched Domain/SameSite here would silently keep the
        // cookie alive on the client.
        $response->headers->setCookie($this->authCookie('', null, expired: true));

        return $response;
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource($request->user()->load('role')),
        ]);
    }

    /**
     * POST /api/v1/auth/change-password
     *
     * VULN-13: current password verified (422 on mismatch), policy
     * min-12/mixed-case/numbers/symbols enforced, new password must
     * differ from current. On success ALL tokens are revoked — the
     * client must log in again with the new password.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update([
            'password' => $request->validated('password'),
            'password_changed_at' => now(),
        ]);

        // Revoke ALL existing tokens, including the current one — a
        // password change is a trust boundary.
        $user->tokens()->delete();

        $this->auditService->log(
            action: 'auth.password_changed',
            resourceType: 'User',
            resourceId: $user->id,
            userId: $user->id,
        );

        return response()->json([
            'success' => true,
            'message' => 'Password changed. Please log in again.',
        ]);
    }

    /**
     * POST /api/v1/auth/forgot-password
     *
     * Identical 200 for existing and unknown addresses (no
     * enumeration). The per-email budget (3/hour) is burned for both,
     * and a route-level per-IP throttle guards against spray.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            $this->forgotPasswordAction->execute($request->validated('email'));
        } catch (TooManyRequestsHttpException) {
            return response()->json([
                'success' => false,
                'message' => 'Too many password reset requests. Please try again later.',
                'code' => 'RATE_LIMIT_EXCEEDED',
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        return response()->json([
            'success' => true,
            'message' => 'If the email exists, a reset link has been sent.',
        ]);
    }

    /**
     * POST /api/v1/auth/reset-password
     *
     * Token verified by SHA-256 hash, single-use, 1-hour expiry. All
     * invalid-token cases (unknown / used / expired) share one 403 body.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        try {
            $this->resetPasswordAction->execute(
                email: $request->validated('email'),
                token: $request->validated('token'),
                password: $request->validated('password'),
            );
        } catch (InvalidResetTokenException) {
            return response()->json([
                'success' => false,
                'message' => 'This password reset link is invalid or has expired.',
                'code' => 'INVALID_RESET_TOKEN',
            ], Response::HTTP_FORBIDDEN);
        }

        return response()->json([
            'success' => true,
            'message' => 'Password has been reset. Please log in again.',
        ]);
    }

    /**
     * Build the auth cookie. Laravel's CookieJar cannot express the
     * Partitioned (CHIPS) attribute, so the Symfony cookie is built
     * directly; the expiry is validated against the REAL token expiry
     * (falling back to the configured TTL when the timestamp is missing
     * or already in the past) instead of an abs()-wrapped diff.
     */
    private function authCookie(string $value, ?Carbon $expiresAt, bool $expired = false): Cookie
    {
        $config = config('security.cookies', []);
        // 'secure' falls back to the environment at RUNTIME (config files
        // cannot inspect the app yet; the controller can).
        $secure = (bool) ($config['secure'] ?? app()->isProduction());
        $partitioned = (bool) ($config['partitioned'] ?? false);

        $expires = $expired
            ? time() - 2628000 // one month in the past — forces deletion
            : ($expiresAt !== null && $expiresAt->isFuture()
                ? $expiresAt->getTimestamp()
                : time() + (int) config('security.session.admin_token_ttl_hours', 8) * 3600);

        return new Cookie(
            (string) ($config['name'] ?? 'ys_admin_token'),
            $value,
            $expires,
            '/',
            $config['domain'] ?? null,
            $secure,
            true, // httpOnly
            false, // raw
            Cookie::SAMESITE_LAX,
            $partitioned,
        );
    }
}
