<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Content\Models\Update;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Every paginated admin (and public) endpoint must cap the client-supplied
 * per_page — an arbitrary value would let a single request materialize a
 * full table. The cap is 100, far above the 10–50 the UI ever uses.
 */
class PaginationLimitTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsScoped(array $permissions = ['view_projects']): User
    {
        $role = Role::factory()->create([
            'slug' => 'pagination_'.uniqid(),
            'permissions' => $permissions,
        ]);
        $user = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        Sanctum::actingAs($user, ['admin']);

        return $user;
    }

    public function test_admin_project_list_caps_oversized_per_page(): void
    {
        $this->actingAsScoped(['view_projects']);
        Project::factory()->count(3)->create();

        $this->getJson('/api/v1/admin/projects?per_page=10000')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_admin_customer_list_caps_oversized_per_page(): void
    {
        $this->actingAsScoped(['view_customers', 'view_projects']);
        Customer::factory()->count(2)->create();

        $this->getJson('/api/v1/admin/customers?per_page=99999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_admin_task_list_caps_oversized_per_page(): void
    {
        $this->actingAsScoped(['view_projects']);
        $project = Project::factory()->create();
        Task::factory()->count(2)->create(['project_id' => $project->id]);

        $this->getJson('/api/v1/admin/tasks?per_page=5000')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_admin_contact_request_list_caps_oversized_per_page(): void
    {
        $this->actingAsScoped(['view_projects', 'manage_contact_requests', 'manage_customers']);
        ContactRequest::factory()->count(2)->create();

        $this->getJson('/api/v1/admin/contact-requests?per_page=5000')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_public_updates_list_caps_oversized_per_page(): void
    {
        Update::factory()->count(150)->published()->create();

        $this->getJson('/api/v1/public/updates?per_page=99999')
            ->assertOk()
            ->assertJsonCount(100, 'data')
            ->assertJsonPath('meta.current_page', 1);

        $this->getJson('/api/v1/public/updates?per_page=99999&page=2')
            ->assertOk()
            ->assertJsonCount(50, 'data');
    }

    public function test_normal_per_page_value_is_preserved(): void
    {
        $this->actingAsScoped(['view_projects']);
        Project::factory()->count(3)->create();

        $this->getJson('/api/v1/admin/projects?per_page=20')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 20);
    }
}
