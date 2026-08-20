<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'token' => ['required', 'string', 'size:64'],
            'password' => [
                'required',
                'string',
                'max:255',
                Password::min(12)->mixedCase()->numbers()->symbols(),
                'confirmed',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'token.required' => 'The reset token is required.',
            'token.size' => 'The reset token is invalid.',
            'password.required' => 'A new password is required.',
            'password.min' => 'The new password must be at least 12 characters.',
            'password.confirmed' => 'The new password confirmation does not match.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim($this->email ?? '')),
        ]);
    }
}
