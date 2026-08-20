<?php

namespace App\Domains\Operations\Models;

use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use App\Domains\Services\Models\Service;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Project — an internal record of a commercial/delivery engagement.
 *
 * A project is actual work YS System is delivering (or has delivered)
 * for a customer. It is deliberately NOT:
 *   - a task manager (no tasks/assignees),
 *   - a product (not a company-owned product with release machinery),
 *   - a contact request (a request becomes a project only when work starts).
 *
 * `quoted_value` + `currency` hold the RECORDED commercial value of the
 * engagement. These are not accounting-grade figures (no invoices, costs,
 * or profit) — treat them as operational records for business review.
 */
class Project extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_ON_HOLD = 'on_hold';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_ACTIVE,
        self::STATUS_ON_HOLD,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    public const PROJECT_TYPE_WEBSITE = 'website';

    public const PROJECT_TYPE_WEB_PLATFORM = 'web_platform';

    public const PROJECT_TYPE_MOBILE_APP = 'mobile_app';

    public const PROJECT_TYPE_CUSTOM_SOFTWARE = 'custom_software';

    public const PROJECT_TYPE_AI_SOLUTION = 'ai_solution';

    public const PROJECT_TYPE_AI_AUTOMATION = 'ai_automation';

    public const PROJECT_TYPE_UI_UX = 'ui_ux';

    public const PROJECT_TYPE_BRANDING = 'branding';

    public const PROJECT_TYPE_INTEGRATION = 'integration';

    public const PROJECT_TYPE_OTHER = 'other';

    public const PROJECT_TYPES = [
        self::PROJECT_TYPE_WEBSITE,
        self::PROJECT_TYPE_WEB_PLATFORM,
        self::PROJECT_TYPE_MOBILE_APP,
        self::PROJECT_TYPE_CUSTOM_SOFTWARE,
        self::PROJECT_TYPE_AI_SOLUTION,
        self::PROJECT_TYPE_AI_AUTOMATION,
        self::PROJECT_TYPE_UI_UX,
        self::PROJECT_TYPE_BRANDING,
        self::PROJECT_TYPE_INTEGRATION,
        self::PROJECT_TYPE_OTHER,
    ];

    protected $fillable = [
        'customer_id', 'contact_request_id', 'name', 'project_type', 'description', 'status',
        'start_date', 'expected_completion_date', 'completed_at',
        'quoted_value', 'currency', 'internal_notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'expected_completion_date' => 'date',
            'completed_at' => 'datetime',
            'quoted_value' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * The contact request this engagement was born from — always set
     * explicitly by an admin, never auto-linked.
     */
    public function contactRequest(): BelongsTo
    {
        return $this->belongsTo(ContactRequest::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(Milestone::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'project_service');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    // ── Product scoping ──────────────────────────────────────────────

    /**
     * Projects inherit the tenant boundary through their customer (the
     * customer's product_id is the anchor). A project with no customer,
     * or whose customer is global (product_id null), is visible to every
     * scoped admin.
     */
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        return $query->where(fn ($q) => $q->whereNull('customer_id')
            ->orWhereHas('customer', fn ($q2) => $q2->whereNull('product_id')
                ->orWhereIn('product_id', $user->products()->pluck('products.id'))));
    }

    public function isAccessibleBy(User $user): bool
    {
        return Customer::userCanAccess($this->customer?->product_id, $user);
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }
}
