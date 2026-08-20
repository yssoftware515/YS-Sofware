<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * VULN-10: dedicated permissions (manage_timeline, manage_feature_flags,
 * view_financials) existed in the enum and Gate definitions but had zero
 * call sites — timeline/feature-flags were silently gated by
 * manage_settings, and quoted-value sums leaked to every view_projects
 * holder. These tests pin the intended wiring.
 */
class PermissionCoverageTest extends TestCase
{
    use RefreshDatabase;

    private function userWithPermissions(array $permissions): User
    {
        $role = Role::factory()->create([
            'slug' => 'coverage_'.uniqid(),
            'permissions' => $permissions,
        ]);

        return User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
    }

    private function authAs(User $user): User
    {
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    public function test_timeline_requires_manage_timeline_not_manage_settings(): void
    {
        $settingsAdmin = $this->authAs($this->userWithPermissions(['manage_settings']));
        $this->getJson('/api/v1/admin/timeline')->assertStatus(403);

        $timelineAdmin = $this->authAs($this->userWithPermissions(['manage_timeline']));
        $this->getJson('/api/v1/admin/timeline')->assertOk();
    }

    public function test_feature_flags_require_manage_feature_flags_not_manage_settings(): void
    {
        $settingsAdmin = $this->authAs($this->userWithPermissions(['manage_settings']));
        $this->getJson('/api/v1/admin/feature-flags')->assertStatus(403);

        $flagsAdmin = $this->authAs($this->userWithPermissions(['manage_feature_flags']));
        $this->getJson('/api/v1/admin/feature-flags')->assertOk();
    }

    public function test_dashboard_financials_require_view_financials(): void
    {
        $projectManager = $this->authAs($this->userWithPermissions(['view_projects', 'manage_projects']));

        $response = $this->getJson('/api/v1/admin/dashboard/stats')->assertOk();
        $this->assertArrayNotHasKey('recorded_project_value_by_currency', $response->json('data.counts'));
        $this->assertArrayNotHasKey('active_project_value_by_currency', $response->json('data.counts'));
        $this->assertArrayNotHasKey('completed_project_value_by_currency', $response->json('data.counts'));

        $financier = $this->authAs($this->userWithPermissions(['view_projects', 'view_financials']));

        $response = $this->getJson('/api/v1/admin/dashboard/stats')->assertOk();
        $this->assertArrayHasKey('recorded_project_value_by_currency', $response->json('data.counts'));
        $this->assertArrayHasKey('active_project_value_by_currency', $response->json('data.counts'));
        $this->assertArrayHasKey('completed_project_value_by_currency', $response->json('data.counts'));
    }

    public function test_customer_show_financials_require_view_financials(): void
    {
        $customer = Customer::factory()->create();
        Project::factory()->create([
            'customer_id' => $customer->id,
            'quoted_value' => '125000.00',
            'currency' => 'USD',
            'status' => Project::STATUS_ACTIVE,
        ]);

        $viewer = $this->authAs($this->userWithPermissions(['view_customers', 'view_projects']));
        $this->getJson("/api/v1/admin/customers/{$customer->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.value_by_currency');

        $financier = $this->authAs($this->userWithPermissions(['view_customers', 'view_projects', 'view_financials']));
        $this->getJson("/api/v1/admin/customers/{$customer->id}")
            ->assertOk()
            ->assertJsonPath('data.value_by_currency.0.currency', 'USD')
            ->assertJsonPath('data.value_by_currency.0.total', '125000.00');
    }
}
