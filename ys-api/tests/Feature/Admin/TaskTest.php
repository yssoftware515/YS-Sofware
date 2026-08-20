<?php

namespace Tests\Feature\Admin;

use App\Domains\Auth\Models\Role;
use App\Domains\Auth\Models\User;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskTest extends TestCase
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

    // ── Create / read ────────────────────────────────────────────────

    public function test_admin_can_create_a_task_inside_a_project(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();

        $this->postJson('/api/v1/admin/tasks', [
            'project_id' => $project->id,
            'title' => 'Design the invoice export',
            'description' => 'CSV + PDF variants.',
            'priority' => 'high',
            'due_date' => now()->addDays(3)->toDateString(),
        ])->assertStatus(201)
            ->assertJsonPath('data.title', 'Design the invoice export')
            ->assertJsonPath('data.project_id', $project->id)
            ->assertJsonPath('data.status', 'todo')
            ->assertJsonPath('data.priority', 'high');

        $this->assertDatabaseHas('tasks', ['project_id' => $project->id, 'title' => 'Design the invoice export']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'task.created', 'resource_type' => 'Task']);
    }

    public function test_task_requires_an_existing_project(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/v1/admin/tasks', [
            'project_id' => '00000000-0000-0000-0000-000000000000',
            'title' => 'Orphan task',
        ])->assertStatus(422);

        $this->assertDatabaseCount('tasks', 0);
    }

    public function test_task_status_and_priority_are_closed_enums(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();

        $this->postJson('/api/v1/admin/tasks', [
            'project_id' => $project->id,
            'title' => 'Bad values',
            'status' => 'whatever',
            'priority' => 'critical',
        ])->assertStatus(422);
    }

    public function test_admin_can_update_a_task(): void
    {
        $this->actingAsSuperAdmin();
        $task = Task::factory()->create(['title' => 'Old title']);

        $this->putJson("/api/v1/admin/tasks/{$task->id}", [
            'project_id' => $task->project_id,
            'title' => 'New title',
            'priority' => 'urgent',
        ])->assertStatus(200)
            ->assertJsonPath('data.title', 'New title')
            ->assertJsonPath('data.priority', 'urgent');

        $this->assertDatabaseHas('audit_logs', ['action' => 'task.updated', 'resource_id' => $task->id]);
    }

    public function test_task_update_cannot_move_across_projects(): void
    {
        $this->actingAsSuperAdmin();
        $task = Task::factory()->create();
        $otherProject = Project::factory()->create();

        $this->putJson("/api/v1/admin/tasks/{$task->id}", [
            'project_id' => $otherProject->id,
            'title' => 'Moved',
        ])->assertStatus(200)
            ->assertJsonPath('data.project_id', $otherProject->id);

        $this->assertSame($otherProject->id, $task->fresh()->project_id);
    }

    public function test_admin_can_delete_a_task(): void
    {
        $this->actingAsSuperAdmin();
        $task = Task::factory()->create();

        $this->deleteJson("/api/v1/admin/tasks/{$task->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'task.deleted', 'resource_id' => $task->id]);
    }

    // ── Authorization ────────────────────────────────────────────────

    public function test_task_reads_and_mutations_are_gated(): void
    {
        $project = Project::factory()->create();
        Task::factory()->create(['project_id' => $project->id]);
        $task = Task::first();

        $this->getJson('/api/v1/admin/tasks')->assertStatus(401);

        $this->actingAsScoped(['manage_products']);
        $this->getJson('/api/v1/admin/tasks')->assertStatus(403);
        $this->postJson('/api/v1/admin/tasks', [
            'project_id' => $project->id,
            'title' => 'Nope',
        ])->assertStatus(403);

        // viewer reads, cannot mutate
        $this->actingAsScoped(['view_projects']);
        $this->getJson('/api/v1/admin/tasks?project_id='.$project->id)->assertStatus(200);
        $this->putJson("/api/v1/admin/tasks/{$task->id}", [
            'project_id' => $project->id,
            'title' => 'Nope',
        ])->assertStatus(403);

        // manager mutates
        $this->actingAsScoped(['manage_projects']);
        $this->postJson('/api/v1/admin/tasks', [
            'project_id' => $project->id,
            'title' => 'Allowed',
        ])->assertStatus(201);
    }

    // ── Status lifecycle & completed_at integrity ───────────────────

    public function test_completing_a_task_stamps_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $task = Task::factory()->create(['status' => Task::STATUS_IN_PROGRESS]);
        $this->assertNull($task->completed_at);

        $this->patchJson("/api/v1/admin/tasks/{$task->id}/status", ['status' => 'completed'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.is_overdue', false);

        $this->assertNotNull($task->fresh()->completed_at);
        $this->assertDatabaseHas('audit_logs', ['action' => 'task.status_updated', 'resource_id' => $task->id]);
    }

    public function test_leaving_completed_clears_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $task = Task::factory()->create(['status' => 'completed', 'completed_at' => now()]);

        $this->patchJson("/api/v1/admin/tasks/{$task->id}/status", ['status' => 'blocked'])
            ->assertStatus(200);

        $this->assertNull($task->fresh()->completed_at);
    }

    public function test_creating_a_task_as_completed_stamps_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();

        $this->postJson('/api/v1/admin/tasks', [
            'project_id' => $project->id,
            'title' => 'Already done',
            'status' => 'completed',
        ])->assertStatus(201);

        $this->assertNotNull(Task::where('title', 'Already done')->firstOrFail()->completed_at);
    }

    public function test_updating_status_via_edit_form_reconciles_completed_at(): void
    {
        $this->actingAsSuperAdmin();
        $task = Task::factory()->create(['status' => 'completed', 'completed_at' => now()]);

        $this->putJson("/api/v1/admin/tasks/{$task->id}", [
            'project_id' => $task->project_id,
            'title' => $task->title,
            'status' => 'in_progress',
        ])->assertStatus(200);

        $this->assertNull($task->fresh()->completed_at);
    }

    public function test_invalid_status_transition_is_rejected(): void
    {
        $this->actingAsSuperAdmin();
        $task = Task::factory()->create();

        $this->patchJson("/api/v1/admin/tasks/{$task->id}/status", ['status' => 'archived'])
            ->assertStatus(422);
    }

    // ── Index filtering & overdue ───────────────────────────────────

    public function test_tasks_index_filters_by_project_status_priority_and_search(): void
    {
        $this->actingAsSuperAdmin();
        $projectA = Project::factory()->create();
        $projectB = Project::factory()->create();
        Task::factory()->create(['project_id' => $projectA->id, 'title' => 'Zeta Task', 'status' => 'in_progress', 'priority' => 'high']);
        Task::factory()->create(['project_id' => $projectA->id, 'title' => 'Other', 'priority' => 'low']);
        Task::factory()->create(['project_id' => $projectB->id, 'title' => 'Project B Task', 'priority' => 'urgent']);

        $this->getJson('/api/v1/admin/tasks?project_id='.$projectA->id)
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/admin/tasks?project_id='.$projectA->id.'&status=in_progress')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Zeta Task');

        $this->getJson('/api/v1/admin/tasks?project_id='.$projectA->id.'&priority=high')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // search only matches this project's tasks, never the other project's
        $this->getJson('/api/v1/admin/tasks?project_id='.$projectA->id.'&search=zeta')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_task_is_overdue_only_while_open_and_past_due(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        $overdue = Task::factory()->create(['project_id' => $project->id, 'due_date' => now()->subDay()->toDateString(), 'status' => 'todo']);
        $done = Task::factory()->create(['project_id' => $project->id, 'due_date' => now()->subDay()->toDateString(), 'status' => 'completed', 'completed_at' => now()]);

        $this->getJson("/api/v1/admin/tasks/{$overdue->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.is_overdue', true)
            ->assertJsonPath('data.days_overdue', 1);

        $this->getJson("/api/v1/admin/tasks/{$done->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.is_overdue', false);
    }

    // ── No public exposure ───────────────────────────────────────────

    public function test_tasks_are_never_exposed_through_public_api(): void
    {
        $this->actingAsSuperAdmin();
        Task::factory()->create(['title' => 'Secret Internal Task']);

        $this->getJson('/api/v1/health')->assertJsonMissing(['Secret Internal Task']);
        $this->getJson('/api/v1/public/services')->assertJsonMissing(['Secret Internal Task']);
    }
}
