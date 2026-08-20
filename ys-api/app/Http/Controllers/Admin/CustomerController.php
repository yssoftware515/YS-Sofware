<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Billing\CreateCustomerRequest;
use App\Http\Requests\Admin\Billing\UpdateCustomerRequest;
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
            ->withCount('subscriptions')
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
        $validated = $request->validated();
        $this->assertProductAccessible($validated['product_id'] ?? null);

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

        $this->assertCustomerAccessible($customer);

        $customer->loadCount('subscriptions')->loadCount('projects');

        $data = (new CustomerResource($customer->load('creator')))->toArray($request);

        // Engagement watch is a project-domain concern; investors of the
        // "view_projects" gate (incl. manage_projects) see status counts
        // only.
        if ($request->user()->can('view_projects')) {
            $data['active_projects_count'] = $customer->projects()->where('status', Project::STATUS_ACTIVE)->count();
            $data['on_hold_projects_count'] = $customer->projects()->where('status', Project::STATUS_ON_HOLD)->count();
            $data['completed_projects_count'] = $customer->projects()->where('status', Project::STATUS_COMPLETED)->count();
            $data['overdue_projects_count'] = $customer->projects()
                ->where('status', Project::STATUS_ACTIVE)
                ->whereNotNull('expected_completion_date')
                ->whereDate('expected_completion_date', '<', today())
                ->count();
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
        $this->assertCustomerAccessible($customer);

        $validated = $request->validated();
        $this->assertProductAccessible($validated['product_id'] ?? $customer->product_id);

        $customer->update($validated);

        $this->auditService->logModelChange('customer.updated', $customer);

        return response()->json(['success' => true, 'data' => new CustomerResource($customer->fresh())]);
    }

    public function updateStatus(Request $request, Customer $customer): JsonResponse
    {
        $this->authorize('manage_customers');

        $this->assertCustomerAccessible($customer);

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

        $this->assertCustomerAccessible($customer);

        if ($customer->subscriptions()->exists()) {
            abort(422, 'Cannot delete a customer with existing subscriptions. Cancel or remove their subscriptions first.');
        }

        if ($customer->projects()->exists()) {
            abort(422, 'Cannot delete a customer with existing projects. Archive the customer instead.');
        }

        $this->auditService->logModelChange('customer.deleted', $customer);
        $customer->delete();

        return response()->json(['success' => true, 'message' => 'Customer deleted successfully.']);
    }

    private function assertCustomerAccessible(Customer $customer): void
    {
        abort_unless(Customer::userCanAccess($customer->product_id, Auth::user()), 403, 'You do not have access to this product.');
    }

    private function assertProductAccessible(?string $productId): void
    {
        abort_unless(Customer::userCanAccess($productId, Auth::user()), 403, 'You do not have access to this product.');
    }
}
