<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use App\Domains\Product\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * VULN-02: the B2B layer (customers, projects, tasks, milestones,
 * contact requests, dashboard) must be product-scoped through the
 * customer anchor. A scoped admin may only read/write rows belonging
 * to granted products — global rows (null product_id / no customer)
 * stay visible to everyone, mirroring the content modules' convention.
 */
class B2BProductScopingTest extends TestCase
{
    use RefreshDatabase;

    private Product $productA;

    private Product $productB;

    private User $scopedAdmin;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->productA = Product::factory()->active()->create();
        $this->productB = Product::factory()->active()->create();

        $role = Role::factory()->create([
            'slug' => 'b2b_scoped_'.uniqid(),
            'permissions' => [
                'view_customers',
                'manage_customers',
                'view_projects',
                'manage_projects',
                'manage_contact_requests',
                'view_financials',
            ],
        ]);
        $this->scopedAdmin = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        $this->scopedAdmin->products()->attach($this->productA->id);

        $this->superAdmin = User::factory()->create([
            'role_id' => Role::factory()->create(['slug' => 'root_'.uniqid(), 'permissions' => ['*']])->id,
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->scopedAdmin, ['admin']);
    }

    private function tenantCustomer(Product $product): Customer
    {
        return Customer::factory()->create(['product_id' => $product->id]);
    }

    private function globalCustomer(): Customer
    {
        return Customer::factory()->create(['product_id' => null]);
    }

    // ── Customers ────────────────────────────────────────────────────

    public function test_customer_index_hides_other_products_customers_but_keeps_global_and_own(): void
    {
        $this->tenantCustomer($this->productA);
        $this->tenantCustomer($this->productB);
        $this->globalCustomer();

        $response = $this->getJson('/api/v1/admin/customers');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'), 'Scoped admin must see own + global customers only.');
    }

    public function test_customer_store_rejects_other_products_product_id(): void
    {
        $response = $this->postJson('/api/v1/admin/customers', [
            'name' => 'Cross-tenant customer',
            'email' => 'cross@example.com',
            'product_id' => $this->productB->id,
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('customers', ['email' => 'cross@example.com']);
    }

    public function test_customer_store_with_own_product_or_global_succeeds(): void
    {
        $this->postJson('/api/v1/admin/customers', [
            'name' => 'Own tenant',
            'email' => 'own@example.com',
            'product_id' => $this->productA->id,
        ])->assertCreated();

        $this->postJson('/api/v1/admin/customers', [
            'name' => 'Global',
            'email' => 'global@example.com',
        ])->assertCreated();
    }

    public function test_customer_mutations_on_other_products_customer_are_forbidden(): void
    {
        $customer = $this->tenantCustomer($this->productB);

        $this->getJson("/api/v1/admin/customers/{$customer->id}")->assertStatus(403);
        $this->putJson("/api/v1/admin/customers/{$customer->id}", ['name' => 'Hacked'])->assertStatus(403);
        $this->patchJson("/api/v1/admin/customers/{$customer->id}/status", ['status' => 'archived'])->assertStatus(403);
        $this->deleteJson("/api/v1/admin/customers/{$customer->id}")->assertStatus(403);
        $this->assertDatabaseHas('customers', ['id' => $customer->id]);
    }

    public function test_customer_mutations_on_own_products_customer_succeed(): void
    {
        $customer = $this->tenantCustomer($this->productA);

        $this->getJson("/api/v1/admin/customers/{$customer->id}")->assertOk();
        $this->putJson("/api/v1/admin/customers/{$customer->id}", ['name' => 'Renamed'])->assertOk();
        $this->patchJson("/api/v1/admin/customers/{$customer->id}/status", ['status' => 'archived'])->assertOk();
        $this->deleteJson("/api/v1/admin/customers/{$customer->id}")->assertOk();
    }

    public function test_customer_update_cannot_move_to_other_product(): void
    {
        $customer = $this->tenantCustomer($this->productA);

        $this->putJson("/api/v1/admin/customers/{$customer->id}", [
            'product_id' => $this->productB->id,
        ])->assertStatus(403);
    }

    // ── Projects ─────────────────────────────────────────────────────

    public function test_project_index_hides_other_products_projects_but_keeps_global_and_own(): void
    {
        Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id]);
        Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id]);
        Project::factory()->create(['customer_id' => $this->globalCustomer()->id]);
        Project::factory()->create(['customer_id' => null]);

        $response = $this->getJson('/api/v1/admin/projects');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'), 'Scoped admin must see own, global-customer and customer-less projects only.');
    }

    public function test_project_store_rejects_other_products_customer(): void
    {
        $response = $this->postJson('/api/v1/admin/projects', [
            'name' => 'Cross-tenant project',
            'customer_id' => $this->tenantCustomer($this->productB)->id,
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('projects', ['name' => 'Cross-tenant project']);
    }

    public function test_project_store_with_own_or_global_customer_succeeds(): void
    {
        $this->postJson('/api/v1/admin/projects', [
            'name' => 'Own project',
            'customer_id' => $this->tenantCustomer($this->productA)->id,
        ])->assertCreated();

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'Global project',
            'customer_id' => $this->globalCustomer()->id,
        ])->assertCreated();
    }

    public function test_project_mutations_on_other_products_project_are_forbidden_but_own_succeed(): void
    {
        $other = Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id]);
        $own = Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id]);

        $this->getJson("/api/v1/admin/projects/{$other->id}")->assertStatus(403);
        $this->putJson("/api/v1/admin/projects/{$other->id}", ['name' => 'Hacked'])->assertStatus(403);
        $this->patchJson("/api/v1/admin/projects/{$other->id}/status", ['status' => 'completed'])->assertStatus(403);
        $this->deleteJson("/api/v1/admin/projects/{$other->id}")->assertStatus(403);
        $this->assertDatabaseHas('projects', ['id' => $other->id]);

        $this->getJson("/api/v1/admin/projects/{$own->id}")->assertOk();
        $this->putJson("/api/v1/admin/projects/{$own->id}", ['name' => 'Renamed'])->assertOk();
        $this->patchJson("/api/v1/admin/projects/{$own->id}/status", ['status' => 'completed'])->assertOk();
        $this->deleteJson("/api/v1/admin/projects/{$own->id}")->assertOk();
    }

    public function test_project_update_cannot_move_to_other_products_customer(): void
    {
        $project = Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => 'Renamed',
            'customer_id' => $this->tenantCustomer($this->productB)->id,
        ])->assertStatus(403);
    }

    // ── Tasks ────────────────────────────────────────────────────────

    public function test_task_index_hides_other_products_tasks(): void
    {
        Task::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id])->id]);
        Task::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id])->id]);

        $response = $this->getJson('/api/v1/admin/tasks');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_task_store_rejects_other_products_project(): void
    {
        $projectB = Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id]);

        $this->postJson('/api/v1/admin/tasks', [
            'project_id' => $projectB->id,
            'title' => 'Cross-tenant task',
        ])->assertStatus(403);
    }

    public function test_task_mutations_on_other_products_task_are_forbidden_but_own_succeed(): void
    {
        $other = Task::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id])->id]);
        $own = Task::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id])->id]);

        $this->getJson("/api/v1/admin/tasks/{$other->id}")->assertStatus(403);
        $this->putJson("/api/v1/admin/tasks/{$other->id}", ['title' => 'Hacked', 'project_id' => $other->project_id])->assertStatus(403);
        $this->patchJson("/api/v1/admin/tasks/{$other->id}/status", ['status' => 'completed'])->assertStatus(403);
        $this->deleteJson("/api/v1/admin/tasks/{$other->id}")->assertStatus(403);
        $this->assertDatabaseHas('tasks', ['id' => $other->id]);

        $this->getJson("/api/v1/admin/tasks/{$own->id}")->assertOk();
        $this->putJson("/api/v1/admin/tasks/{$own->id}", ['title' => 'Renamed', 'project_id' => $own->project_id])->assertOk();
        $this->patchJson("/api/v1/admin/tasks/{$own->id}/status", ['status' => 'completed'])->assertOk();
        $this->deleteJson("/api/v1/admin/tasks/{$own->id}")->assertOk();
    }

    public function test_task_update_cannot_move_to_other_products_project(): void
    {
        $own = Task::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id])->id]);
        $projectB = Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id]);

        $this->putJson("/api/v1/admin/tasks/{$own->id}", [
            'title' => 'Moved',
            'project_id' => $projectB->id,
        ])->assertStatus(403);
    }

    // ── Milestones ───────────────────────────────────────────────────

    public function test_milestone_index_hides_other_products_milestones(): void
    {
        Milestone::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id])->id]);
        Milestone::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id])->id]);

        $response = $this->getJson('/api/v1/admin/milestones');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_milestone_store_and_move_reject_other_products_project(): void
    {
        $projectB = Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id]);
        $ownProject = Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id]);

        $this->postJson('/api/v1/admin/milestones', [
            'project_id' => $projectB->id,
            'title' => 'Cross-tenant milestone',
        ])->assertStatus(403);

        $other = Milestone::factory()->create(['project_id' => $projectB->id]);
        $this->postJson("/api/v1/admin/milestones/{$other->id}/move", ['direction' => 'up'])->assertStatus(403);

        $this->postJson('/api/v1/admin/milestones', [
            'project_id' => $ownProject->id,
            'title' => 'Own milestone',
        ])->assertCreated();
    }

    public function test_milestone_mutations_on_other_products_milestone_are_forbidden_but_own_succeed(): void
    {
        $other = Milestone::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id])->id]);
        $own = Milestone::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id])->id]);

        $this->getJson("/api/v1/admin/milestones/{$other->id}")->assertStatus(403);
        $this->putJson("/api/v1/admin/milestones/{$other->id}", ['title' => 'Hacked', 'project_id' => $other->project_id])->assertStatus(403);
        $this->patchJson("/api/v1/admin/milestones/{$other->id}/status", ['status' => 'completed'])->assertStatus(403);
        $this->deleteJson("/api/v1/admin/milestones/{$other->id}")->assertStatus(403);
        $this->assertDatabaseHas('milestones', ['id' => $other->id]);

        $this->getJson("/api/v1/admin/milestones/{$own->id}")->assertOk();
        $this->putJson("/api/v1/admin/milestones/{$own->id}", ['title' => 'Renamed', 'project_id' => $own->project_id])->assertOk();
        $this->patchJson("/api/v1/admin/milestones/{$own->id}/status", ['status' => 'completed'])->assertOk();
        $this->deleteJson("/api/v1/admin/milestones/{$own->id}")->assertOk();
    }

    // ── Contact requests ─────────────────────────────────────────────

    public function test_contact_request_index_hides_requests_linked_to_other_products_customers(): void
    {
        ContactRequest::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id]);
        ContactRequest::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id]);
        ContactRequest::factory()->create(['customer_id' => null]);

        $response = $this->getJson('/api/v1/admin/contact-requests');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'), 'Unlinked (global) requests stay visible.');
    }

    public function test_contact_request_show_and_status_on_other_products_request_are_forbidden(): void
    {
        $other = ContactRequest::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id]);
        $own = ContactRequest::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id]);

        $this->getJson("/api/v1/admin/contact-requests/{$other->id}")->assertStatus(403);
        $this->patchJson("/api/v1/admin/contact-requests/{$other->id}/status", ['status' => 'contacted'])->assertStatus(403);

        $this->getJson("/api/v1/admin/contact-requests/{$own->id}")->assertOk();
        $this->patchJson("/api/v1/admin/contact-requests/{$own->id}/status", ['status' => 'contacted'])->assertOk();
    }

    public function test_contact_request_link_actions_to_other_products_targets_are_forbidden(): void
    {
        $request = ContactRequest::factory()->create(['customer_id' => null]);
        $customerB = $this->tenantCustomer($this->productB);
        $projectB = Project::factory()->create(['customer_id' => $this->tenantCustomer($this->productB)->id]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-customer", [
            'customer_id' => $customerB->id,
        ])->assertStatus(403);

        $linked = ContactRequest::factory()->create(['customer_id' => $this->tenantCustomer($this->productA)->id]);
        $this->postJson("/api/v1/admin/contact-requests/{$linked->id}/link-project", [
            'project_id' => $projectB->id,
        ])->assertStatus(403);
    }

    // ── Dashboard ────────────────────────────────────────────────────

    public function test_dashboard_b2b_counts_are_limited_to_granted_products(): void
    {
        $customerA = $this->tenantCustomer($this->productA);
        $customerB = $this->tenantCustomer($this->productB);
        $this->globalCustomer();

        $projectA = Project::factory()->create(['customer_id' => $customerA->id, 'status' => 'active', 'quoted_value' => 1000]);
        Project::factory()->create(['customer_id' => $customerB->id, 'status' => 'active', 'quoted_value' => 999000]);
        Task::factory()->create(['project_id' => $projectA->id, 'status' => 'blocked']);
        Task::factory()->create(['project_id' => Project::factory()->create(['customer_id' => $customerB->id])->id, 'status' => 'blocked']);
        ContactRequest::factory()->create(['customer_id' => $customerA->id, 'status' => 'new']);
        ContactRequest::factory()->create(['customer_id' => $customerB->id, 'status' => 'new']);

        $response = $this->getJson('/api/v1/admin/dashboard/stats');

        $response->assertOk()
            ->assertJsonPath('data.counts.customers', 2)
            ->assertJsonPath('data.counts.active_customers', 2)
            ->assertJsonPath('data.counts.projects', 1)
            ->assertJsonPath('data.counts.blocked_tasks', 1)
            ->assertJsonPath('data.counts.contact_requests', 1)
            ->assertJsonPath('data.counts.new_contact_requests', 1)
            ->assertJsonPath('data.counts.recorded_project_value_by_currency.USD', '1000.00');
    }

    public function test_super_admin_sees_all_tenants(): void
    {
        Sanctum::actingAs($this->superAdmin, ['admin']);

        $this->tenantCustomer($this->productA);
        $this->tenantCustomer($this->productB);
        $this->globalCustomer();

        $response = $this->getJson('/api/v1/admin/customers');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }
}
