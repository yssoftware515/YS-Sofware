<?php

namespace App\Domains\Auth\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['name', 'slug', 'permissions', 'description'];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * A role grants super admin when it carries the '*' (all permissions)
     * marker — the same check User::isSuperAdmin() relies on. Every
     * authorization boundary must use this (or User::isSuperAdmin), never
     * the role's slug: slugs are mutable metadata, the '*' permission is
     * the actual privilege.
     */
    public function grantsSuperAdmin(): bool
    {
        return in_array('*', $this->permissions ?? [], true);
    }
}
