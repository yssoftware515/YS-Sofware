<?php

namespace App\Domains\System\Services;

use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Cms\Models\Faq;
use App\Domains\Cms\Models\HomepageSection;
use App\Domains\Cms\Models\Menu;
use App\Domains\Cms\Models\StaticPage;
use App\Domains\Content\Models\Career;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductRelease;
use App\Domains\Services\Models\Service;
use App\Domains\System\Models\AuditLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

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

        // Content modules with a real reader permission (view_*) — the
        // dashboard treats viewer and manager identically, just like the
        // module screens do. Modules WITHOUT a view_* permission
        // (contact requests, careers, CMS) stay manage-only below.
        if ($user->hasAnyPermission(['view_products', 'manage_products'])) {
            // Product-scoping: a scoped admin only ever sees counts for
            // products they are explicitly granted (see User::canAccessProduct).
            if ($user->isSuperAdmin()) {
                $counts['products'] = Product::count();
                $counts['releases'] = ProductRelease::count();
            } else {
                $productIds = $user->products()->pluck('products.id');
                $counts['products'] = $productIds->count();
                $counts['releases'] = ProductRelease::whereIn('product_id', $productIds)->count();
            }
        }
        if ($user->hasAnyPermission(['view_services', 'manage_services'])) {
            $counts['services'] = Service::count();
        }
        if ($user->hasPermission('manage_careers')) {
            $counts['careers'] = Career::count();
        }
        if ($user->hasPermission('manage_contact_requests')) {
            $counts['contact_requests'] = ContactRequest::accessibleBy($user)->count();
            $counts['new_contact_requests'] = ContactRequest::accessibleBy($user)->where('status', 'new')->count();
        }
        if ($user->hasPermission('view_audit_logs')) {
            // Phase 4A (P2-06): the global audit count is the one
            // unbounded COUNT on the dashboard — cache it (60s) so the
            // exact metric survives without scanning a growing table on
            // every dashboard visit. The audit LIST endpoint remains
            // paginated and orders by the new created_at index.
            $counts['audit_logs'] = Cache::remember(
                'ys:dashboard:audit_logs_count:'.($user->isSuperAdmin() ? 'all' : $user->getAuthIdentifier()),
                60,
                fn () => AuditLog::accessibleBy($user)->count(),
            );
        }
        if ($user->hasPermission('manage_static_pages')) {
            $counts['static_pages'] = StaticPage::count();
        }
        if ($user->hasPermission('manage_faqs')) {
            $counts['faqs'] = Faq::count();
        }
        if ($user->hasPermission('manage_menus')) {
            $counts['menus'] = Menu::count();
        }
        if ($user->hasPermission('manage_homepage')) {
            $counts['homepage_sections'] = HomepageSection::count();
        }

        // Business operations — a user reading the module's screens may
        // hold either the viewer or the manager flag, so either unlocks
        // the corresponding operational numbers on the dashboard. All
        // B2B queries are product-scoped through the customer anchor
        // (see Customer::scopeAccessibleBy).
        if ($user->hasAnyPermission(['view_customers', 'manage_customers'])) {
            $counts['customers'] = Customer::accessibleBy($user)->count();
            $counts['active_customers'] = Customer::accessibleBy($user)->where('status', Customer::STATUS_ACTIVE)->count();
        }
        if ($user->hasAnyPermission(['view_projects', 'manage_projects'])) {
            $counts['projects'] = Project::accessibleBy($user)->count();
            $counts['active_projects'] = Project::accessibleBy($user)->where('status', Project::STATUS_ACTIVE)->count();
            $counts['on_hold_projects'] = Project::accessibleBy($user)->where('status', Project::STATUS_ON_HOLD)->count();
            $counts['completed_projects'] = Project::accessibleBy($user)->where('status', Project::STATUS_COMPLETED)->count();
        }

        // Recorded commercial value is FINANCIAL data: only holders of
        // the dedicated view_financials permission see the quoted-value
        // sums, never every view_projects holder (VULN-10).
        if ($user->can('view_financials')) {
            // Explicitly "recorded", never presented as revenue or
            // accounting data, and never summed across different
            // currencies.
            $counts['recorded_project_value_by_currency'] = $this->quotedValueByCurrency(
                Project::accessibleBy($user)->where('status', '!=', Project::STATUS_CANCELLED)->where('status', '!=', Project::STATUS_DRAFT)
            );
            $counts['active_project_value_by_currency'] = $this->quotedValueByCurrency(
                Project::accessibleBy($user)->where('status', Project::STATUS_ACTIVE)
            );
            $counts['completed_project_value_by_currency'] = $this->quotedValueByCurrency(
                Project::accessibleBy($user)->where('status', Project::STATUS_COMPLETED)
            );
        }

        if ($user->hasAnyPermission(['view_projects', 'manage_projects'])) {
            $attention['projects_overdue'] = $this->overdueProjects($user);
            $attention['projects_on_hold'] = $this->onHoldProjects($user);
            $attention['data_integrity'] = $this->integrityFlags($user);

            // Delivery signals — deliberately small: execution blockers
            // and the closest future milestone. Not a BI report.
            $counts['blocked_tasks'] = Task::accessibleBy($user)->where('status', Task::STATUS_BLOCKED)->count();
            $counts['overdue_tasks'] = Task::accessibleBy($user)
                ->whereIn('status', [Task::STATUS_TODO, Task::STATUS_IN_PROGRESS, Task::STATUS_BLOCKED])
                ->whereNotNull('due_date')
                ->whereDate('due_date', '<', Carbon::today())
                ->count();
            $attention['tasks_overdue'] = $this->tasksOverdue($user);
            $attention['upcoming_milestone'] = $this->upcomingMilestone($user);
        }
        // Contact requests have no viewer-only permission — reads and
        // writes share the manage flag (see ContactRequestController),
        // so the dashboard gate mirrors exactly that boundary.
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

    /**
     * Sum quoted values grouped by currency, formatted as decimal strings.
     * DB SUM already returns numeric precision; grouping keys stay stable
     * per currency so the frontend can display "USD 45,000.00" without
     * ever joining figures quoted in different currencies.
     */
    private function quotedValueByCurrency(Builder $query): array
    {
        return $query->whereNotNull('quoted_value')
            ->selectRaw('currency, SUM(quoted_value) as total')
            ->groupBy('currency')
            ->pluck('total', 'currency')
            ->map(fn ($total) => number_format((float) $total, 2, '.', ''))
            ->all();
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
