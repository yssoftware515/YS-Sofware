<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use App\Domains\Services\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectTest extends TestCase
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

    // ── Authorization (3 levels) ─────────────────────────────────────

    public function test_unauthenticated_user_cannot_access_projects(): void
    {
        $this->getJson('/api/v1/admin/projects')->assertStatus(401);
    }

    public function test_admin_without_projects_permission_is_denied(): void
    {
        $this->actingAsScoped(['manage_products']);

        $this->getJson('/api/v1/admin/projects')->assertStatus(403);
        $this->postJson('/api/v1/admin/projects', ['name' => 'X'])->assertStatus(403);
    }

    public function test_view_only_admin_can_read_but_not_write(): void
    {
        $this->actingAsScoped(['view_projects']);
        Project::factory()->count(2)->create();

        $this->getJson('/api/v1/admin/projects')->assertStatus(200);
        $project = Project::first();
        $this->getJson('/api/v1/admin/projects/'.$project->id)->assertStatus(200);

        $this->postJson('/api/v1/admin/projects', ['name' => 'X'])->assertStatus(403);
        $this->patchJson("/api/v1/admin/projects/{$project->id}/status", ['status' => 'completed'])->assertStatus(403);
    }

    // ── Create with services ─────────────────────────────────────────

    public function test_super_admin_can_create_project_with_customer_and_services(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $services = Service::factory()->count(3)->create();

        $response = $this->postJson('/api/v1/admin/projects', [
            'name' => 'Acme Mobile Platform',
            'customer_id' => $customer->id,
            'project_type' => 'mobile_app',
            'description' => 'A full mobile platform for Acme.',
            'status' => 'active',
            'start_date' => '2026-08-01',
            'expected_completion_date' => '2026-12-01',
            'quoted_value' => '48500.00',
            'currency' => 'USD',
            'internal_notes' => 'Client is very responsive.',
            'service_ids' => $services->pluck('id')->all(),
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            // decimal money travels as a string, never a float.
            ->assertJsonPath('data.quoted_value', '48500.00')
            ->assertJsonPath('data.currency', 'USD')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.customer.id', $customer->id);

        $project = Project::first();
        $this->assertCount(3, $project->services);
        $this->assertDatabaseHas('project_service', ['project_id' => $project->id, 'service_id' => $services[0]->id]);
    }

    public function test_project_validation_rejects_bad_values(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/projects', [
            'name' => '',
            'project_type' => 'spaceship',
            'status' => 'warp',
            'quoted_value' => -5,
            'currency' => 'USDDD',
            'service_ids' => ['not-a-uuid'],
        ])->assertStatus(422);

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'Bad dates',
            'start_date' => '2026-12-01',
            'expected_completion_date' => '2026-01-01',
        ])->assertStatus(422);
    }

    // ── Status lifecycle ─────────────────────────────────────────────

    public function test_status_transitions_are_controlled_and_audited(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create(['status' => 'draft']);

        // draft → active
        $this->patchJson("/api/v1/admin/projects/{$project->id}/status", ['status' => 'active'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'active');

        // active → completed sets completed_at
        $this->patchJson("/api/v1/admin/projects/{$project->id}/status", ['status' => 'completed'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'completed');
        $this->assertNotNull($project->fresh()->completed_at);

        // completed → on_hold clears completed_at (reality check)
        $this->patchJson("/api/v1/admin/projects/{$project->id}/status", ['status' => 'on_hold'])
            ->assertStatus(200);
        $this->assertNull($project->fresh()->completed_at);

        // unknown status rejected
        $this->patchJson("/api/v1/admin/projects/{$project->id}/status", ['status' => 'archived'])
            ->assertStatus(422);

        $this->assertDatabaseHas('audit_logs', ['action' => 'project.status_updated', 'resource_id' => $project->id]);
    }

    // ── Update: services sync + customer change ──────────────────────

    public function test_update_cannot_move_project_to_another_customers_request(): void
    {
        $this->actingAsSuperAdmin();
        $customerA = Customer::factory()->create();
        $customerB = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customerA->id]);
        $project = Project::factory()->create([
            'customer_id' => $customerA->id,
            'contact_request_id' => $request->id,
        ]);

        // Re-pointing the project at a DIFFERENT customer while the
        // request still belongs to the original one must be rejected —
        // otherwise the pair silently becomes a cross-customer link.
        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => 'Renamed',
            'customer_id' => $customerB->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'The project and its originating request must belong to the same customer. Link the request to the customer first.');
        $this->assertSame($customerA->id, $project->fresh()->customer_id);
        $this->assertSame($request->id, $project->fresh()->contact_request_id);

        // Moving the project WITH a request that belongs to the new
        // customer stays legal.
        $requestB = ContactRequest::factory()->create(['customer_id' => $customerB->id]);
        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => 'Renamed',
            'customer_id' => $customerB->id,
            'contact_request_id' => $requestB->id,
        ])->assertStatus(200)
            ->assertJsonPath('data.customer.id', $customerB->id)
            ->assertJsonPath('data.contact_request.id', $requestB->id);
    }

    public function test_update_keeps_existing_request_link_when_customer_unchanged(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customer->id]);
        $project = Project::factory()->create([
            'customer_id' => $customer->id,
            'contact_request_id' => $request->id,
        ]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", ['name' => 'Renamed'])
            ->assertStatus(200)
            ->assertJsonPath('data.contact_request.id', $request->id);
    }

    public function test_update_replaces_services_and_fields(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        $serviceA = Service::factory()->create();
        $serviceB = Service::factory()->create();
        $project->services()->sync([$serviceA->id]);

        $customer2 = Customer::factory()->create();

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => 'Renamed Project',
            'customer_id' => $customer2->id,
            'service_ids' => [$serviceB->id],
        ])->assertStatus(200)
            ->assertJsonPath('data.name', 'Renamed Project')
            ->assertJsonPath('data.customer.id', $customer2->id);

        $project->refresh();
        $this->assertFalse($project->services->contains('id', $serviceA->id));
        $this->assertTrue($project->services->contains('id', $serviceB->id));
    }

    // ── Filters & pagination ─────────────────────────────────────────

    public function test_projects_index_supports_filters_and_pagination(): void
    {
        $this->actingAsSuperAdmin();
        Project::factory()->count(22)->create();
        $customer = Customer::factory()->create();
        Project::factory()->create([
            'name' => 'Zeta Launch',
            'customer_id' => $customer->id,
            'status' => 'completed',
            'project_type' => 'ai_automation',
        ]);

        $this->getJson('/api/v1/admin/projects?search=zeta')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/admin/projects?status=completed')
            ->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Zeta Launch');

        $this->getJson("/api/v1/admin/projects?customer_id={$customer->id}")
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1);

        $this->getJson('/api/v1/admin/projects?per_page=10')
            ->assertStatus(200)
            ->assertJsonCount(10, 'data');
    }

    // ── Destroy ──────────────────────────────────────────────────────

    public function test_project_delete_removes_pivot_rows(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        $services = Service::factory()->count(2)->create();
        $project->services()->sync($services->pluck('id'));

        $this->deleteJson("/api/v1/admin/projects/{$project->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('project_service', ['project_id' => $project->id]);
    }

    // ── No public exposure ───────────────────────────────────────────

    public function test_projects_are_never_exposed_through_public_api(): void
    {
        $this->actingAsSuperAdmin();
        Project::factory()->create(['name' => 'Top Secret Delivery']);

        $response = $this->getJson('/api/v1/public/services');
        $response->assertStatus(200)->assertJsonMissing(['name' => 'Top Secret Delivery']);

        $this->getJson('/api/v1/health')->assertJsonMissing(['Top Secret Delivery']);
    }
}
