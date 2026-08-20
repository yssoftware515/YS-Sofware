<?php

namespace App\Http\Requests\Admin\Billing;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('manage_subscriptions') ?? false;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'uuid', 'exists:customers,id'],
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'plan_name' => ['required', 'string', 'max:100'],
            'price' => ['required', 'numeric', 'min:0', 'decimal:0,2'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'billing_cycle' => ['required', Rule::in(['monthly', 'quarterly', 'biannual', 'yearly'])],
            'starts_at' => ['required', 'date'],
            // Optional override — CreateSubscriptionAction derives this
            // from starts_at + billing_cycle when omitted.
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'status' => ['sometimes', Rule::in(['active', 'expired', 'cancelled'])],
        ];
    }
}
