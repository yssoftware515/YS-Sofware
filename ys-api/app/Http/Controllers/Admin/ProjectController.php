<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Operations\Models\Project;
use App\Domains\Operations\Services\DeliverySummaryService;
use App\Domains\Operations\Services\LifecycleService;
use App\Domains\Operations\Services\ProjectService;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly DeliverySummaryService $deliverySummary,
        private readonly ProjectService $projects,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('view_projects');

        $projects = Project::accessibleBy(Auth::user())
            ->with('customer:id,name,company', 'services:id,name_en,name_ar')
            ->when($request->query('search'), fn ($q, $s) => $q->where('name', 'ilike', "%{$s}%"))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('project_type'), fn ($q, $t) => $q->where('project_type', $t))
            ->when($request->query('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 20));

        return response()->json([
            'success' => true,
            'data' => $projects->map(fn (Project $p) => $this->payload($p)),
            'meta' => [
                'current_page' => $projects->currentPage(),
                'last_page' => $projects->lastPage(),
                'per_page' => $projects->perPage(),
                'total' => $projects->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('manage_projects');

        $validated = $this->projects->validate($request->all());

        // Financial write boundary: users without view_financials must
        // not be able to create or set quoted_value/currency through any
        // API path. The frontend is NOT a security boundary — this check
        // must be enforced server-side independently.
        if (! Auth::user()->can('view_financials')) {
            $validated = Arr::except($validated, ['quoted_value', 'currency']);
        }

        $this->projects->assertRequestMatchesCustomer($validated, $validated['customer_id'] ?? null);
        $this->projects->assertCustomerAccessible($validated['customer_id'] ?? null);

        $attributes = Arr::except($validated, ['service_ids']);
        LifecycleService::reconcileCompletion($attributes);
        $project = Project::create([...$attributes, 'created_by' => Auth::id()]);

        if (! empty($validated['service_ids'])) {
            $project->services()->sync($validated['service_ids']);
        }

        $this->auditService->logModelChange('project.created', $project);

        return response()->json([
            'success' => true,
            'message' => 'Project created successfully.',
            'data' => $this->payload($project->load('customer:id,name,company', 'services:id,name_en,name_ar', 'contactRequest:id,name,email,request_type,status', 'creator:id,name')),
        ], Response::HTTP_CREATED);
    }

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view_projects');

        $this->projects->assertProjectAccessible($project);

        $project->load('customer:id,name,company', 'services:id,name_en,name_ar', 'creator:id,name', 'contactRequest:id,name,email,request_type,status');

        $payload = $this->payload($project);
        $payload['delivery'] = $this->deliverySummary->forProject($project);

        return response()->json(['success' => true, 'data' => $payload]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->projects->assertProjectAccessible($project);

        $validated = $this->projects->validate($request->all());

        // Financial write boundary: users without view_financials must
        // not be able to modify quoted_value/currency through any API
        // path. The frontend is NOT a security boundary — this check
        // must be enforced server-side independently.
        if (! Auth::user()->can('view_financials')) {
            $validated = Arr::except($validated, ['quoted_value', 'currency']);
        }

        // The invariant is "request's customer == project's customer".
        // On update the project may be MOVING to a different customer, so
        // the decision must be made against the new (validated) customer â€”
        // checking against the old one would let a customer change
        // silently detach the request from its actual customer.
        $this->projects->assertRequestMatchesCustomer($validated, $validated['customer_id'] ?? $project->customer_id, $project->contact_request_id);
        $this->projects->assertCustomerAccessible($validated['customer_id'] ?? $project->customer_id);

        $attributes = Arr::except($validated, ['service_ids']);
        LifecycleService::reconcileCompletion($attributes, $project->status);
        $project->update($attributes);

        if (array_key_exists('service_ids', $validated)) {
            $project->services()->sync($validated['service_ids'] ?? []);
        }

        $this->auditService->logModelChange('project.updated', $project);

        return response()->json([
            'success' => true,
            'message' => 'Project updated successfully.',
            'data' => $this->payload($project->fresh()->load('customer:id,name,company', 'services:id,name_en,name_ar', 'contactRequest:id,name,email,request_type,status', 'creator:id,name')),
        ]);
    }

    public function updateStatus(Request $request, Project $project): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->projects->assertProjectAccessible($project);

        $validated = $request->validate([
            'status' => ['required', Rule::in(Project::STATUSES)],
        ]);
        $newStatus = $validated['status'];

        $updates = ['status' => $newStatus];
        LifecycleService::reconcileCompletion($updates, $project->status);

        $old = $project->status;
        $project->update($updates);

        $this->auditService->log(
            action: 'project.status_updated',
            resourceType: 'Project',
            resourceId: $project->id,
            oldValues: ['status' => $old],
            newValues: ['status' => $newStatus],
        );

        return response()->json([
            'success' => true,
            'message' => 'Project status updated.',
            'data' => $this->payload($project->fresh()->load('customer:id,name,company', 'services:id,name_en,name_ar', 'contactRequest:id,name,email,request_type,status', 'creator:id,name')),
        ]);
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('manage_projects');

        $this->projects->assertProjectAccessible($project);

        $this->auditService->logModelChange('project.deleted', $project);
        $project->services()->detach();
        $project->delete();

        return response()->json(['success' => true, 'message' => 'Project deleted successfully.']);
    }

    private function payload(Project $project): array
    {
        $payload = [
            'id' => $project->id,
            'name' => $project->name,
            'customer_id' => $project->customer_id,
            'customer' => $project->relationLoaded('customer') && $project->customer ? [
                'id' => $project->customer->id,
                'name' => $project->customer->name,
                'company' => $project->customer->company,
            ] : null,
            'contact_request_id' => $project->contact_request_id,
            'contact_request' => $project->relationLoaded('contactRequest') && $project->contactRequest ? [
                'id' => $project->contactRequest->id,
                'name' => $project->contactRequest->name,
                'email' => $project->contactRequest->email,
                'request_type' => $project->contactRequest->request_type,
                'status' => $project->contactRequest->status,
            ] : null,
            'project_type' => $project->project_type,
            'description' => $project->description,
            'services' => $project->relationLoaded('services')
                ? $project->services->map(fn ($s) => [
                    'id' => $s->id,
                    'name_en' => $s->name_en,
                    'name_ar' => $s->name_ar,
                ])->values()
                : [],
            'status' => $project->status,
            'start_date' => $project->start_date?->toDateString(),
            'expected_completion_date' => $project->expected_completion_date?->toDateString(),
            'completed_at' => $project->completed_at?->toIso8601String(),
            'internal_notes' => $project->internal_notes,
            // Canonical creator contract — an object, not a bare name; the
            // relation is loaded on detail responses, null on list rows.
            'creator' => $project->relationLoaded('creator') && $project->creator ? [
                'id' => $project->creator->id,
                'name' => $project->creator->name,
            ] : null,
            'created_at' => $project->created_at->toIso8601String(),
            'updated_at' => $project->updated_at?->toIso8601String(),
            // Engagement watch: a project past its expected completion is
            // delinquent by definition, not by opinion.
            'is_overdue' => $project->status === Project::STATUS_ACTIVE
                && $project->expected_completion_date
                && $project->expected_completion_date->lt(Carbon::today()),
            'days_overdue' => $project->status === Project::STATUS_ACTIVE
                && $project->expected_completion_date
                && $project->expected_completion_date->lt(Carbon::today())
                ? (int) $project->expected_completion_date->diffInDays(Carbon::today())
                : null,
        ];

        // Financial fields are view_financials-only: a user who can manage
        // projects without seeing financials must not receive them. The
        // keys are omitted entirely (never nulled) so the contract fails
        // loudly if a client assumes they exist.
        if (Auth::user()?->can('view_financials')) {
            // decimal(12,2) stays a string — never emit money as a float.
            $payload['quoted_value'] = $project->quoted_value;
            $payload['currency'] = $project->currency;
        }

        return $payload;
    }
}
