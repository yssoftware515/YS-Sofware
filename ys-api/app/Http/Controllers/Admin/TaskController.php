<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Models\Task;
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
 * Tasks â€” executable work inside a project. Fully admin-only; mutation
 * sits behind the SAME manage_projects boundary as the project itself
 * (no new permission surface â€” verified against AuthServiceProvider).
 */
class TaskController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('view_projects');

        $tasks = Task::accessibleBy(Auth::user())
            ->with('creator:id,name')
            ->when($request->query('project_id'), fn ($q, $id) => $q->where('project_id', $id))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('priority'), fn ($q, $p) => $q->where('priority', $p))
            ->when($request->query('search'), function ($q, $search) {
                $q->where(fn ($sub) => $sub->where('title', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%"));
            })
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 50));

        return response()->json([
            'success' => true,
            'data' => $tasks->map(fn (Task $t) => $this->payload($t)),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_projects');

        $validated = $this->validatedPayload($request);
        $this->assertProjectAccessible($validated['project_id']);
        LifecycleService::reconcileCompletion($validated);

        $task = Task::create([...$validated, 'created_by' => Auth::id()]);

        $this->auditService->logModelChange('task.created', $task);

        return response()->json([
            'success' => true,
            'message' => 'Task created successfully.',
            'data' => $this->payload($task->load('creator:id,name')),
        ], Response::HTTP_CREATED);
    }

    public function show(Task $task): JsonResponse
    {
        $this->authorize('view_projects');

        $this->assertTaskAccessible($task);

        return response()->json(['success' => true, 'data' => $this->payload($task->load('creator:id,name'))]);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->assertTaskAccessible($task);

        $validated = $this->validatedPayload($request);
        $this->assertProjectAccessible($validated['project_id']);
        LifecycleService::reconcileCompletion($validated, $task->status);

        $task->update($validated);

        $this->auditService->logModelChange('task.updated', $task);

        return response()->json([
            'success' => true,
            'message' => 'Task updated successfully.',
            'data' => $this->payload($task->fresh()->load('creator:id,name')),
        ]);
    }

    public function updateStatus(Request $request, Task $task): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->assertTaskAccessible($task);

        $validated = $request->validate([
            'status' => ['required', Rule::in(Task::STATUSES)],
        ]);

        $old = $task->status;
        LifecycleService::reconcileCompletion($validated, $old);
        $task->update($validated);

        $this->auditService->log(
            action: 'task.status_updated',
            resourceType: 'Task',
            resourceId: $task->id,
            oldValues: ['status' => $old],
            newValues: ['status' => $task->status],
        );

        return response()->json([
            'success' => true,
            'message' => 'Task status updated.',
            'data' => $this->payload($task->fresh()->load('creator:id,name')),
        ]);
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->assertTaskAccessible($task);

        $this->auditService->logModelChange('task.deleted', $task);
        $task->delete();

        return response()->json(['success' => true, 'message' => 'Task deleted successfully.']);
    }

    private function assertProjectAccessible(string $projectId): void
    {
        $project = Project::findOrFail($projectId);
        abort_unless($project->isAccessibleBy(Auth::user()), 403, 'You do not have access to this product.');
    }

    private function assertTaskAccessible(Task $task): void
    {
        abort_unless($task->isAccessibleBy(Auth::user()), 403, 'You do not have access to this product.');
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'project_id' => ['required', 'uuid', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(Task::STATUSES)],
            'priority' => ['sometimes', Rule::in(Task::PRIORITIES)],
            'due_date' => ['nullable', 'date'],
        ], [
            'project_id.exists' => 'The task must belong to an existing project.',
        ]);
    }

    private function payload(Task $task): array
    {
        return [
            'id' => $task->id,
            'project_id' => $task->project_id,
            'title' => $task->title,
            'description' => $task->description,
            'status' => $task->status,
            'priority' => $task->priority,
            'due_date' => $task->due_date?->toDateString(),
            'completed_at' => $task->completed_at?->toIso8601String(),
            'is_overdue' => $task->isOverdue(),
            'days_overdue' => $task->isOverdue()
                ? (int) $task->due_date->diffInDays(Carbon::today())
                : null,
            'created_by' => $task->relationLoaded('creator') && $task->creator ? $task->creator->name : null,
            'created_at' => $task->created_at->toIso8601String(),
            'updated_at' => $task->updated_at?->toIso8601String(),
        ];
    }
}
