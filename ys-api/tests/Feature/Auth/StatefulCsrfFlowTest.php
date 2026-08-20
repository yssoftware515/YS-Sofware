<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Contracts\Encryption\Encrypter;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * G-01 regression: the browser (SPA) admin flow runs through Laravel
 * Sanctum's stateful middleware - every non-GET request carrying a
 * matching Origin/Referer is CSRF-gated. The frontend must prime the
 * XSRF-TOKEN cookie via GET /sanctum/csrf-cookie and echo the (URL-
 * decoded) cookie value in the X-XSRF-TOKEN header. Without that echo
 * the login 419s and the admin area is unusable from a browser.
 *
 * These tests reproduce the exact browser protocol and assert BOTH
 * sides: the handshake works, and the gate still rejects missing or
 * tampered tokens - including while authenticated.
 *
 * NOTE: Laravel's ValidateCsrfToken skips the check while unit tests
 * run (runningUnitTests()) - the reason the suite was green while G-01
 * was real. This test binds a subclass that forces real CSRF
 * enforcement, so the middleware behaves exactly as it does behind a
 * browser.
 *
 * The test client does not round-trip encrypted response cookies
 * automatically, so authenticated follow-up requests re-inject the
 * plaintext auth token with withCookie() (same pattern as AuthTest);
 * the full browser cookie round-trip is verified separately against a
 * live server during the release gates.
 */
class StatefulCsrfFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->app->bind(ValidateCsrfToken::class, function ($app) {
            return new class ($app, $app->make(Encrypter::class)) extends ValidateCsrfToken {
                protected function runningUnitTests(): bool
                {
                    return false;
                }
            };
        });
    }

    private function createAdminUser(): User
    {
        $role = Role::factory()->create([
            'slug' => 'super_admin',
            'permissions' => ['*'],
        ]);

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
            'password' => 'Password123!',
        ]);
    }

    /**
     * Perform the SPA CSRF handshake: GET /sanctum/csrf-cookie (stateful)
     * and return the XSRF-TOKEN cookie value plus the response.
     *
     * @return array{0: string, 1: TestResponse}
     */
    private function primeXsrfCookie(): array
    {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/admin/login',
        ])->get('/sanctum/csrf-cookie');

        $response->assertStatus(204);

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($c) => $c->getName() === 'XSRF-TOKEN');

        $this->assertNotNull($cookie, 'XSRF-TOKEN cookie was not set.');

        return [$cookie->getValue(), $response];
    }

    private function statefulHeaders(string $xsrf): array
    {
        return [
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/admin/login',
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'X-XSRF-TOKEN' => $xsrf,
        ];
    }

    private function originHeaders(): array
    {
        return [
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/admin/login',
        ];
    }

    public function test_stateful_post_without_xsrf_token_is_rejected_419(): void
    {
        $user = $this->createAdminUser();
        $this->primeXsrfCookie();

        // Same browser session, same Origin - but no X-XSRF-TOKEN echo:
        // the SPA handshake never ran, so the API must refuse (419).
        $this->withHeaders($this->originHeaders())
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'Password123!',
            ])->assertStatus(419)
            ->assertJson([
                'success' => false,
                'message' => 'CSRF token mismatch.',
            ]);
    }

    public function test_stateful_post_with_tampered_xsrf_token_is_rejected_419(): void
    {
        $user = $this->createAdminUser();
        $this->primeXsrfCookie();

        // An attacker-supplied token cannot decrypt to the session token.
        $this->withHeaders($this->statefulHeaders('forged-token'))
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'Password123!',
            ])->assertStatus(419);
    }

    public function test_browser_flow_csrf_handshake_login_me_logout(): void
    {
        $user = $this->createAdminUser();
        [$xsrf, $csrfResponse] = $this->primeXsrfCookie();

        // The XSRF cookie must be readable by client JS (it is NOT
        // HttpOnly - that is what makes the SPA echo possible). The
        // session cookie stays HttpOnly, which is the security boundary.
        $sessionCookie = collect($csrfResponse->headers->getCookies())
            ->first(fn ($c) => $c->getName() === 'ys_session');
        $this->assertNotNull($sessionCookie, 'Session cookie was not set.');
        $this->assertTrue($sessionCookie->isHttpOnly(), 'Session cookie must stay HttpOnly.');

        // 1) Login with the echoed cookie value -> CSRF passes.
        $login = $this->withHeaders($this->statefulHeaders($xsrf))
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'Password123!',
            ]);

        $login->assertStatus(200)
            ->assertJson(['success' => true]);

        // The login delivered its token encrypted in ys_admin_token (the
        // DB only keeps the hash, so the plaintext is not recoverable
        // here). Re-inject an equivalent session token with withCookie()
        // for the authenticated follow-ups - same pattern as AuthTest's
        // round-trip test; the browser cookie round-trip itself is
        // verified against a live server during the release gates.
        $plainTextToken = $user->createToken('admin-session', ['admin'], now()->addHours(8))
            ->plainTextToken;

        // 2) The cookie-authenticated session serves stateful GETs.
        $this->withCookie('ys_admin_token', $plainTextToken)
            ->withHeaders($this->originHeaders())
            ->withCredentials()
            ->getJson('/api/v1/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('data.email', $user->email);

        // 3) Logout is a stateful POST and the echo is required again; the
        // test client sends cookies only when withCredentials() is set,
        // so this mirrors the browser exactly (cookie + echoed token).
        $this->withCookie('ys_admin_token', $plainTextToken)
            ->withHeaders($this->statefulHeaders($xsrf))
            ->withCredentials()
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_stateful_write_after_login_requires_echo_still(): void
    {
        $user = $this->createAdminUser();
        [$xsrf] = $this->primeXsrfCookie();

        $login = $this->withHeaders($this->statefulHeaders($xsrf))
            ->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'Password123!',
            ]);
        $login->assertStatus(200);

        $plainTextToken = $user->createToken('admin-session', ['admin'], now()->addHours(8))
            ->plainTextToken;

        // An authenticated session does NOT bypass CSRF: a stateful POST
        // without the echo is refused (419) even while logged in - the
        // gate fires before the auth/cookie layer can be reached.
        // (withHeaders merges into the shared header set, so the login's
        // X-XSRF-TOKEN must be dropped explicitly to truly remove the
        // echo from the wire.)
        $this->withoutHeader('X-XSRF-TOKEN');

        $this->withCookie('ys_admin_token', $plainTextToken)
            ->withHeaders($this->originHeaders())
            ->withCredentials()
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(419);
    }
}
