<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Cms\Models\Faq;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Product\Models\Product;
use App\Domains\Services\Models\Service;
use App\Domains\System\Services\DashboardService;
use App\Domains\System\Services\HealthCheckService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
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
        Product::factory()->count(3)->create();
        Service::factory()->count(2)->create();
        Faq::factory()->count(2)->create();
        ContactRequest::factory()->create(['status' => 'new']);

        $data = $this->dashboardService()->stats($user);

        $this->assertSame(3, $data['counts']['products']);
        $this->assertSame(2, $data['counts']['services']);
        $this->assertSame(2, $data['counts']['faqs']);
        $this->assertSame(1, $data['counts']['new_contact_requests']);
        $this->assertArrayHasKey('projects_overdue', $data['attention']);
        $this->assertNotEmpty($data['recent_contact_requests']);
        $this->assertSame('ok', $data['health']['status']);
    }

    public function test_scoped_admin_only_receives_permitted_counts(): void
    {
        $user = $this->actingAsScoped(['manage_products']);
        $products = Product::factory()->count(4)->create();
        $user->products()->attach($products->pluck('id'));
        ContactRequest::factory()->create(['status' => 'new']);

        $data = $this->dashboardService()->stats($user);

        $this->assertSame(4, $data['counts']['products']);
        $this->assertArrayNotHasKey('services', $data['counts'], 'A user without the services permission must not receive services counts.');
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
}