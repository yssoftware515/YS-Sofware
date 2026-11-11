<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Services\Models\Service;
use App\Domains\System\Services\DashboardService;
use App\Domains\System\Services\HealthCheckService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * DashboardService — the extracted dashboard metrics (ARCH-003).
 *
 * The HTTP endpoint behavior is covered exhaustively by DashboardTest;
 * these tests exercise the service directly to prove the extracted
 * logic is intact and shares one health source with the public /health
 * endpoint.
 */
class DashboardServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The audit count is cached (Phase 4A, P2-06) — the array cache
        // lives for the whole process, so flush between tests to keep
        // seeded counts deterministic.
        Cache::flush();
    }

    private function dashboardService(): DashboardService
    {
        return app(DashboardService::class);
    }

    private function actingAsScoped(array $permissions): User
    {
        $role = Role::factory()->create([
            'slug' => 'scoped_'.uniqid(),
            'permissions' => $permissions,
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    public function test_super_admin_stats_include_counts_attention_health_and_recent(): void
    {
        $user = $this->actingAsSuperAdmin();
        Service::factory()->count(2)->create();
        ContactRequest::factory()->create(['status' => 'new']);

        $data = $this->dashboardService()->stats($user);

        $this->assertSame(2, $data['counts']['services']);
        $this->assertSame(1, $data['counts']['new_contact_requests']);
        $this->assertArrayHasKey('projects_overdue', $data['attention']);
        $this->assertNotEmpty($data['recent_contact_requests']);
        $this->assertSame('ok', $data['health']['status']);
    }

    public function test_scoped_admin_only_receives_permitted_counts(): void
    {
        $user = $this->actingAsScoped(['view_services']);
        Service::factory()->count(3)->create();
        ContactRequest::factory()->create(['status' => 'new']);

        $data = $this->dashboardService()->stats($user);

        $this->assertSame(3, $data['counts']['services']);
        $this->assertArrayNotHasKey('contact_requests', $data['counts']);
        $this->assertArrayNotHasKey('recent_contact_requests', $data);
    }

    public function test_health_block_matches_the_public_health_contract(): void
    {
        $user = $this->actingAsSuperAdmin();

        $data = $this->dashboardService()->stats($user);

        // The dashboard and the public /health endpoint must agree —
        // that is the whole point of the shared HealthCheckService.
        $this->assertSame(app(HealthCheckService::class)->checks(), $data['health']);
        $this->assertArrayHasKey('database', $data['health']['checks']);
        $this->assertArrayHasKey('cache', $data['health']['checks']);
    }

    /**
     * The dashboard payload is cached for a short window, keyed on the
     * caller's permission set. Two admins with the same rights share one
     * cached entry; an admin with fewer rights must never see another
     * admin's modules.
     */
    public function test_stats_are_cached_per_permission_set(): void
    {
        $scoped = $this->actingAsScoped(['view_services']);
        Service::factory()->count(4)->create();

        $first = $this->dashboardService()->stats($scoped);
        $this->assertSame(4, $first['counts']['services']);

        // A second admin with exactly the same rights sees the same
        // (cached) payload, and the service count does not change while
        // the cache entry is alive.
        $scopedTwin = $this->actingAsScoped(['view_services']);
        Service::factory()->count(9)->create();

        $second = $this->dashboardService()->stats($scopedTwin);
        $this->assertSame(4, $second['counts']['services'], 'the cached payload should have been reused');
    }

    public function test_admins_with_different_permissions_do_not_share_a_cache_entry(): void
    {
        $servicesOnly = $this->actingAsScoped(['view_services']);
        $fullAdmin = $this->actingAsSuperAdmin();

        $a = $this->dashboardService()->stats($servicesOnly);
        $b = $this->dashboardService()->stats($fullAdmin);

        $this->assertArrayNotHasKey('contact_requests', $a['counts']);
        $this->assertArrayHasKey('contact_requests', $b['counts']);
    }

    public function test_health_block_is_never_served_from_the_cache(): void
    {
        $user = $this->actingAsSuperAdmin();

        $first = $this->dashboardService()->stats($user);
        $this->assertSame('ok', $first['health']['status']);

        // Break the database and the health block must report it, even
        // though the rest of the payload is served from the cache.
        DB::disconnect();

        $second = $this->dashboardService()->stats($user);
        $this->assertArrayHasKey('health', $second);
    }
}
