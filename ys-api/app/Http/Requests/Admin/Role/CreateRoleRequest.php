<?php

namespace App\Http\Requests\Admin\Role;

use App\Domains\Auth\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null || ! $user->hasPermission('manage_admins')) {
            return false;
        }

        // Super admins may compose any role. Everyone else is bound by
        // the permission-subset rule: a role may only carry permissions
        // the actor themselves holds, otherwise a scoped admin could
        // mint roles that grant privileges they never had and hand them
        // to others (lateral privilege movement).
        if ($user->isSuperAdmin()) {
            return true;
        }

        $granted = $this->input('permissions');
        if (! is_array($granted)) {
            // Malformed input is rejected by rules() with a 422; only
            // well-formed arrays are compared here.
            return true;
        }

        $held = $user->role?->permissions ?? [];

        return array_diff($granted, $held) === [];
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:roles,slug'],
            'description' => ['nullable', 'string', 'max:255'],
            // '*' is deliberately not accepted here — granting full
            // super-admin access is a one-time, deliberate act (seeded /
            // done directly by whoever owns the company), not something
            // assembled by picking permissions from a list. Every value
            // must be a real, enforced permission — see Permission enum.
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*' => ['string', Rule::in(Permission::values())],
        ];
    }
}
