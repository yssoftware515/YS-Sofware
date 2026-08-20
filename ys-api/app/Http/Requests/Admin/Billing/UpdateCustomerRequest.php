<?php

namespace App\Http\Requests\Admin\Billing;

use App\Domains\Billing\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('manage_customers') ?? false;
    }

    public function rules(): array
    {
        $customerId = $this->route('customer')?->id;

        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'max:150', Rule::unique('customers', 'email')->ignore($customerId)],
            'type' => ['sometimes', Rule::in(Customer::TYPES)],
            'company' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:1000'],
            // NULL = company-level (global) customer; the controller
            // enforces canAccessProduct() on any provided value.
            'product_id' => ['nullable', 'uuid', 'exists:products,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->email) {
            $this->merge(['email' => strtolower(trim($this->email))]);
        }
    }
}
