<?php

namespace App\Http\Requests\Admin\Role;

use App\Domains\Auth\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null || ! $user->hasPermission('manage_admins')) {
            return false;
        }

        // Same permission-subset rule as CreateRoleRequest: when the
        // permissions array is present, every granted permission must be
        // one the actor holds themselves. Super admins are exempt.
        if ($user->isSuperAdmin()) {
            return true;
        }

        $granted = $this->input('permissions');
        if (! is_array($granted)) {
            // Absent or malformed input is fine here — 'sometimes' and
            // rules() handle it (422 for bad shapes).
            return true;
        }

        $held = $user->role?->permissions ?? [];

        return array_diff($granted, $held) === [];
    }

    public function rules(): array
    {
        $roleId = $this->route('role')?->id;

        return [
            'name' => ['sometimes', 'string', 'max:100'],
            'slug' => ['sometimes', 'string', 'max:100', 'alpha_dash', Rule::unique('roles', 'slug')->ignore($roleId)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array', 'min:1'],
            'permissions.*' => ['string', Rule::in(Permission::values())],
        ];
    }
}
