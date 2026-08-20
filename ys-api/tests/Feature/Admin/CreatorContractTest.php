<?php

namespace Tests\Feature\Admin;

use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Creator contract regression — ARCH-002.
 *
 * The canonical "who created this record" field is `creator` — an object
 * { id, name } — across every Admin resource (CustomerResource,
 * ProductResource, FaqResource, ...). The frontend used to read
 * `created_by` (a bare name), which never matched: customer detail always
 * rendered "unknown" and project detail silently dropped the creator.
 * These tests pin the canonical shape and forbid `created_by` from
 * regressing back into the responses.
 */
class CreatorContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_show_returns_creator_object_and_no_created_by(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();

        $response = $this->getJson("/api/v1/admin/customers/{$customer->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['creator' => ['id', 'name']]])
            ->assertJsonPath('data.creator.name', $customer->creator->name);

        $this->assertArrayNotHasKey('created_by', $response->json('data'), 'Customer detail must not expose the legacy created_by key.');
    }

    public function test_project_show_returns_creator_object_and_no_created_by(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();

        $response = $this->getJson("/api/v1/admin/projects/{$project->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['creator' => ['id', 'name']]])
            ->assertJsonPath('data.creator.name', $project->creator->name);

        $this->assertArrayNotHasKey('created_by', $response->json('data'), 'Project detail must not expose the legacy created_by key.');
    }

    public function test_project_index_rows_carry_creator_key_and_no_created_by(): void
    {
        $this->actingAsSuperAdmin();
        Project::factory()->count(2)->create();

        $response = $this->getJson('/api/v1/admin/projects');

        $response->assertStatus(200);
        foreach ($response->json('data') as $row) {
            $this->assertArrayHasKey('creator', $row, 'Project list rows must carry the creator key (null when the relation is not loaded).');
            $this->assertArrayNotHasKey('created_by', $row, 'Project list rows must not expose the legacy created_by key.');
        }
    }

    public function test_project_store_response_includes_creator(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();

        $response = $this->postJson('/api/v1/admin/projects', [
            'name' => 'Creator Contract Project',
            'customer_id' => $customer->id,
            'project_type' => 'website',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['creator' => ['id', 'name']]])
            ->assertJsonPath('data.creator.name', auth()->user()->name);
    }
}