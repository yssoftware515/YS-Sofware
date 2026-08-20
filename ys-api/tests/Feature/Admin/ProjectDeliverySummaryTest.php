<?php

namespace Tests\Feature\Admin;

use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectDeliverySummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_show_includes_a_real_delivery_summary(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $project = Project::factory()->create(['customer_id' => $customer->id]);

        Task::factory()->create(['project_id' => $project->id, 'status' => 'completed', 'completed_at' => now(), 'due_date' => now()->subDay()->toDateString(), 'title' => 'completed task']);
        Task::factory()->create(['project_id' => $project->id, 'status' => 'in_progress', 'due_date' => now()->addDay()->toDateString(), 'title' => 'in progress task']);
        Task::factory()->create(['project_id' => $project->id, 'status' => 'blocked', 'due_date' => now()->subDays(3)->toDateString(), 'title' => 'blocked task']);
        Task::factory()->create(['project_id' => $project->id, 'status' => 'cancelled', 'title' => 'cancelled task']);

        Milestone::factory()->create(['project_id' => $project->id, 'status' => 'completed', 'completed_at' => now(), 'target_date' => now()->subWeek()->toDateString()]);
        Milestone::factory()->create(['project_id' => $project->id, 'status' => 'pending', 'target_date' => now()->addWeek()->toDateString(), 'title' => 'Launch']);

        $this->getJson("/api/v1/admin/projects/{$project->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.delivery.total_tasks', 4)
            ->assertJsonPath('data.delivery.completed_tasks', 1)
            ->assertJsonPath('data.delivery.remaining_tasks', 2)
            ->assertJsonPath('data.delivery.blocked_tasks', 1)
            ->assertJsonPath('data.delivery.overdue_tasks', 1)
            ->assertJsonPath('data.delivery.total_milestones', 2)
            ->assertJsonPath('data.delivery.completed_milestones', 1)
            ->assertJsonPath('data.delivery.next_milestone.title', 'Launch')
            ->assertJsonPath('data.delivery.next_due_task.title', 'blocked task');
    }

    public function test_delivery_summary_is_empty_but_real_for_a_fresh_project(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();

        $this->getJson("/api/v1/admin/projects/{$project->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.delivery.total_tasks', 0)
            ->assertJsonPath('data.delivery.total_milestones', 0)
            ->assertJsonPath('data.delivery.next_milestone', null)
            ->assertJsonPath('data.delivery.next_due_task', null);
    }

    public function test_delivery_numbers_never_leak_across_projects(): void
    {
        $this->actingAsSuperAdmin();
        $customer = Customer::factory()->create();
        $project = Project::factory()->create(['customer_id' => $customer->id, 'name' => 'Ours']);
        $otherProject = Project::factory()->create(['customer_id' => Customer::factory()->create()->id, 'name' => 'Theirs']);

        Task::factory()->count(3)->create(['project_id' => $project->id]);
        Task::factory()->count(9)->create(['project_id' => $otherProject->id]);

        $this->getJson("/api/v1/admin/projects/{$project->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.delivery.total_tasks', 3);
    }

    public function test_tasks_and_milestones_are_removed_with_their_project(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        Task::factory()->create(['project_id' => $project->id]);
        Milestone::factory()->create(['project_id' => $project->id]);

        $this->deleteJson("/api/v1/admin/projects/{$project->id}")
            ->assertStatus(200);

        $this->assertDatabaseCount('tasks', 0);
        $this->assertDatabaseCount('milestones', 0);
    }

    public function test_delivery_summary_is_not_exposed_to_non_project_viewers(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();
        Task::factory()->create(['project_id' => $project->id, 'title' => 'Confidential Work']);

        // Only the customer 360 — never tasks in it.
        $this->getJson("/api/v1/admin/customers/{$project->customer_id}")
            ->assertStatus(200)
            ->assertJsonMissing(['Confidential Work']);
    }

    public function test_tasks_cannot_outlive_a_deleted_project_via_api(): void
    {
        $this->actingAsSuperAdmin();
        $project = Project::factory()->create();

        $this->deleteJson("/api/v1/admin/projects/{$project->id}")->assertStatus(200);

        // orphan creation attempt — project gone
        $this->postJson('/api/v1/admin/tasks', [
            'project_id' => $project->id,
            'title' => 'Ghost task',
        ])->assertStatus(422);
    }
}
