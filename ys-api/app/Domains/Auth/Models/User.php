<?php

namespace App\Domains\Auth\Models;

use App\Domains\Product\Models\Product;
use App\Domains\System\Models\AuditLog;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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

    /**
     * Products this admin has explicit access to. Irrelevant for
     * super admins (they bypass this check entirely — see
     * canAccessProduct()) and meaningless-by-design for a user with zero
     * rows here: that means zero product access, not unrestricted access.
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'admin_product_access')
            ->using(AdminProductAccess::class)
            ->withTimestamps();
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
     * because product-scoping and future scope checks need to ask "does
     * this user bypass scoping entirely" as a distinct question from
     * "does this user have permission X."
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasPermission('*');
    }

    /**
     * The actual product-access gate. Call this IN ADDITION TO the
     * existing $this->authorize('manage_products')-style action checks —
     * it answers a different question ("which product") than those do
     * ("can you do this kind of thing at all"). Deliberately fails closed:
     * a non-super-admin with no admin_product_access rows gets false, not
     * true, even if some other permission check already passed.
     */
    public function canAccessProduct(Product|string $product): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $productId = $product instanceof Product ? $product->id : $product;

        return $this->products()->where('products.id', $productId)->exists();
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
