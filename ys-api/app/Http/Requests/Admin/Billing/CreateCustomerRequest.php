<?php

namespace App\Http\Requests\Admin\Billing;

use App\Domains\Billing\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('manage_customers') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            // Email is canonicalized (trimmed lowercase) before any rule
            // runs, so case variants of an existing address are rejected
            // by the plain unique rule — the same canonical form the
            // model mutator writes to the database.
            'email' => ['required', 'email', 'max:150', 'unique:customers,email'],
            'type' => ['sometimes', Rule::in(Customer::TYPES)],
            'company' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['sometimes', Rule::in(Customer::STATUSES)],
            // NULL = company-level (global) customer; otherwise the
            // product this customer's business is anchored to. The
            // controller enforces canAccessProduct() on the value.
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
