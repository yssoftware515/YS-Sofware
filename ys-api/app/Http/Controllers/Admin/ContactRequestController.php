<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use App\Domains\System\Services\AuditService;
use App\Http\Controllers\Controller;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ContactRequestController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_contact_requests');

        $requests = ContactRequest::accessibleBy(Auth::user())
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('type'), fn ($q, $t) => $q->ofType($t))
            ->when($request->query('request_type'), fn ($q, $t) => $q->where('request_type', $t))
            ->when($request->query('search'), function ($q, $search) {
                $q->where(fn ($sub) => $sub->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%"));
            })
            ->orderByDesc('created_at')
            ->paginate($this->perPage($request, 20));

        return response()->json([
            'success' => true,
            'data' => $requests->items(),
            'meta' => ['current_page' => $requests->currentPage(), 'last_page' => $requests->lastPage(), 'per_page' => $requests->perPage(), 'total' => $requests->total()],
        ]);
    }

    public function show(ContactRequest $contactRequest): JsonResponse
    {
        $this->authorize('manage_contact_requests');

        $this->assertRequestAccessible($contactRequest);

        // Auto-mark as reviewing on first open â€” "new" means untouched.
        if ($contactRequest->isNew()) {
            $contactRequest->update(['status' => 'reviewing']);
            $this->auditService->log('contact_request.read', 'ContactRequest', $contactRequest->id);
        }

        return response()->json(['success' => true, 'data' => $contactRequest->load('customer:id,name,email,company', 'projects:id,contact_request_id,name,status,quoted_value,currency')]);
    }

    public function updateStatus(Request $request, ContactRequest $contactRequest): JsonResponse
    {
        $this->authorize('manage_contact_requests');

        $this->assertRequestAccessible($contactRequest);

        $validated = $request->validate([
            'status' => ['required', Rule::in(ContactRequest::STATUSES)],
        ]);

        $old = $contactRequest->status;
        $contactRequest->update([
            'status' => $validated['status'],
            'handled_by' => Auth::id(),
            'handled_at' => now(),
        ]);

        $this->auditService->log(
            action: 'contact_request.status_updated',
            resourceType: 'ContactRequest',
            resourceId: $contactRequest->id,
            oldValues: ['status' => $old],
            newValues: ['status' => $validated['status']],
        );

        return response()->json(['success' => true, 'data' => $contactRequest->fresh()->load('customer:id,name,email,company', 'projects:id,contact_request_id,name,status,quoted_value,currency')]);
    }

    /**
     * Link this request to an EXISTING customer. Always an explicit admin
     * action â€” never an automatic email-based merge. The request row is
     * preserved as history either way.
     */
    public function linkCustomer(Request $request, ContactRequest $contactRequest): JsonResponse
    {
        $this->authorize('manage_contact_requests');
        $this->authorize('manage_customers');

        $this->assertRequestAccessible($contactRequest);

        $validated = $request->validate([
            'customer_id' => ['required', 'uuid', Rule::exists('customers', 'id')],
        ]);

        $customer = Customer::findOrFail($validated['customer_id']);
        abort_unless(Customer::userCanAccess($customer->product_id, Auth::user()), 403, 'You do not have access to this product.');

        $contactRequest->update([
            'customer_id' => $validated['customer_id'],
            'handled_by' => Auth::id(),
            'handled_at' => now(),
        ]);

        $this->auditService->log(
            action: 'contact_request.customer_linked',
            resourceType: 'ContactRequest',
            resourceId: $contactRequest->id,
            oldValues: ['customer_id' => null],
            newValues: ['customer_id' => $validated['customer_id']],
        );

        return response()->json([
            'success' => true,
            'message' => 'Contact request linked to customer.',
            'data' => $contactRequest->fresh()->load('customer:id,name,email,phone', 'projects:id,contact_request_id,name,status,quoted_value,currency'),
        ]);
    }

    /**
     * Create a Customer from the information this request already carries
     * and link it. Fails loudly (422) if the email already belongs to a
     * customer â€” an admin must pick the existing record instead, so we
     * never silently fork or duplicate identities.
     */
    public function convertCustomer(ContactRequest $contactRequest): JsonResponse
    {
        $this->authorize('manage_contact_requests');
        $this->authorize('manage_customers');

        // Requests linked to a customer outside this admin's product scope
        // must never be convertible — the resulting customer row would be
        // created from foreign tenant data (F-001, Phase 5A).
        $this->assertRequestAccessible($contactRequest);

        // Canonical identity check â€” email is lowercased by the model
        // mutator, so compare case-insensitively here as well.
        $email = strtolower(trim($contactRequest->email));

        if (Customer::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'A customer with this email already exists. Link the request to the existing customer instead.',
            ], 422);
        }

        try {
            // The customer row and the request->customer link are one
            // business fact â€” create both in a single transaction so a
            // failure in the link step can never leave an orphan customer.
            $customer = DB::transaction(function () use ($contactRequest, $email): Customer {
                $customer = Customer::create([
                    'name' => $contactRequest->name,
                    'email' => $email,
                    'type' => $contactRequest->company_name ? Customer::TYPE_COMPANY : Customer::TYPE_INDIVIDUAL,
                    'company' => $contactRequest->company_name,
                    'phone' => $contactRequest->phone,
                    'whatsapp' => $contactRequest->contact_preference === 'whatsapp' ? $contactRequest->phone : null,
                    'notes' => 'Converted from contact request #'.mb_substr($contactRequest->id, 0, 8),
                    'created_by' => Auth::id(),
                ]);

                $contactRequest->update([
                    'customer_id' => $customer->id,
                    'handled_by' => Auth::id(),
                    'handled_at' => now(),
                ]);

                return $customer;
            });
        } catch (QueryException $e) {
            // Two admins converting the same request simultaneously â€” the
            // unique index is the final authority. Fail the same way a
            // normal duplicate check would, never corrupt identities.
            if ($e->getCode() === '23505') {
                return response()->json([
                    'success' => false,
                    'message' => 'A customer with this email already exists. Link the request to the existing customer instead.',
                ], 422);
            }

            throw $e;
        }

        $contactRequest->update([
            'customer_id' => $customer->id,
            'handled_by' => Auth::id(),
            'handled_at' => now(),
        ]);

        $this->auditService->logModelChange('customer.created', $customer, userId: Auth::id());
        $this->auditService->log(
            action: 'contact_request.customer_converted',
            resourceType: 'ContactRequest',
            resourceId: $contactRequest->id,
            newValues: ['customer_id' => $customer->id],
        );

        return response()->json([
            'success' => true,
            'message' => 'Customer created from this contact request and linked.',
            'data' => [
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                ],
                'contact_request' => $contactRequest->fresh('customer'),
            ],
        ], Response::HTTP_CREATED);
    }

    public function unlinkCustomer(ContactRequest $contactRequest): JsonResponse
    {
        $this->authorize('manage_contact_requests');
        $this->authorize('manage_customers');

        $this->assertRequestAccessible($contactRequest);

        $oldCustomerId = $contactRequest->customer_id;
        $contactRequest->update(['customer_id' => null]);

        $this->auditService->log(
            action: 'contact_request.customer_unlinked',
            resourceType: 'ContactRequest',
            resourceId: $contactRequest->id,
            oldValues: ['customer_id' => $oldCustomerId],
            newValues: ['customer_id' => null],
        );

        return response()->json([
            'success' => true,
            'message' => 'Contact request unlinked from customer.',
            'data' => $contactRequest->fresh()->load('customer:id,name,email,phone', 'projects:id,contact_request_id,name,status,quoted_value,currency'),
        ]);
    }

    /**
     * Point a project back at the request it was born from. Always an
     * explicit admin action (request detail page) â€” projects are never
     * auto-linked. The request must already be linked to a customer and
     * the project must belong to that same customer; one request may
     * give birth to several projects.
     */
    public function linkProject(Request $request, ContactRequest $contactRequest): JsonResponse
    {
        $this->authorize('manage_contact_requests');
        $this->authorize('manage_projects');

        $this->assertRequestAccessible($contactRequest);

        $validated = $request->validate([
            'project_id' => ['required', 'uuid', Rule::exists('projects', 'id')],
        ]);

        $project = Project::findOrFail($validated['project_id']);
        abort_unless($project->isAccessibleBy(Auth::user()), 403, 'You do not have access to this product.');

        if ($contactRequest->customer_id === null || $project->customer_id !== $contactRequest->customer_id) {
            abort(422, 'The request and the project must belong to the same customer. Link the request to a customer first.');
        }

        $oldProjectId = $project->contact_request_id;
        $project->update(['contact_request_id' => $contactRequest->id]);

        $this->auditService->log(
            action: 'contact_request.project_linked',
            resourceType: 'ContactRequest',
            resourceId: $contactRequest->id,
            oldValues: ['project_id' => $oldProjectId],
            newValues: ['project_id' => $project->id],
        );

        return response()->json([
            'success' => true,
            'message' => 'Project linked to the contact request.',
            'data' => $this->requestPayload($contactRequest),
        ]);
    }

    public function unlinkProject(ContactRequest $contactRequest, Project $project): JsonResponse
    {
        $this->authorize('manage_contact_requests');
        $this->authorize('manage_projects');

        $this->assertRequestAccessible($contactRequest);
        abort_unless($project->isAccessibleBy(Auth::user()), 403, 'You do not have access to this product.');

        if ($project->contact_request_id !== $contactRequest->id) {
            abort(422, 'This project is not linked to this contact request.');
        }

        $project->update(['contact_request_id' => null]);

        $this->auditService->log(
            action: 'contact_request.project_unlinked',
            resourceType: 'ContactRequest',
            resourceId: $contactRequest->id,
            oldValues: ['project_id' => $project->id],
            newValues: ['project_id' => null],
        );

        return response()->json([
            'success' => true,
            'message' => 'Project unlinked from the contact request.',
            'data' => $this->requestPayload($contactRequest),
        ]);
    }

    private function requestPayload(ContactRequest $contactRequest): ContactRequest
    {
        return $contactRequest->fresh()->load('customer:id,name,email,phone', 'projects:id,contact_request_id,name,status,quoted_value,currency');
    }

    private function assertRequestAccessible(ContactRequest $contactRequest): void
    {
        abort_unless($contactRequest->isAccessibleBy(Auth::user()), 403, 'You do not have access to this product.');
    }
}
