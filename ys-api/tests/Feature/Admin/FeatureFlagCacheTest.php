<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\System\Models\FeatureFlag;
use App\Domains\System\Services\FeatureFlagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use RuntimeException;
use Tests\TestCase;

/**
 * FeatureFlagService resilience contract (Phase 4A, P1-01).
 *
 * The service must work normally through the cache, and must degrade
 * to the database (source of truth) when the cache backend is down —
 * never 500, never invent flag states.
 */
class FeatureFlagCacheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    public function test_flags_work_normally_through_the_cache(): void
    {
        FeatureFlag::create([
            'key' => 'beta_dashboard',
            'is_enabled' => true,
            'environment' => 'all',
        ]);
        FeatureFlag::create([
            'key' => 'beta_off',
            'is_enabled' => false,
            'environment' => 'all',
        ]);

        $service = app(FeatureFlagService::class);

        $this->assertTrue($service->isEnabled('beta_dashboard'));
        $this->assertFalse($service->isEnabled('beta_off'));
        $this->assertFalse($service->isEnabled('missing_flag'));

        // Second read is served from the cache (no DB query)
        $this->assertTrue($service->isEnabled('beta_dashboard'));
        $this->assertTrue(Cache::has('ys:feature_flags:all'));
    }

    public function test_environment_targeting_is_preserved(): void
    {
        FeatureFlag::create(['key' => 'prod_only', 'is_enabled' => true, 'environment' => 'production']);
        FeatureFlag::create(['key' => 'any_env', 'is_enabled' => true, 'environment' => 'all']);

        $service = app(FeatureFlagService::class);

        $this->assertFalse($service->isEnabled('prod_only')); // tests run in "testing"
        $this->assertTrue($service->isEnabled('any_env'));
    }

    public function test_role_targeting_is_preserved(): void
    {
        $role = Role::factory()->create(['slug' => 'vip']);
        $user = User::factory()->create(['role_id' => $role->id]);

        FeatureFlag::create([
            'key' => 'targeted',
            'is_enabled' => true,
            'environment' => 'all',
            'enabled_for' => ['roles' => ['vip']],
        ]);

        $service = app(FeatureFlagService::class);

        $this->assertFalse($service->isEnabledFor('targeted'));      // anonymous
        $this->assertTrue($service->isEnabledFor('targeted', $user)); // matching role
    }

    public function test_cache_failure_degrades_to_database_without_error(): void
    {
        FeatureFlag::create(['key' => 'beta_dashboard', 'is_enabled' => true, 'environment' => 'all']);

        Cache::partialMock()
            ->shouldReceive('get')
            ->andThrow(new RuntimeException('cache backend down'));

        $service = app(FeatureFlagService::class);

        // No 500: the service falls back to the DB (source of truth).
        $this->assertTrue($service->isEnabled('beta_dashboard'));
    }

    public function test_invalidate_is_best_effort_when_cache_is_down(): void
    {
        FeatureFlag::create(['key' => 'beta_dashboard', 'is_enabled' => true, 'environment' => 'all']);

        $service = app(FeatureFlagService::class);
        $this->assertTrue($service->isEnabled('beta_dashboard'));

        Cache::partialMock()
            ->shouldReceive('get')->andThrow(new RuntimeException('cache backend down'))
            ->shouldReceive('forget')->andThrow(new RuntimeException('cache backend down'));

        // No exception: invalidation is best-effort, staleness is TTL-bounded.
        $service->invalidate();

        $this->assertTrue($service->isEnabled('beta_dashboard'));
    }

    public function test_admin_flows_still_invalidate_the_cache(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/feature-flags', [
            'key' => 'beta_dashboard',
            'is_enabled' => false,
            'environment' => 'all',
        ])->assertStatus(201);

        $service = app(FeatureFlagService::class);

        $this->assertFalse($service->isEnabled('beta_dashboard'));
        $this->assertTrue(Cache::has('ys:feature_flags:all'));

        $flag = FeatureFlag::where('key', 'beta_dashboard')->firstOrFail();

        $this->putJson("/api/v1/admin/feature-flags/{$flag->id}", ['is_enabled' => true])
            ->assertStatus(200);

        // Cache invalidated on update — the new state is observed immediately.
        $this->assertTrue($service->isEnabled('beta_dashboard'));
    }
}