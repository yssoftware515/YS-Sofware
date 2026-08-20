<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Auth handled by the auth:sanctum + active middleware
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'max:255'],
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
            'current_password.required' => 'Your current password is required.',
            'password.required' => 'A new password is required.',
            'password.min' => 'The new password must be at least 12 characters.',
            'password.confirmed' => 'The new password confirmation does not match.',
        ];
    }

    /**
     * VULN-13: current-password verification and the
     * must-differ-from-current rule run against the authenticated
     * user's stored bcrypt hash — wrong current or unchanged password
     * both surface as 422 validation errors.
     */
    protected function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();

            if (! Hash::check((string) $this->input('current_password', ''), $user->password)) {
                $validator->errors()->add('current_password', 'The current password is incorrect.');
            }

            if (Hash::check((string) $this->input('password', ''), $user->password)) {
                $validator->errors()->add('password', 'The new password must be different from the current password.');
            }
        });
    }
}
