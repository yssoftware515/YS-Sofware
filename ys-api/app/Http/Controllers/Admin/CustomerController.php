<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Customer;
use App\Domains\Operations\Models\Project;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Operations\CreateCustomerRequest;
use App\Http\Requests\Admin\Operations\UpdateCustomerRequest;
use App\Http\Resources\Admin\CustomerResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('view_customers');

        $customers = Customer::accessibleBy(Auth::user())
            ->withCount('projects')
            ->when($request->query('search'), function ($q, $s) {
                $q->where(fn ($sub) => $sub->where('name', 'ilike', "%{$s}%")
                    ->orWhere('email', 'ilike', "%{$s}%")
                    ->orWhere('company', 'ilike', "%{$s}%"));
            })
            ->when($request->query('type'), fn ($q, $t) => $q->where('type', $t))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderBy('name')
            ->paginate($this->perPage($request, 20));

        return response()->json([
            'success' => true,
            'data' => CustomerResource::collection($customers->items()),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    public function store(CreateCustomerRequest $request): JsonResponse
    {
        $this->authorize('manage_customers');

        $validated = $request->validated();

        $customer = Customer::create([
            ...$validated,
            'status' => $validated['status'] ?? Customer::STATUS_ACTIVE,
            'created_by' => Auth::id(),
        ]);

        $this->auditService->logModelChange('customer.created', $customer);

        return response()->json([
            'success' => true,
            'message' => 'Customer created successfully.',
            'data' => new CustomerResource($customer),
        ], Response::HTTP_CREATED);
    }

    public function show(Request $request, Customer $customer): JsonResponse
    {
        $this->authorize('view_customers');

        $customer->loadCount('projects');

        $data = (new CustomerResource($customer->load('creator')))->toArray($request);

        // Engagement watch is a project-domain concern; investors of the
        // "view_projects" gate (incl. manage_projects) see status counts
        // only.
        if ($request->user()->can('view_projects')) {
            $projectCounts = $customer->projects()
                ->selectRaw('
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS on_hold,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN status = ? AND expected_completion_date IS NOT NULL AND expected_completion_date < CURRENT_DATE THEN 1 ELSE 0 END) AS overdue
                ', [Project::STATUS_ACTIVE, Project::STATUS_ON_HOLD, Project::STATUS_COMPLETED, Project::STATUS_ACTIVE])
                ->first();
            $data['active_projects_count'] = (int) $projectCounts->active;
            $data['on_hold_projects_count'] = (int) $projectCounts->on_hold;
            $data['completed_projects_count'] = (int) $projectCounts->completed;
            $data['overdue_projects_count'] = (int) $projectCounts->overdue;
        }

        // Recorded commercial value is FINANCIAL data — only holders of
        // the dedicated view_financials permission see it, never every
        // view_projects holder (VULN-10). Not accounting-grade — the
        // value is the sum of quoted_value figures.
        if ($request->user()->can('view_financials')) {
            $data['value_by_currency'] = $customer->projects()
                ->whereNotNull('quoted_value')
                ->selectRaw('currency, SUM(quoted_value) as total')
                ->groupBy('currency')
                ->orderBy('currency')
                ->get()
                ->map(fn ($row) => ['currency' => $row->currency, 'total' => $row->total])
                ->values()
                ->all();
        }

        // Request history belongs to the request-management domain.
        if ($request->user()->can('manage_contact_requests')) {
            $data['latest_contact_requests'] = $customer->contactRequests()
                ->latest('created_at')
                ->limit(5)
                ->get(['id', 'name', 'email', 'request_type', 'status', 'created_at'])
                ->map(fn (ContactRequest $r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'email' => $r->email,
                    'request_type' => $r->request_type,
                    'status' => $r->status,
                    'created_at' => $r->created_at->toIso8601String(),
                ])
                ->values()
                ->all();
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $this->authorize('manage_customers');

        $validated = $request->validated();
        $customer->update($validated);

        $this->auditService->logModelChange('customer.updated', $customer);

        return response()->json(['success' => true, 'data' => new CustomerResource($customer->fresh())]);
    }

    public function updateStatus(Request $request, Customer $customer): JsonResponse
    {
        $this->authorize('manage_customers');

        $validated = $request->validate([
            'status' => ['required', Rule::in(Customer::STATUSES)],
        ]);

        $old = $customer->status;
        $customer->update(['status' => $validated['status']]);

        $this->auditService->log(
            action: 'customer.status_updated',
            resourceType: 'Customer',
            resourceId: $customer->id,
            oldValues: ['status' => $old],
            newValues: ['status' => $validated['status']],
        );

        return response()->json(['success' => true, 'data' => new CustomerResource($customer->fresh())]);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->authorize('manage_customers');

        if ($customer->projects()->exists()) {
            abort(422, 'Cannot delete a customer with existing projects. Archive the customer instead.');
        }

        $this->auditService->logModelChange('customer.deleted', $customer);
        $customer->delete();

        return response()->json(['success' => true, 'message' => 'Customer deleted successfully.']);
    }
}
