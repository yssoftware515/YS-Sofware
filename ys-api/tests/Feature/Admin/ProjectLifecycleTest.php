<?php

namespace Tests\Feature\Admin;

use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectLifecycleTest extends TestCase
{
    use RefreshDatabase;

    // ── completed_at reconciliation (one source of truth) ─────────────

    public function test_creating_a_project_as_completed_sets_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'Done Deal',
            'customer_id' => $customer->id,
            'status' => 'completed',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'completed');

        $this->assertNotNull(Project::where('name', 'Done Deal')->firstOrFail()->completed_at);
    }

    public function test_updating_a_project_to_completed_sets_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create(['status' => 'active']);
        $this->assertNull($project->completed_at);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => $project->name,
            'customer_id' => $project->customer_id,
            'status' => 'completed',
        ])->assertStatus(200);

        $this->assertNotNull($project->fresh()->completed_at);
    }

    public function test_leaving_completed_via_update_clears_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create(['status' => 'completed', 'completed_at' => now()]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => $project->name,
            'customer_id' => $project->customer_id,
            'status' => 'active',
        ])->assertStatus(200);

        $this->assertNull($project->fresh()->completed_at);
    }

    public function test_updating_without_a_status_does_not_touch_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create(['status' => 'completed', 'completed_at' => now()]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => $project->name,
            'customer_id' => $project->customer_id,
        ])->assertStatus(200);

        $this->assertNotNull($project->fresh()->completed_at);
    }

    // ── Originating request integrity ─────────────────────────────────

    public function test_project_can_be_created_with_a_contact_request_reference(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $request = ContactRequest::factory()->create(['customer_id' => $customer->id]);

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'From Inquiry',
            'customer_id' => $customer->id,
            'contact_request_id' => $request->id,
        ])->assertStatus(201)
            ->assertJsonPath('data.contact_request_id', $request->id);

        $this->assertDatabaseHas('projects', ['name' => 'From Inquiry', 'contact_request_id' => $request->id]);
    }

    public function test_project_rejects_a_contact_request_from_a_different_customer(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $foreignRequest = ContactRequest::factory()->create(['customer_id' => Customer::factory()->create()->id]);

        $this->postJson('/api/v1/admin/projects', [
            'name' => 'Broken Link',
            'customer_id' => $customer->id,
            'contact_request_id' => $foreignRequest->id,
        ])->assertStatus(422);

        $this->assertDatabaseMissing('projects', ['name' => 'Broken Link']);
    }

    public function test_update_rejects_a_contact_request_from_a_different_customer(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        $foreignRequest = ContactRequest::factory()->create(['customer_id' => Customer::factory()->create()->id]);

        $this->putJson("/api/v1/admin/projects/{$project->id}", [
            'name' => $project->name,
            'customer_id' => $project->customer_id,
            'contact_request_id' => $foreignRequest->id,
        ])->assertStatus(422);

        $this->assertNull($project->fresh()->contact_request_id);
    }
}
