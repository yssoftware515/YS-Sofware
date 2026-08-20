<?php

namespace App\Domains\Billing\Models;

use App\Domains\Auth\Models\User;
use App\Domains\Operations\Models\ContactRequest;
use App\Domains\Operations\Models\Project;
use App\Domains\Product\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Customer — one row per real-world (potential) customer/company that
 * engages with YS System. The single internal business entity used by
 * contact requests (optional), projects (delivered work) and product
 * subscriptions.
 *
 * Not a CRM entity: no pipeline, lead scoring, or relationship
 * automation. Those belong to the future standalone YS-CRM product.
 */
class Customer extends Model
{
    use HasFactory, HasUuids;

    public const TYPE_INDIVIDUAL = 'individual';

    public const TYPE_COMPANY = 'company';

    public const TYPES = [self::TYPE_INDIVIDUAL, self::TYPE_COMPANY];

    public const STATUS_ACTIVE = 'active';

    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_ARCHIVED];

    protected $fillable = ['name', 'email', 'type', 'company', 'phone', 'whatsapp', 'notes', 'status', 'product_id', 'created_by'];

    /**
     * Emails are the identity key of the customer record — keep them
     * canonical (trimmed lowercase) at the model layer so 'Foo@X.com' and
     * 'foo@x.com' can never become two different customers.
     */
    protected function setEmailAttribute(?string $value): void
    {
        $this->attributes['email'] = $value !== null ? strtolower(trim($value)) : null;
    }

    /**
     * The product this customer's business is anchored to. NULL means
     * company-level (global) — visible to every scoped admin.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function contactRequests(): HasMany
    {
        return $this->hasMany(ContactRequest::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeArchived($query)
    {
        return $query->where('status', self::STATUS_ARCHIVED);
    }

    // ── Product scoping ──────────────────────────────────────────────

    /**
     * The tenant anchor of the whole B2B layer: every other scoped query
     * (projects, tasks, milestones, contact requests) resolves to this
     * table. Global rows (product_id null) stay visible to every scoped
     * admin, mirroring the content modules' convention.
     */
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        return $query->where(fn ($q) => $q->whereNull('product_id')
            ->orWhereIn('product_id', $user->products()->pluck('products.id')));
    }

    public static function userCanAccess(?string $productId, User $user): bool
    {
        return $productId === null || $user->canAccessProduct($productId);
    }
}
