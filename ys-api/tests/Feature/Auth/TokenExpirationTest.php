<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Regression: EnforceIdleSessionTimeout previously only enforced idle
 * timeout (sliding window). It did NOT enforce the token's expires_at
 * column. The middleware now enforces two independent session boundaries:
 *
 *   1. Idle timeout — sliding, reset by activity.
 *   2. Absolute expiration — fixed at token creation, NEVER extended.
 *
 * NOTE: Sanctum's own guard already rejects tokens whose expires_at is
 * in the past (Guard.php:129). Expired tokens are rejected with
 * UNAUTHENTICATED at the authentication layer, before any route
 * middleware runs. The middleware's absolute-expiration check is
 * defense-in-depth: it catches any edge case where a token somehow
 * passes guard resolution despite being expired.
 */
class TokenExpirationTest extends TestCase
{
    use RefreshDatabase;

    private function createUserWithToken(?Carbon $expiresAt = null): array
    {
        $role = Role::factory()->create(['slug' => 'token_exp_'.uniqid(), 'permissions' => ['*']]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $token = $user->createToken('admin-session', ['admin'], $expiresAt ?? now()->addHours(8));

        return [$user, $token->plainTextToken, $token->accessToken->id];
    }

    private function stampLastUsedAt(int $tokenId, string $when): void
    {
        DB::table('personal_access_tokens')->where('id', $tokenId)->update(['last_used_at' => $when]);
    }

    // ── Test A: Valid token authenticates normally ────────────────────

    public function test_valid_token_authenticates_normally(): void
    {
        [$user, $token] = $this->createUserWithToken(now()->addHours(8));

        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    // ── Test B: Expired token is rejected by Sanctum ──────────────────

    public function test_expired_token_is_rejected(): void
    {
        [$user, $token] = $this->createUserWithToken(now()->subHour());

        // Sanctum's guard rejects expired tokens at authentication time.
        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('code', 'UNAUTHENTICATED');
    }

    // ── Test C: Recently active but absolutely expired ────────────────
    // MANDATORY: This proves idle activity cannot bypass absolute expiry.

    public function test_recently_active_but_absolutely_expired_token_is_rejected(): void
    {
        [$user, $token, $tokenId] = $this->createUserWithToken(now()->subMinute());

        // Simulate recent activity — the token was used 1 second ago.
        $this->stampLastUsedAt($tokenId, now()->subSecond()->toDateTimeString());

        // Sanctum rejects the expired token regardless of recent activity.
        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('code', 'UNAUTHENTICATED');
    }

    // ── Test D: Idle timeout still works ──────────────────────────────

    public function test_idle_timeout_still_rejects_inactive_token(): void
    {
        [$user, $token, $tokenId] = $this->createUserWithToken(now()->addHours(8));

        // But last_used_at is 3 hours ago — exceeds 2h idle timeout.
        $this->stampLastUsedAt($tokenId, now()->subHours(3)->toDateTimeString());

        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('code', 'SESSION_EXPIRED');

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
    }

    // ── Test E: Remember-me token absolute expiration ─────────────────

    public function test_remember_me_token_respects_absolute_expiration(): void
    {
        [$user, $token, $tokenId] = $this->createUserWithToken(now()->addDays(30));

        // Recent activity — still valid.
        $this->stampLastUsedAt($tokenId, now()->toDateTimeString());
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();

        // Fast-forward past expiry — Sanctum rejects.
        Carbon::setTestNow(now()->addDays(30)->addMinute());
        try {
            $this->app['auth']->forgetGuards();
            $this->withToken($token)->getJson('/api/v1/auth/me')
                ->assertStatus(401)
                ->assertJsonPath('code', 'UNAUTHENTICATED');
        } finally {
            Carbon::setTestNow();
        }
    }

    // ── Test F: Expired token cannot be reused ────────────────────────

    public function test_expired_token_cannot_be_reused(): void
    {
        [$user, $token] = $this->createUserWithToken(now()->subMinute());

        // First request — token is expired.
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(401);

        // Second request — same token, still unauthorized.
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    // ── Test G: Boundary condition — token just before expiry ──────────

    public function test_token_just_before_absolute_expiry_is_accepted(): void
    {
        [$user, $token, $tokenId] = $this->createUserWithToken(now()->addMinutes(30));

        // Recent activity and not yet expired.
        $this->stampLastUsedAt($tokenId, now()->toDateTimeString());

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();
    }

    // ── Test H: Active session refreshes last_used_at ─────────────────

    public function test_active_session_refreshes_last_used_at(): void
    {
        [$user, $token, $tokenId] = $this->createUserWithToken(now()->addHours(8));
        $this->stampLastUsedAt($tokenId, now()->subMinutes(10)->toDateTimeString());

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();

        $fresh = DB::table('personal_access_tokens')->where('id', $tokenId)->value('last_used_at');
        $this->assertTrue(
            Carbon::parse($fresh)->gt(now()->subMinute()),
            'A surviving session must have its last_used_at refreshed.',
        );
    }

    // ── Audit trail verification ──────────────────────────────────────

    public function test_idle_timeout_creates_audit_log(): void
    {
        [$user, $token, $tokenId] = $this->createUserWithToken(now()->addHours(8));
        $this->stampLastUsedAt($tokenId, now()->subHours(3)->toDateTimeString());

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(401);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.session_idle_timeout',
            'resource_id' => $user->id,
        ]);
    }
}
