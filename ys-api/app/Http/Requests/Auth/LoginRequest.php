<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Auth check happens in action
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'remember' => ['sometimes', 'boolean'],
            // GAP-01: opaque Cloudflare Turnstile widget token. Optional
            // in the request — enforcement happens in LoginAction when
            // TURNSTILE_ENABLED=true.
            'turnstile_token' => ['sometimes', 'string', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'password.required' => 'Password is required.',
            'password.min' => 'Password must be at least 8 characters.',
        ];
    }

    // Sanitize before validation
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim($this->email ?? '')),
        ]);
    }
}
