<?php

namespace Tests\Feature\Auth;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * VULN-14: bearer sessions die after the idle window (default 2h) and
 * the absolute expiry ceiling (8h/30d from LoginAction) still applies.
 * last_used_at is stamped by EnforceIdleSessionTimeout — Sanctum's own
 * stamping is disabled because it fires during guard resolution, before
 * any route middleware could observe it.
 */
class IdleSessionTimeoutTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: User, 1: string, 2: int}
     */
    private function createUserWithToken(): array
    {
        $role = Role::factory()->create(['slug' => 'idle_'.uniqid(), 'permissions' => ['*']]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $token = $user->createToken('device', ['admin']);

        return [$user, $token->plainTextToken, $token->accessToken->id];
    }

    private function stampLastUsedAt(int $tokenId, string $when): void
    {
        DB::table('personal_access_tokens')->where('id', $tokenId)->update(['last_used_at' => $when]);
    }

    public function test_idle_token_beyond_timeout_is_rejected_and_deleted(): void
    {
        [$user, $token, $tokenId] = $this->createUserWithToken();
        $this->stampLastUsedAt($tokenId, now()->subHours(3)->toDateTimeString());

        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('code', 'SESSION_EXPIRED');

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.session_idle_timeout',
            'resource_id' => $user->id,
        ]);
    }

    public function test_active_session_is_allowed_and_refreshes_last_used_at(): void
    {
        [, $token, $tokenId] = $this->createUserWithToken();
        $this->stampLastUsedAt($tokenId, now()->subMinutes(10)->toDateTimeString());

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(200);

        $fresh = DB::table('personal_access_tokens')->where('id', $tokenId)->value('last_used_at');
        $this->assertTrue(
            Carbon::parse($fresh)->gt(now()->subMinute()),
            'A surviving session must have its last_used_at refreshed.'
        );
    }

    public function test_absolute_expiry_still_enforced(): void
    {
        $role = Role::factory()->create(['slug' => 'idle_'.uniqid(), 'permissions' => ['*']]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $expired = $user->createToken('device', ['admin'], now()->subMinute())->plainTextToken;

        $this->withToken($expired)->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('code', 'UNAUTHENTICATED');
    }

    public function test_never_used_token_created_within_timeout_is_allowed(): void
    {
        [, $token] = $this->createUserWithToken();

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(200);
    }

    public function test_never_used_token_older_than_timeout_is_rejected(): void
    {
        [$user, $token, $tokenId] = $this->createUserWithToken();

        DB::table('personal_access_tokens')->where('id', $tokenId)
            ->update(['created_at' => now()->subHours(3)->toDateTimeString()]);

        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('code', 'SESSION_EXPIRED');

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.session_idle_timeout',
            'resource_id' => $user->id,
        ]);
    }

    public function test_timeout_is_configurable_via_env(): void
    {
        [, $tokenA, $tokenIdA] = $this->createUserWithToken();
        [, $tokenB, $tokenIdB] = $this->createUserWithToken();
        $this->stampLastUsedAt($tokenIdA, now()->subHours(2)->toDateTimeString());
        $this->stampLastUsedAt($tokenIdB, now()->subHours(2)->toDateTimeString());

        // A 2h-old last activity is within a 5h window...
        config(['security.session.idle_timeout_hours' => 5]);
        $this->withToken($tokenA)->getJson('/api/v1/auth/me')->assertStatus(200);

        // ...but exceeds a 1h window. Forget the guards first: Sanctum's
        // RequestGuard caches the resolved user for the test process.
        $this->app['auth']->forgetGuards();
        config(['security.session.idle_timeout_hours' => 1]);
        $this->withToken($tokenB)->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('code', 'SESSION_EXPIRED');
    }

    public function test_idle_check_covers_admin_routes(): void
    {
        [, $token, $tokenId] = $this->createUserWithToken();
        $this->stampLastUsedAt($tokenId, now()->subHours(3)->toDateTimeString());

        $this->withToken($token)->getJson('/api/v1/admin/customers')
            ->assertStatus(401)
            ->assertJsonPath('code', 'SESSION_EXPIRED');
    }
}
