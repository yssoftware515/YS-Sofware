<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * VULN-27: the admin API carries a per-user rate limit (300/min,
 * throttle:admin). The budget is keyed by user ID — not IP — so the
 * whole admin team can share one egress without starving each other,
 * while a single scripted caller is capped. Public endpoints are
 * untouched by this limiter.
 *
 * F-004 (Phase 5A): the original tests fired 300 heavy dashboard calls
 * and depended on finishing inside the 60s limiter window — a wall-clock
 * race that flaked on slow hosts. The limiter state is now seeded
 * directly (same cache key the ThrottleRequests middleware resolves),
 * which makes every boundary deterministic and the suite fast.
 */
class AdminThrottleTest extends TestCase
{
    use RefreshDatabase;

    private const STATS = '/api/v1/admin/dashboard/stats';

    private function adminKey(User $user): string
    {
        // Named limiter 'admin' + ->by('user:'.$id): the middleware
        // resolves md5($limiterName.$limit->key) when shouldHashKeys is
        // on (default). Seeding this exact key keeps the test stable
        // without depending on how fast 300 HTTP calls complete.
        return md5('admin'.'user:'.$user->getAuthIdentifier());
    }

    private function consumeBudget(User $user, int $amount = 300): void
    {
        // RateLimiter::hit() adds one attempt per call (the second
        // argument is decay seconds, not an amount) — a tight loop over
        // the array cache store is deterministic and effectively free.
        for ($i = 0; $i < $amount; $i++) {
            RateLimiter::hit($this->adminKey($user));
        }
    }

    public function test_admin_endpoint_accepts_requests_below_the_threshold(): void
    {
        $user = $this->actingAsSuperAdmin();

        // 299 of 300 consumed — the next request is still accepted.
        $this->consumeBudget($user, 299);

        $this->getJson(self::STATS)->assertStatus(200);
    }

    public function test_admin_endpoint_rate_limited_after_300_requests(): void
    {
        $user = $this->actingAsSuperAdmin();

        $this->consumeBudget($user);

        $this->getJson(self::STATS)
            ->assertStatus(429)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'RATE_LIMIT_EXCEEDED');
    }

    public function test_admin_rate_limits_are_independent_per_user(): void
    {
        $userA = $this->actingAsSuperAdmin();
        $this->consumeBudget($userA);

        $this->getJson(self::STATS)->assertStatus(429);

        // A different user has their own budget — no shared exhaustion.
        $role = Role::factory()->create(['slug' => 'throttle_'.uniqid(), 'permissions' => ['*']]);
        $userB = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($userB, ['admin']);

        $this->getJson(self::STATS)->assertStatus(200);
    }

    public function test_public_endpoints_are_not_affected_by_admin_throttle(): void
    {
        $user = $this->actingAsSuperAdmin();
        $this->consumeBudget($user);

        $this->getJson(self::STATS)->assertStatus(429);

        // A public endpoint keeps working — it has its own throttle:public
        // budget (120/min) and is completely outside the admin limiter.
        $this->getJson('/api/v1/public/products')->assertStatus(200);
    }

    public function test_admin_limiter_recovers_after_the_window_expires(): void
    {
        $user = $this->actingAsSuperAdmin();
        $key = $this->adminKey($user);

        $this->consumeBudget($user);
        $this->getJson(self::STATS)->assertStatus(429);

        // Deterministic stand-in for the window elapsing: once the
        // limiter state is gone the budget is restored. The middleware
        // consults this exact state on every request.
        RateLimiter::clear($key);

        $this->getJson(self::STATS)->assertStatus(200);
    }
}