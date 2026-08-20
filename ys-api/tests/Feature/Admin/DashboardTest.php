<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Cms\Models\Faq;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductRelease;
use App\Domains\Services\Models\Service;
use App\Domains\System\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardTest extends TestCase
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

    public function test_unauthenticated_user_cannot_view_dashboard_stats(): void
    {
        $response = $this->getJson('/api/v1/admin/dashboard/stats');
        $response->assertStatus(401);
    }

    public function test_super_admin_sees_real_counts_and_health(): void
    {
        $this->actingAsSuperAdmin();
        Product::factory()->count(3)->create();
        Service::factory()->count(2)->create();
        ContactRequest::factory()->create(['status' => 'new']);
        ContactRequest::factory()->create(['status' => 'read']);
        Faq::factory()->count(2)->create();

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.counts.products', 3)
            ->assertJsonPath('data.counts.services', 2)
            ->assertJsonPath('data.counts.contact_requests', 2)
            ->assertJsonPath('data.counts.new_contact_requests', 1)
            ->assertJsonPath('data.counts.faqs', 2)
            ->assertJsonStructure([
                'data' => [
                    'counts' => ['products', 'releases', 'services', 'careers', 'contact_requests', 'audit_logs', 'static_pages', 'faqs', 'menus', 'homepage_sections'],
                    'health' => ['status', 'checks' => ['database', 'cache']],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.recent_contact_requests'));
    }

    public function test_scoped_admin_only_sees_permitted_counts(): void
    {
        // A role with exactly one permission must only receive that count.
        $role = Role::factory()->create([
            'slug' => 'products_only',
            'permissions' => ['manage_products'],
        ]);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        Sanctum::actingAs($user, ['admin']);

        $products = Product::factory()->count(4)->create();
        $user->products()->attach($products->pluck('id'));
        ContactRequest::factory()->create(['status' => 'new']);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.counts.products', 4)
            ->assertJsonMissingPath('data.counts.contact_requests')
            ->assertJsonMissingPath('data.counts.services')
            ->assertJsonMissingPath('data.recent_contact_requests')
            ->assertJsonPath('data.health.status', 'ok');
    }

    public function test_scoped_admin_product_counts_are_limited_to_granted_products(): void
    {
        $role = Role::factory()->create([
            'slug' => 'scoped_products',
            'permissions' => ['manage_products'],
        ]);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        Sanctum::actingAs($user, ['admin']);

        $granted = Product::factory()->active()->create();
        $hidden = Product::factory()->active()->create();
        ProductRelease::factory()->count(2)->create(['product_id' => $granted->id]);
        ProductRelease::factory()->count(5)->create(['product_id' => $hidden->id]);

        $user->products()->attach($granted->id);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.counts.products', 1)
            ->assertJsonPath('data.counts.releases', 2);
    }

    public function test_recent_audit_logs_require_view_audit_logs(): void
    {
        $this->actingAsSuperAdmin();
        AuditLog::factory()->count(7)->create();

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.counts.audit_logs', 7);

        $recent = $response->json('data.recent_audit_logs');
        $this->assertCount(6, $recent);
        $this->assertArrayHasKey('action', $recent[0]);
        $this->assertArrayHasKey('user_name', $recent[0]);

        // Restricted role without view_audit_logs gets nothing for audit logs.
        $role = Role::factory()->create([
            'slug' => 'no_audit',
            'permissions' => ['manage_settings'],
        ]);
        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        Sanctum::actingAs($user, ['admin']);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');
        $response->assertStatus(200)
            ->assertJsonMissingPath('data.counts.audit_logs')
            ->assertJsonMissingPath('data.recent_audit_logs');
    }

    public function test_dashboard_includes_business_metrics_for_super_admin(): void
    {
        $this->actingAsSuperAdmin();
        $sharedCustomer = Customer::factory()->create(['status' => 'active']);
        Customer::factory()->count(2)->create(['status' => 'active']);
        Customer::factory()->create(['status' => 'archived']);
        Project::factory()->create(['customer_id' => $sharedCustomer->id, 'status' => 'active', 'quoted_value' => 50000]);
        Project::factory()->create(['customer_id' => $sharedCustomer->id, 'status' => 'completed', 'quoted_value' => 25000]);
        Project::factory()->create(['customer_id' => $sharedCustomer->id, 'status' => 'cancelled', 'quoted_value' => 99000]);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.counts.customers', 4)
            ->assertJsonPath('data.counts.active_customers', 3)
            ->assertJsonPath('data.counts.projects', 3)
            ->assertJsonPath('data.counts.active_projects', 1)
            ->assertJsonPath('data.counts.completed_projects', 1)
            // Cancelled project excluded from recorded value; money leaves
            // the endpoint grouped per currency as decimal strings.
            ->assertJsonPath('data.counts.recorded_project_value_by_currency.USD', '75000.00')
            ->assertJsonPath('data.counts.active_project_value_by_currency.USD', '50000.00')
            ->assertJsonPath('data.counts.completed_project_value_by_currency.USD', '25000.00');
    }

    public function test_dashboard_business_metrics_are_permission_filtered(): void
    {
        // view_customers only — receives customer counts, never projects.
        $role = Role::factory()->create([
            'slug' => 'customers_only',
            'permissions' => ['view_customers'],
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        $sharedCustomer = Customer::factory()->create();
        Project::factory()->count(5)->create(['customer_id' => $sharedCustomer->id, 'quoted_value' => 1000]);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.counts.customers', 1)
            ->assertJsonMissingPath('data.counts.projects')
            ->assertJsonMissingPath('data.counts.active_projects')
            ->assertJsonMissingPath('data.counts.recorded_project_value_by_currency');

        // view_projects only — sees project metrics, never customer counts.
        $role2 = Role::factory()->create([
            'slug' => 'projects_only',
            'permissions' => ['view_projects', 'view_financials'],
        ]);
        $user2 = User::factory()->create(['role_id' => $role2->id, 'is_active' => true]);
        Sanctum::actingAs($user2, ['admin']);

        $response2 = $this->getJson('/api/v1/admin/dashboard/stats');

        $response2->assertStatus(200)
            ->assertJsonPath('data.counts.projects', 5)
            ->assertJsonPath('data.counts.recorded_project_value_by_currency.USD', '5000.00')
            ->assertJsonMissingPath('data.counts.customers')
            ->assertJsonMissingPath('data.counts.active_customers');
    }

    // ── Sprint 7 ─────────────────────────────────────────────────────

    public function test_dashboard_values_are_grouped_per_currency(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        Project::factory()->create(['customer_id' => $customer->id, 'status' => 'active', 'quoted_value' => 40000, 'currency' => 'USD']);
        Project::factory()->create(['customer_id' => $customer->id, 'status' => 'active', 'quoted_value' => 20000, 'currency' => 'USD']);
        Project::factory()->create(['customer_id' => $customer->id, 'status' => 'active', 'quoted_value' => 90000, 'currency' => 'SAR']);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.counts.active_project_value_by_currency.USD', '60000.00')
            ->assertJsonPath('data.counts.active_project_value_by_currency.SAR', '90000.00');
    }

    public function test_dashboard_reports_overdue_and_on_hold_projects(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        Project::factory()->create([
            'customer_id' => $customer->id,
            'name' => 'Late Website',
            'status' => 'active',
            'expected_completion_date' => now()->subDays(5)->toDateString(),
        ]);
        Project::factory()->create([
            'customer_id' => $customer->id,
            'name' => 'On Hold App',
            'status' => 'on_hold',
        ]);
        Project::factory()->create([
            'customer_id' => $customer->id,
            'name' => 'Future Platform',
            'status' => 'active',
            'expected_completion_date' => now()->addWeek()->toDateString(),
        ]);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200);
        $overdue = $response->json('data.attention.projects_overdue');
        $this->assertSame(1, $overdue['total']);
        $this->assertSame('Late Website', $overdue['items'][0]['name']);
        $this->assertSame(5, $overdue['items'][0]['days_overdue']);

        $onHold = $response->json('data.attention.projects_on_hold');
        $this->assertSame(1, $onHold['total']);
        $this->assertSame('On Hold App', $onHold['items'][0]['name']);
    }

    public function test_dashboard_flags_completed_projects_without_completion_timestamp(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        Project::factory()->create([
            'customer_id' => $customer->id,
            'name' => 'Done But Untimestamped',
            'status' => 'completed',
            'completed_at' => null,
        ]);
        Project::factory()->create([
            'customer_id' => $customer->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $flags = $response->json('data.attention.data_integrity.completed_without_completed_at');
        $this->assertSame('Done But Untimestamped', $flags['items'][0]['name']);
    }

    public function test_dashboard_attention_for_new_contact_requests(): void
    {
        $this->actingAsSuperAdmin();
        ContactRequest::factory()->create(['status' => 'new', 'name' => 'Fresh Inquiry']);
        ContactRequest::factory()->create(['status' => 'contacted']);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $new = $response->json('data.attention.new_contact_requests');
        $this->assertSame(1, $new['total']);
        $this->assertSame('Fresh Inquiry', $new['items'][0]['name']);
    }

    public function test_manage_only_permission_unlocks_matching_dashboard_metrics(): void
    {
        // Sprint 7 gate alignment: a manager who cannot view the module
        // still reads its operational numbers on the dashboard — the same
        // effective access they have on the module's own screens.
        $role = Role::factory()->create([
            'slug' => 'manage_projects_only',
            'permissions' => ['manage_projects'],
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        $sharedCustomer = Customer::factory()->create();
        Project::factory()->count(3)->create([
            'customer_id' => $sharedCustomer->id,
            'status' => 'active',
            'expected_completion_date' => now()->addMonth()->toDateString(),
        ]);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.counts.projects', 3)
            ->assertJsonPath('data.attention.projects_overdue.total', 0)
            ->assertJsonMissingPath('data.counts.customers')
            ->assertJsonMissingPath('data.attention.new_contact_requests');
    }

    public function test_view_only_permissions_unlock_matching_dashboard_counts(): void
    {
        // Sprint 9 Phase C: dashboard gates mirror the module screens —
        // a user holding ONLY the view_* flag for a module still reads
        // its counts (the same data the screens let them read).
        $role = Role::factory()->create([
            'slug' => 'viewer_products_services',
            'permissions' => ['view_products', 'view_services'],
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        $products = Product::factory()->count(3)->create();
        $user->products()->attach($products->pluck('id'));
        Service::factory()->count(2)->create();
        ContactRequest::factory()->create(['status' => 'new']);

        $this->getJson('/api/v1/admin/dashboard/stats')
            ->assertStatus(200)
            ->assertJsonPath('data.counts.products', 3)
            ->assertJsonPath('data.counts.services', 2)
            // contact requests have no view_* permission — never leaked
            ->assertJsonMissingPath('data.counts.contact_requests')
            ->assertJsonMissingPath('data.counts.projects')
            ->assertJsonMissingPath('data.attention.new_contact_requests');
    }

    // ── Sprint 8 Phase C — delivery signals ──────────────────────────

    public function test_dashboard_reports_blocked_and_overdue_tasks_plus_upcoming_milestone(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $project = Project::factory()->create(['customer_id' => $customer->id, 'name' => 'Launch Website']);
        $otherProject = Project::factory()->create(['customer_id' => $customer->id, 'name' => 'Internal App']);

        Task::factory()->create(['project_id' => $project->id, 'title' => 'Fix auth flow', 'status' => 'blocked', 'due_date' => now()->subDay()->toDateString()]);
        Task::factory()->create(['project_id' => $project->id, 'title' => 'Write copy', 'status' => 'todo', 'due_date' => now()->subDays(2)->toDateString()]);
        Task::factory()->create(['project_id' => $project->id, 'title' => 'Done work', 'status' => 'completed', 'completed_at' => now(), 'due_date' => now()->subDay()->toDateString()]);
        Task::factory()->create(['project_id' => $otherProject->id, 'title' => 'Future work', 'status' => 'todo', 'due_date' => now()->addWeek()->toDateString()]);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.counts.blocked_tasks', 1)
            ->assertJsonPath('data.counts.overdue_tasks', 2);

        $overdue = $response->json('data.attention.tasks_overdue');
        $this->assertSame(2, $overdue['total']);
        $this->assertSame('Fix auth flow', $overdue['items'][0]['title']);
        $this->assertSame('Launch Website', $overdue['items'][0]['project_name']);
        $this->assertSame(1, $overdue['items'][0]['days_overdue']);

        // a completed task past its due date is never an overdue task
        $this->assertNotContains('Done work', array_column($overdue['items'], 'title'));
    }

    public function test_upcoming_milestone_is_the_closest_future_target_only(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $project = Project::factory()->create(['customer_id' => $customer->id, 'name' => 'Beta Project']);
        Milestone::factory()->create(['project_id' => $project->id, 'title' => 'In two weeks', 'target_date' => now()->addDays(14)->toDateString()]);
        Milestone::factory()->create(['project_id' => $project->id, 'title' => 'Next week', 'target_date' => now()->addWeek()->toDateString()]);
        Milestone::factory()->create(['project_id' => $project->id, 'title' => 'Already past', 'target_date' => now()->subWeek()->toDateString()]);
        Milestone::factory()->create(['project_id' => $project->id, 'title' => 'Done one', 'target_date' => now()->addDays(3)->toDateString(), 'status' => 'completed', 'completed_at' => now()]);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $upcoming = $response->json('data.attention.upcoming_milestone');
        $this->assertSame('Next week', $upcoming['title']);
        $this->assertSame('Beta Project', $upcoming['project_name']);
    }

    public function test_delivery_signals_are_hidden_without_project_access(): void
    {
        $role = Role::factory()->create([
            'slug' => 'customers_only_v2',
            'permissions' => ['view_customers'],
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        Project::factory()->create();
        Task::factory()->create(['title' => 'Hidden Task', 'status' => 'blocked']);

        $this->getJson('/api/v1/admin/dashboard/stats')
            ->assertStatus(200)
            ->assertJsonMissingPath('data.counts.blocked_tasks')
            ->assertJsonMissingPath('data.counts.overdue_tasks')
            ->assertJsonMissingPath('data.attention.tasks_overdue')
            ->assertJsonMissingPath('data.attention.upcoming_milestone');
    }
}
