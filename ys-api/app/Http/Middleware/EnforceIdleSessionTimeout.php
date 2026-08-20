<?php

namespace App\Http\Middleware;

use App\Domains\System\Services\AuditService;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * VULN-14: sliding idle timeout for bearer sessions.
 *
 * Runs AFTER auth:sanctum so the token is already resolved. Sanctum's own
 * last_used_at stamping is disabled (config/sanctum.php) because it fires
 * during guard resolution — before any route middleware — which would
 * mask every token as just-active. This middleware checks first and
 * stamps last_used_at only for sessions that survive the window.
 */
class EnforceIdleSessionTimeout
{
    public function __construct(private readonly AuditService $auditService) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $token = $user->currentAccessToken()) {
            // Real DB-backed tokens only — Sanctum::actingAs() hands out
            // a Mockery mock of PersonalAccessToken whose properties are
            // all falsy, and a TransientToken carries no row at all.
            if ($token instanceof PersonalAccessToken && $token->exists) {
                $idleHours = (float) config('security.session.idle_timeout_hours', 2);
                $lastSeen = $token->last_used_at ?? $token->created_at;

                if ($lastSeen === null || $lastSeen->lt(now()->subHours($idleHours))) {
                    $token->delete();

                    $this->auditService->log(
                        'auth.session_idle_timeout',
                        'user',
                        $user->id,
                        $user->id,
                        context: ['idle_hours' => $idleHours],
                    );

                    return response()->json([
                        'success' => false,
                        'message' => 'Session expired due to inactivity. Please log in again.',
                        'code' => 'SESSION_EXPIRED',
                    ], Response::HTTP_UNAUTHORIZED);
                }

                $token->forceFill(['last_used_at' => now()])->save();
            }
        }

        return $next($request);
    }
}
