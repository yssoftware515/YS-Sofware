<?php

namespace App\Domains\Operations\Services;

use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use Illuminate\Support\Carbon;

/**
 * DeliverySummaryService — the honest numbers behind the project's
 * "Delivery" section. Every figure is a direct database count of the
 * project's own records; nothing is fabricated and nothing is guessed.
 * A project with zero tasks genuinely shows 0 total tasks — that is a
 * fact, not a fallback. When the UI cannot obtain this block at all it
 * renders "—" (missing data, never a made-up zero).
 */
final class DeliverySummaryService
{
    public function forProject(Project $project): array
    {
        $open = [Task::STATUS_TODO, Task::STATUS_IN_PROGRESS, Task::STATUS_BLOCKED];
        $openMilestones = [Milestone::STATUS_PENDING, Milestone::STATUS_IN_PROGRESS];

        $totalTasks = $project->tasks()->count();
        $completedTasks = $project->tasks()->where('status', Task::STATUS_COMPLETED)->count();
        $remainingTasks = $project->tasks()->whereIn('status', $open)->count();
        $blockedTasks = $project->tasks()->where('status', Task::STATUS_BLOCKED)->count();
        $overdueTasks = $project->tasks()
            ->whereIn('status', $open)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', Carbon::today())
            ->count();

        $totalMilestones = $project->milestones()->count();
        $completedMilestones = $project->milestones()->where('status', Milestone::STATUS_COMPLETED)->count();
        $overdueMilestones = $project->milestones()
            ->whereIn('status', $openMilestones)
            ->whereNotNull('target_date')
            ->whereDate('target_date', '<', Carbon::today())
            ->count();

        $nextMilestone = $project->milestones()
            ->whereIn('status', $openMilestones)
            ->whereNotNull('target_date')
            ->orderBy('target_date')
            ->first(['id', 'title', 'target_date']);

        $nextTask = $project->tasks()
            ->whereIn('status', $open)
            ->whereNotNull('due_date')
            ->orderBy('due_date')
            ->first(['id', 'title', 'due_date']);

        return [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'remaining_tasks' => $remainingTasks,
            'blocked_tasks' => $blockedTasks,
            'overdue_tasks' => $overdueTasks,
            'total_milestones' => $totalMilestones,
            'completed_milestones' => $completedMilestones,
            'overdue_milestones' => $overdueMilestones,
            'next_milestone' => $nextMilestone ? [
                'id' => $nextMilestone->id,
                'title' => $nextMilestone->title,
                'target_date' => $nextMilestone->target_date->toDateString(),
            ] : null,
            'next_due_task' => $nextTask ? [
                'id' => $nextTask->id,
                'title' => $nextTask->title,
                'due_date' => $nextTask->due_date->toDateString(),
            ] : null,
        ];
    }
}
