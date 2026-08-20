<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class MilestoneTest extends TestCase
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

    // ── Create / update / delete ─────────────────────────────────────

    public function test_admin_can_create_a_milestone_inside_a_project(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();

        $this->postJson('/api/v1/admin/milestones', [
            'project_id' => $project->id,
            'title' => 'Beta ready',
            'target_date' => now()->addMonth()->toDateString(),
        ])->assertStatus(201)
            ->assertJsonPath('data.title', 'Beta ready')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.sort_order', 1);

        $this->assertDatabaseHas('milestones', ['project_id' => $project->id, 'title' => 'Beta ready']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'milestone.created', 'resource_type' => 'Milestone']);
    }

    public function test_new_milestones_appear_after_existing_ones(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        Milestone::factory()->create(['project_id' => $project->id, 'sort_order' => 3]);

        $this->postJson('/api/v1/admin/milestones', [
            'project_id' => $project->id,
            'title' => 'Second',
        ])->assertStatus(201)
            ->assertJsonPath('data.sort_order', 4);
    }

    public function test_milestone_requires_an_existing_project(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/milestones', [
            'project_id' => '00000000-0000-0000-0000-000000000000',
            'title' => 'Orphan milestone',
        ])->assertStatus(422);

        $this->assertDatabaseCount('milestones', 0);
    }

    public function test_admin_can_update_and_delete_a_milestone(): void
    {
        $this->actingAsSuperAdmin();
        $milestone = Milestone::factory()->create(['title' => 'Old stage']);

        $this->putJson("/api/v1/admin/milestones/{$milestone->id}", [
            'project_id' => $milestone->project_id,
            'title' => 'New stage',
            'target_date' => now()->addDays(10)->toDateString(),
        ])->assertStatus(200)
            ->assertJsonPath('data.title', 'New stage');
        $this->assertDatabaseHas('audit_logs', ['action' => 'milestone.updated', 'resource_id' => $milestone->id]);

        $this->deleteJson("/api/v1/admin/milestones/{$milestone->id}")
            ->assertStatus(200);
        $this->assertDatabaseMissing('milestones', ['id' => $milestone->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'milestone.deleted', 'resource_id' => $milestone->id]);
    }

    // ── Authorization ────────────────────────────────────────────────

    public function test_milestone_goes_nowhere_without_the_project_gate(): void
    {
        $project = Project::factory()->create();
        $milestone = Milestone::factory()->create(['project_id' => $project->id]);

        $this->getJson('/api/v1/admin/milestones')->assertStatus(401);

        $this->actingAsScoped(['manage_products']);
        $this->getJson('/api/v1/admin/milestones')->assertStatus(403);
        $this->postJson('/api/v1/admin/milestones', [
            'project_id' => $project->id,
            'title' => 'Nope',
        ])->assertStatus(403);

        $this->actingAsScoped(['view_projects']);
        $this->getJson('/api/v1/admin/milestones?project_id='.$project->id)->assertStatus(200);
        $this->patchJson("/api/v1/admin/milestones/{$milestone->id}/status", ['status' => 'completed'])->assertStatus(403);

        $this->actingAsScoped(['manage_projects']);
        $this->postJson('/api/v1/admin/milestones', [
            'project_id' => $project->id,
            'title' => 'Allowed',
        ])->assertStatus(201);
    }

    public function test_index_lists_only_the_requested_projects_milestones(): void
    {
        $this->actingAsSuperAdmin();
        $projectA = Project::factory()->create();
        $projectB = Project::factory()->create();
        Milestone::factory()->create(['project_id' => $projectA->id, 'title' => 'A Stage']);
        Milestone::factory()->create(['project_id' => $projectB->id, 'title' => 'B Stage']);

        $this->getJson('/api/v1/admin/milestones?project_id='.$projectA->id)
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'A Stage');
    }

    // ── Status lifecycle & completed_at integrity ───────────────────

    public function test_completing_a_milestone_stamps_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $milestone = Milestone::factory()->create(['status' => 'in_progress']);
        $this->assertNull($milestone->completed_at);

        $this->patchJson("/api/v1/admin/milestones/{$milestone->id}/status", ['status' => 'completed'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'completed');

        $this->assertNotNull($milestone->fresh()->completed_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'milestone.status_updated', 'resource_id' => $milestone->id]);
    }

    public function test_leaving_completed_clears_completed_at_from_any_entry_point(): void
    {
        $this->actingAsSuperAdmin();
        $milestone = Milestone::factory()->create(['status' => 'completed', 'completed_at' => now()]);

        // status endpoint
        $this->patchJson("/api/v1/admin/milestones/{$milestone->id}/status", ['status' => 'cancelled'])
            ->assertStatus(200);
        $this->assertNull($milestone->fresh()->completed_at);

        // edit form
        $milestone->update(['status' => 'completed', 'completed_at' => now()]);
        $this->putJson("/api/v1/admin/milestones/{$milestone->id}", [
            'project_id' => $milestone->project_id,
            'title' => $milestone->title,
            'status' => 'pending',
        ])->assertStatus(200);
        $this->assertNull($milestone->fresh()->completed_at);
    }

    public function test_milestone_is_overdue_while_open_and_past_target(): void
    {
        $this->actingAsSuperAdmin();
        $overdue = Milestone::factory()->create(['target_date' => now()->subDays(2)->toDateString(), 'status' => 'pending']);
        $done = Milestone::factory()->create(['target_date' => now()->subDays(2)->toDateString(), 'status' => 'completed', 'completed_at' => now()]);

        $this->getJson("/api/v1/admin/milestones/{$overdue->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.is_overdue', true);

        $this->getJson("/api/v1/admin/milestones/{$done->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.is_overdue', false);
    }

    // ── Reorder ─────────────────────────────────────────────────────

    public function test_milestone_move_swaps_position_within_the_project(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        $first = Milestone::factory()->create(['project_id' => $project->id, 'title' => 'One', 'sort_order' => 1]);
        $second = Milestone::factory()->create(['project_id' => $project->id, 'title' => 'Two', 'sort_order' => 2]);

        $this->postJson("/api/v1/admin/milestones/{$second->id}/move", ['direction' => 'up'])
            ->assertStatus(200);

        $this->assertLessThan($first->fresh()->sort_order, $second->fresh()->sort_order);

        // the returned list is ordered by the new ranks
        $response = $this->getJson('/api/v1/admin/milestones?project_id='.$project->id);
        $this->assertSame(['Two', 'One'], array_column($response->json('data'), 'title'));

        $this->assertDatabaseHas('audit_logs', ['action' => 'milestone.moved', 'resource_id' => $second->id]);
    }

    public function test_milestone_move_refuses_unknown_direction(): void
    {
        $this->actingAsSuperAdmin();
        $milestone = Milestone::factory()->create();

        $this->postJson("/api/v1/admin/milestones/{$milestone->id}/move", ['direction' => 'sideways'])
            ->assertStatus(422);
    }

    // Phase 4A (P2-05): the whole re-stamp is atomic — a mid-operation
    // failure must roll back EVERY rank, leaving no partial ordering.

    public function test_milestone_reorder_rolls_back_when_a_mid_operation_update_fails(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        $one = Milestone::factory()->create(['project_id' => $project->id, 'sort_order' => 1]);
        $two = Milestone::factory()->create(['project_id' => $project->id, 'sort_order' => 2]);
        $three = Milestone::factory()->create(['project_id' => $project->id, 'sort_order' => 3]);

        $failNextUpdate = true;
        DB::listen(function ($query) use (&$failNextUpdate) {
            if ($failNextUpdate && str_contains($query->sql, 'update')) {
                $failNextUpdate = false;
                throw new RuntimeException('forced mid-operation failure');
            }
        });

        $this->postJson("/api/v1/admin/milestones/{$one->id}/move", ['direction' => 'down'])
            ->assertStatus(500);

        // No partial re-stamp survived the rollback.
        $this->assertDatabaseHas('milestones', ['id' => $one->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('milestones', ['id' => $two->id, 'sort_order' => 2]);
        $this->assertDatabaseHas('milestones', ['id' => $three->id, 'sort_order' => 3]);
    }

    public function test_milestone_reorder_rolls_back_the_audit_surrounding_mutation(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        $one = Milestone::factory()->create(['project_id' => $project->id, 'sort_order' => 1]);
        $two = Milestone::factory()->create(['project_id' => $project->id, 'sort_order' => 2]);

        $failFirstUpdate = true;
        DB::listen(function ($query) use (&$failFirstUpdate) {
            if ($failFirstUpdate && str_contains($query->sql, 'update')) {
                $failFirstUpdate = false;
                throw new RuntimeException('forced failure');
            }
        });

        $this->postJson("/api/v1/admin/milestones/{$one->id}/move", ['direction' => 'down'])
            ->assertStatus(500);

        // The failed mutation produced no audit trail.
        $this->assertDatabaseCount('audit_logs', 0);
    }

    // ── No public exposure ───────────────────────────────────────────

    public function test_milestones_are_never_exposed_through_public_api(): void
    {
        $this->actingAsSuperAdmin();
        Milestone::factory()->create(['title' => 'Secret Internal Stage']);

        $this->getJson('/api/v1/health')->assertJsonMissing(['Secret Internal Stage']);
        $this->getJson('/api/v1/public/services')->assertJsonMissing(['Secret Internal Stage']);
    }
}
