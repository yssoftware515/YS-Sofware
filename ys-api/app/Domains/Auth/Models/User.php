<?php

namespace App\Domains\Auth\Models;

use App\Domains\System\Models\AuditLog;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'is_active',
        'last_login_at',
        'last_login_ip',
        'password_changed_at',
        'welcome_token_hash',
        'welcome_token_expires_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'password_changed_at',
        'welcome_token_hash',
        'welcome_token_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'welcome_token_expires_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    // ── Permission helpers ───────────────────────────────────────────

    public function hasPermission(string $permission): bool
    {
        if (! $this->role) {
            return false;
        }

        $permissions = $this->role->permissions ?? [];

        // Super admin has all permissions
        if (in_array('*', $permissions, true)) {
            return true;
        }

        return in_array($permission, $permissions, true);
    }

    public function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * True only for the literal '*' permission — kept as its own named
     * method (rather than every caller re-checking hasPermission('*'))
     * so scope checks can ask "does this user bypass scoping entirely"
     * as a distinct question from "does this user have permission X."
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasPermission('*');
    }

    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
