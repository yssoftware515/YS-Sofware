<?php

namespace App\Domains\Operations\Services;

use App\Domains\Billing\Models\Customer;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * ProjectService — the project domain's validation rules and business
 * invariants, extracted from ProjectController so every caller (HTTP
 * today, future jobs/CLI) enforces exactly the same rules. Controllers
 * stay declarative; this service is the single source of truth.
 *
 * - validate(): the create/update attribute rules (throws
 *   ValidationException on failure, exactly like $request->validate()).
 * - assertRequestMatchesCustomer(): a project may reference its
 *   originating contact request only when both sides belong to the same
 *   customer; the sanctioned path is the request detail page
 *   (link-project), and no form may produce a link that violates the
 *   boundary.
 * - assertCustomerAccessible()/assertProjectAccessible(): product
 *   scoping — the project inherits its tenant through the customer (the
 *   customer's product_id is the anchor). A scoped admin may only attach
 *   a project to customers inside their granted set — NULL (no customer
 *   / global customer) is always allowed.
 */
final class ProjectService
{
    public function validate(array $data): array
    {
        return Validator::make($data, [
            'name' => ['required', 'string', 'max:180'],
            'customer_id' => ['nullable', 'uuid', Rule::exists('customers', 'id')],
            'contact_request_id' => ['nullable', 'uuid', Rule::exists('contact_requests', 'id')],
            'project_type' => ['nullable', Rule::in(Project::PROJECT_TYPES)],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(Project::STATUSES)],
            'start_date' => ['nullable', 'date'],
            'expected_completion_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'quoted_value' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'currency' => ['nullable', 'string', 'size:3', 'alpha'],
            'internal_notes' => ['nullable', 'string', 'max:2000'],
            'service_ids' => ['nullable', 'array', 'max:20'],
            'service_ids.*' => ['uuid', Rule::exists('services', 'id')],
        ], [
            'expected_completion_date.after_or_equal' => 'Expected completion cannot be before the start date.',
        ])->validate();
    }

    /**
     * The invariant is "request's customer == project's customer".
     * On update the project may be MOVING to a different customer, so
     * the decision must be made against the new (validated) customer —
     * checking against the old one would let a customer change
     * silently detach the request from its actual customer.
     *
     * The check is performed against the REQUEST the project will end up
     * with: the validated one if provided, otherwise the one it already
     * carries — an update that changes customer_id without touching the
     * request must not silently orphan that pair.
     */
    public function assertRequestMatchesCustomer(array $validated, ?string $customerId, ?string $currentRequestId = null): void
    {
        $requestId = $validated['contact_request_id'] ?? $currentRequestId;
        if ($requestId === null) {
            return;
        }

        $request = ContactRequest::find($requestId);
        if (! $request || $request->customer_id === null || $request->customer_id !== $customerId) {
            abort(422, 'The project and its originating request must belong to the same customer. Link the request to the customer first.');
        }
    }

    /**
     * Product-scoping: the project inherits its tenant through the
     * customer (the customer's product_id is the anchor). A scoped admin
     * may only attach a project to customers inside their granted set —
     * NULL (no customer / global customer) is always allowed.
     */
    public function assertCustomerAccessible(?string $customerId): void
    {
        if ($customerId === null) {
            return;
        }

        $customer = Customer::find($customerId);
        abort_unless($customer !== null && Customer::userCanAccess($customer->product_id, Auth::user()), 403, 'You do not have access to this product.');
    }

    public function assertProjectAccessible(Project $project): void
    {
        abort_unless($project->isAccessibleBy(Auth::user()), 403, 'You do not have access to this product.');
    }
}
