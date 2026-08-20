<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Operations\Actions\ReorderMilestonesAction;
use App\Domains\Operations\Models\Milestone;
use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Services\LifecycleService;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Milestone — stage markers of a delivery. Same authorization boundary
 * as the project: view_projects to read, manage_projects to mutate.
 * Reordering is a simple up/down swap on the same project — nothing
 * more (no drag-and-drop scheduling machinery).
 */
class MilestoneController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly ReorderMilestonesAction $reorderMilestones,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('view_projects');

        $milestones = Milestone::accessibleBy(Auth::user())
            ->with('creator:id,name')
            ->when($request->query('project_id'), fn ($q, $id) => $q->where('project_id', $id))
            ->orderBy('sort_order')
            ->orderBy('target_date')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $milestones->map(fn (Milestone $m) => $this->payload($m))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_projects');

        $validated = $this->validatedPayload($request);
        $this->assertProjectAccessible($validated['project_id']);
        LifecycleService::reconcileCompletion($validated, completedStatus: Milestone::STATUS_COMPLETED);

        if (! array_key_exists('sort_order', $validated)) {
            $validated['sort_order'] = (int) Milestone::where('project_id', $validated['project_id'])->max('sort_order') + 1;
        }

        $milestone = Milestone::create([...$validated, 'created_by' => Auth::id()]);

        $this->auditService->logModelChange('milestone.created', $milestone);

        return response()->json([
            'success' => true,
            'message' => 'Milestone created successfully.',
            'data' => $this->payload($milestone->load('creator:id,name')),
        ], Response::HTTP_CREATED);
    }

    public function show(Milestone $milestone): JsonResponse
    {
        $this->authorize('view_projects');

        $this->assertMilestoneAccessible($milestone);

        return response()->json(['success' => true, 'data' => $this->payload($milestone->load('creator:id,name'))]);
    }

    public function update(Request $request, Milestone $milestone): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->assertMilestoneAccessible($milestone);

        $validated = $this->validatedPayload($request);
        $this->assertProjectAccessible($validated['project_id']);
        LifecycleService::reconcileCompletion($validated, $milestone->status, Milestone::STATUS_COMPLETED);

        $milestone->update($validated);

        $this->auditService->logModelChange('milestone.updated', $milestone);

        return response()->json([
            'success' => true,
            'message' => 'Milestone updated successfully.',
            'data' => $this->payload($milestone->fresh()->load('creator:id,name')),
        ]);
    }

    public function updateStatus(Request $request, Milestone $milestone): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->assertMilestoneAccessible($milestone);

        $validated = $request->validate([
            'status' => ['required', Rule::in(Milestone::STATUSES)],
        ]);

        $old = $milestone->status;
        LifecycleService::reconcileCompletion($validated, $old, Milestone::STATUS_COMPLETED);
        $milestone->update($validated);

        $this->auditService->log(
            action: 'milestone.status_updated',
            resourceType: 'Milestone',
            resourceId: $milestone->id,
            oldValues: ['status' => $old],
            newValues: ['status' => $milestone->status],
        );

        return response()->json([
            'success' => true,
            'message' => 'Milestone status updated.',
            'data' => $this->payload($milestone->fresh()->load('creator:id,name')),
        ]);
    }

    /**
     * Up/down reorder within the same project. The whole list of that
     * project is re-stamped with sequential ranks â€” cheap, deterministic
     * and audited, without a drag-drop scheduling problem.
     */
    public function move(Request $request, Milestone $milestone): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->assertMilestoneAccessible($milestone);

        $validated = $request->validate([
            'direction' => ['required', Rule::in(['up', 'down'])],
        ]);

        // Atomic reorder: all sort_order changes commit or none do.
        $this->reorderMilestones->execute($milestone, $validated['direction']);

        $this->auditService->log(
            action: 'milestone.moved',
            resourceType: 'Milestone',
            resourceId: $milestone->id,
            newValues: ['direction' => $validated['direction']],
        );

        $milestones = Milestone::with('creator:id,name')
            ->where('project_id', $milestone->project_id)
            ->orderBy('sort_order')
            ->orderBy('target_date')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Milestone reordered.',
            'data' => $milestones->map(fn (Milestone $m) => $this->payload($m))->values(),
        ]);
    }

    public function destroy(Milestone $milestone): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->assertMilestoneAccessible($milestone);

        $this->auditService->logModelChange('milestone.deleted', $milestone);
        $milestone->delete();

        return response()->json(['success' => true, 'message' => 'Milestone deleted successfully.']);
    }

    private function assertProjectAccessible(string $projectId): void
    {
        $project = Project::findOrFail($projectId);
        abort_unless($project->isAccessibleBy(Auth::user()), 403, 'You do not have access to this product.');
    }

    private function assertMilestoneAccessible(Milestone $milestone): void
    {
        abort_unless($milestone->isAccessibleBy(Auth::user()), 403, 'You do not have access to this product.');
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'project_id' => ['required', 'uuid', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(Milestone::STATUSES)],
            'target_date' => ['nullable', 'date'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ], [
            'project_id.exists' => 'The milestone must belong to an existing project.',
        ]);
    }

    private function payload(Milestone $milestone): array
    {
        return [
            'id' => $milestone->id,
            'project_id' => $milestone->project_id,
            'title' => $milestone->title,
            'description' => $milestone->description,
            'status' => $milestone->status,
            'target_date' => $milestone->target_date?->toDateString(),
            'completed_at' => $milestone->completed_at?->toIso8601String(),
            'sort_order' => $milestone->sort_order,
            'is_overdue' => $milestone->isOverdue(),
            'days_overdue' => $milestone->isOverdue()
                ? (int) $milestone->target_date->diffInDays(Carbon::today())
                : null,
            'created_by' => $milestone->relationLoaded('creator') && $milestone->creator ? $milestone->creator->name : null,
            'created_at' => $milestone->created_at->toIso8601String(),
            'updated_at' => $milestone->updated_at?->toIso8601String(),
        ];
    }
}
