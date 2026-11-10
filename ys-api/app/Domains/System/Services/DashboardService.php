<?php

namespace App\Domains\System\Services;

use App\Domains\Auth\Models\User;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Customer;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use App\Domains\System\Models\AuditLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * DashboardService — real, permission-filtered operational metrics.
 *
 * Extracted from DashboardController so the HTTP layer stays thin and the
 * metrics logic is testable and reusable. Every count and recent-item
 * list in this service is gated behind the SAME permission that gates
 * the corresponding management screen — with a deliberately wider gate
 * than Sprint 6: a user holding the *manage* flag for a module (but not
 * the viewer flag) reads its data on that module's screens, so the
 * dashboard treats viewer and manager identically. A user without either
 * never learns the module's counts — the frontend renders "—" for
 * anything the backend omits (never a fabricated zero).
 *
 * Money values leave this service as decimal STRINGS (never floats)
 * and, because `quoted_value` may be recorded in different currencies,
 * they are grouped per currency instead of naively summed across them.
 *
 * The `attention` block answers "what needs the owner's hand today":
 * overdue active engagements, on-hold engagements, completed projects
 * that never got a completion timestamp, and brand-new contact requests.
 */
final class DashboardService
{
    public function __construct(
        private readonly HealthCheckService $healthCheck,
    ) {}

    public function stats(User $user): array
    {
        $counts = [];
        $attention = [];

        // ── 2. Simple module counts — scalar subqueries in 1 query ──
        $simpleParts = [];
        if ($user->hasAnyPermission(['view_services', 'manage_services'])) {
            $simpleParts[] = '(SELECT COUNT(*)::bigint FROM services WHERE deleted_at IS NULL) AS "services"';
        }
        if ($simpleParts !== []) {
            $row = DB::select('SELECT '.implode(', ', $simpleParts))[0];
            if (isset($row->services)) {
                $counts['services'] = (int) $row->services;
            }
        }

        // ── 3. Contact requests — 2 → 1 (conditional aggregation) ──
        if ($user->hasPermission('manage_contact_requests')) {
            $cr = ContactRequest::accessibleBy($user)
                ->selectRaw("COUNT(*) AS total, SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count")
                ->first();
            $counts['contact_requests'] = (int) $cr->total;
            $counts['new_contact_requests'] = (int) $cr->new_count;
        }

        // ── 4. Audit logs (cached) ──
        if ($user->hasPermission('view_audit_logs')) {
            $counts['audit_logs'] = Cache::remember(
                'ys:dashboard:audit_logs_count:'.($user->isSuperAdmin() ? 'all' : $user->getAuthIdentifier()),
                60,
                fn () => AuditLog::accessibleBy($user)->count(),
            );
        }

        // ── 5. Customers — 2 → 1 ──
        if ($user->hasAnyPermission(['view_customers', 'manage_customers'])) {
            $cu = Customer::accessibleBy($user)
                ->selectRaw('COUNT(*) AS total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS active_count', [Customer::STATUS_ACTIVE])
                ->first();
            $counts['customers'] = (int) $cu->total;
            $counts['active_customers'] = (int) $cu->active_count;
        }

        // ── 6. Projects — 4 → 1 ──
        if ($user->hasAnyPermission(['view_projects', 'manage_projects'])) {
            $proj = Project::accessibleBy($user)
                ->selectRaw('
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS on_hold,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS completed
                ', [Project::STATUS_ACTIVE, Project::STATUS_ON_HOLD, Project::STATUS_COMPLETED])
                ->first();
            $counts['projects'] = (int) $proj->total;
            $counts['active_projects'] = (int) $proj->active;
            $counts['on_hold_projects'] = (int) $proj->on_hold;
            $counts['completed_projects'] = (int) $proj->completed;

            // Delivery signals — deliberately small: execution blockers
            // and the closest future milestone. Not a BI report.
            $taskCounts = Task::accessibleBy($user)
                ->selectRaw('
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS blocked,
                    SUM(CASE WHEN status IN (?, ?, ?) AND due_date IS NOT NULL AND due_date < CURRENT_DATE THEN 1 ELSE 0 END) AS overdue
                ', [Task::STATUS_BLOCKED, Task::STATUS_TODO, Task::STATUS_IN_PROGRESS, Task::STATUS_BLOCKED])
                ->first();
            $counts['blocked_tasks'] = (int) $taskCounts->blocked;
            $counts['overdue_tasks'] = (int) $taskCounts->overdue;

            $attention['projects_overdue'] = $this->overdueProjects($user);
            $attention['projects_on_hold'] = $this->onHoldProjects($user);
            $attention['data_integrity'] = $this->integrityFlags($user);
            $attention['tasks_overdue'] = $this->tasksOverdue($user);
            $attention['upcoming_milestone'] = $this->upcomingMilestone($user);
        }

        // ── 7. Financials — 3 → 1 (single grouped query with CASE) ──
        if ($user->can('view_financials')) {
            $fin = Project::accessibleBy($user)
                ->whereNotNull('quoted_value')
                ->selectRaw('
                    currency,
                    SUM(CASE WHEN status NOT IN (?, ?) THEN quoted_value ELSE 0 END) AS recorded,
                    SUM(CASE WHEN status = ? THEN quoted_value ELSE 0 END) AS active_val,
                    SUM(CASE WHEN status = ? THEN quoted_value ELSE 0 END) AS completed_val
                ', [Project::STATUS_CANCELLED, Project::STATUS_DRAFT, Project::STATUS_ACTIVE, Project::STATUS_COMPLETED])
                ->groupBy('currency')
                ->get();

            $counts['recorded_project_value_by_currency'] = $fin->mapWithKeys(fn ($r) => [
                $r->currency => number_format((float) $r->recorded, 2, '.', ''),
            ])->all();
            $counts['active_project_value_by_currency'] = $fin->mapWithKeys(fn ($r) => [
                $r->currency => number_format((float) $r->active_val, 2, '.', ''),
            ])->all();
            $counts['completed_project_value_by_currency'] = $fin->mapWithKeys(fn ($r) => [
                $r->currency => number_format((float) $r->completed_val, 2, '.', ''),
            ])->all();
        }

        // ── 8. Attention detail queries (small, bounded result sets) ──
        if ($user->hasPermission('manage_contact_requests')) {
            $attention['new_contact_requests'] = $this->newContactRequests($user);
        }

        $data = [
            'counts' => $counts,
            'attention' => $attention,
            'health' => $this->healthCheck->checks(),
        ];

        if ($user->hasPermission('manage_contact_requests')) {
            $data['recent_contact_requests'] = $this->recentContactRequests($user);
        }

        if ($user->hasPermission('view_audit_logs')) {
            $data['recent_audit_logs'] = $this->recentAuditLogs($user);
        }

        return $data;
    }

    private function overdueProjects(User $user): array
    {
        $projects = Project::accessibleBy($user)
            ->with('customer:id,name')
            ->where('status', Project::STATUS_ACTIVE)
            ->whereNotNull('expected_completion_date')
            ->whereDate('expected_completion_date', '<', Carbon::today())
            ->orderBy('expected_completion_date')
            ->limit(15)
            ->get();

        return [
            'total' => $projects->count(),
            'items' => $projects->map(fn (Project $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'customer_name' => $p->customer?->name,
                'expected_completion_date' => $p->expected_completion_date?->toDateString(),
                'days_overdue' => (int) $p->expected_completion_date->diffInDays(Carbon::today()),
            ])->all(),
        ];
    }

    private function onHoldProjects(User $user): array
    {
        $projects = Project::accessibleBy($user)
            ->with('customer:id,name')
            ->where('status', Project::STATUS_ON_HOLD)
            ->latest()
            ->limit(15)
            ->get();

        return [
            'total' => $projects->count(),
            'items' => $projects->map(fn (Project $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'customer_name' => $p->customer?->name,
                'expected_completion_date' => $p->expected_completion_date?->toDateString(),
            ])->all(),
        ];
    }

    /**
     * Data-integrity flags — records whose state contradicts itself
     * (a completed engagement with no recorded completion timestamp).
     * Small enough that each flag is a one-line fix, and visibility
     * keeps the dataset honest.
     */
    private function integrityFlags(User $user): array
    {
        $flags = [];

        $completedWithoutTimestamp = Project::accessibleBy($user)
            ->where('status', Project::STATUS_COMPLETED)
            ->whereNull('completed_at')
            ->limit(15)
            ->get(['id', 'name']);

        if ($completedWithoutTimestamp->isNotEmpty()) {
            $flags['completed_without_completed_at'] = [
                'label' => 'Completed projects missing a completion date.',
                'items' => $completedWithoutTimestamp->map(fn (Project $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                ])->all(),
            ];
        }

        return $flags;
    }

    private function tasksOverdue(User $user): array
    {
        $tasks = Task::accessibleBy($user)
            ->with('project:id,name')
            ->whereIn('status', [Task::STATUS_TODO, Task::STATUS_IN_PROGRESS, Task::STATUS_BLOCKED])
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', Carbon::today())
            ->orderByDesc('due_date')
            ->limit(15)
            ->get();

        return [
            'total' => $tasks->count(),
            'items' => $tasks->map(fn (Task $t) => [
                'id' => $t->id,
                'title' => $t->title,
                'project_id' => $t->project_id,
                'project_name' => $t->project?->name,
                'due_date' => $t->due_date?->toDateString(),
                'days_overdue' => (int) $t->due_date->diffInDays(Carbon::today()),
            ])->all(),
        ];
    }

    /**
     * The single closest FUTURE milestone across all projects — the
     * horizon, not a report. Null when none exists (the frontend renders
     * nothing for null; never a fabricated date).
     */
    private function upcomingMilestone(User $user): ?array
    {
        $milestone = Milestone::accessibleBy($user)
            ->with('project:id,name')
            ->whereIn('status', [Milestone::STATUS_PENDING, Milestone::STATUS_IN_PROGRESS])
            ->whereNotNull('target_date')
            ->whereDate('target_date', '>=', Carbon::today())
            ->orderBy('target_date')
            ->first();

        return $milestone ? [
            'id' => $milestone->id,
            'title' => $milestone->title,
            'project_id' => $milestone->project_id,
            'project_name' => $milestone->project?->name,
            'target_date' => $milestone->target_date->toDateString(),
        ] : null;
    }

    private function newContactRequests(User $user): array
    {
        $requests = ContactRequest::accessibleBy($user)
            ->where('status', 'new')
            ->latest()
            ->limit(10)
            ->get(['id', 'name', 'email', 'request_type', 'created_at']);

        return [
            'total' => $requests->count(),
            'items' => $requests->map(fn (ContactRequest $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'email' => $r->email,
                'request_type' => $r->request_type,
                'created_at' => $r->created_at?->toIso8601String(),
            ])->all(),
        ];
    }

    private function recentContactRequests(User $user): array
    {
        return ContactRequest::accessibleBy($user)
            ->latest()
            ->limit(5)
            ->get(['id', 'name', 'email', 'request_type', 'status', 'created_at'])
            ->map(fn (ContactRequest $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'email' => $r->email,
                'request_type' => $r->request_type,
                'status' => $r->status,
                'created_at' => $r->created_at?->toIso8601String(),
            ])
            ->all();
    }

    private function recentAuditLogs(User $user): array
    {
        return AuditLog::accessibleBy($user)
            ->with('user:id,name,email')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'resource_type' => $log->resource_type,
                'user_name' => $log->user?->name,
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->all();
    }
}
