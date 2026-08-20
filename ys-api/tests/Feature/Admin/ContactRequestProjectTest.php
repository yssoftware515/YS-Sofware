<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactRequestProjectTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_admin_can_link_a_project_to_its_originating_request(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customer->id]);
        $project = Project::factory()->create(['customer_id' => $customer->id]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-project", [
            'project_id' => $project->id,
        ])->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.projects.0.id', $project->id);

        $this->assertSame($request->id, $project->fresh()->contact_request_id);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'contact_request.project_linked',
            'resource_id' => $request->id,
        ]);
    }

    public function test_linking_requires_request_and_project_to_share_a_customer(): void
    {
        $this->actingAsSuperAdmin();
        $request = ContactRequest::factory()->create(['customer_id' => Customer::factory()->create()->id]);
        $foreignProject = Project::factory()->create(['customer_id' => Customer::factory()->create()->id]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-project", [
            'project_id' => $foreignProject->id,
        ])->assertStatus(422);

        $this->assertNull($foreignProject->fresh()->contact_request_id);
    }

    public function test_request_must_be_linked_to_a_customer_before_linking_a_project(): void
    {
        $this->actingAsSuperAdmin();
        $request = ContactRequest::factory()->create(['customer_id' => null]);
        $project = Project::factory()->create();

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-project", [
            'project_id' => $project->id,
        ])->assertStatus(422);

        $this->assertNull($project->fresh()->contact_request_id);
    }

    public function test_link_project_requires_request_and_project_permissions(): void
    {
        $this->actingAsScoped(['manage_contact_requests']);
        $request = ContactRequest::factory()->create(['customer_id' => Customer::factory()->create()->id]);
        $project = Project::factory()->create(['customer_id' => $request->customer_id]);

        $this->postJson("/api/v1/admin/contact-requests/{$request->id}/link-project", [
            'project_id' => $project->id,
        ])->assertStatus(403);

        $this->assertNull($project->fresh()->contact_request_id);
    }

    public function test_admin_can_unlink_a_project_from_its_request(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customer->id]);
        $project = Project::factory()->create(['customer_id' => $customer->id, 'contact_request_id' => $request->id]);

        $this->deleteJson("/api/v1/admin/contact-requests/{$request->id}/project/{$project->id}")
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(0, 'data.projects');

        $this->assertNull($project->fresh()->contact_request_id);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'contact_request.project_unlinked',
            'resource_id' => $request->id,
        ]);
    }

    public function test_unlink_refuses_a_project_belonging_to_another_request(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customer->id]);
        $otherRequest = ContactRequest::factory()->create(['customer_id' => $customer->id]);
        $project = Project::factory()->create(['customer_id' => $customer->id, 'contact_request_id' => $otherRequest->id]);

        $this->deleteJson("/api/v1/admin/contact-requests/{$request->id}/project/{$project->id}")
            ->assertStatus(422);

        $this->assertSame($otherRequest->id, $project->fresh()->contact_request_id);
    }

    public function test_project_detail_shows_originating_request(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customer->id, 'name' => 'Originating Inquiry']);
        $project = Project::factory()->create(['customer_id' => $customer->id, 'contact_request_id' => $request->id]);

        $this->getJson("/api/v1/admin/projects/{$project->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.contact_request_id', $request->id)
            ->assertJsonPath('data.contact_request.id', $request->id)
            ->assertJsonPath('data.contact_request.name', 'Originating Inquiry');
    }
}
