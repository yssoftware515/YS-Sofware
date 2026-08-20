<?php

namespace App\Domains\Auth\Repositories;

use App\Domains\Auth\Models\User;

/**
 * Permission abstraction layer.
 *
 * Current implementation: reads from roles.permissions (jsonb).
 * Future: swap implementation to Spatie Permission pivot tables
 * without changing any calling code.
 */
class PermissionRepository
{
    /**
     * Check if a user has a specific permission.
     */
    public function hasPermission(User $user, string $permission): bool
    {
        return $user->hasPermission($permission);
    }

    /**
     * Check if a user has any of the given permissions.
     */
    public function hasAnyPermission(User $user, array $permissions): bool
    {
        return $user->hasAnyPermission($permissions);
    }

    /**
     * Get all permissions for a user.
     *
     * @return array<string>
     */
    public function getPermissions(User $user): array
    {
        return $user->role?->permissions ?? [];
    }
}
