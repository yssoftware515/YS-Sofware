<?php

namespace App\Domains\Operations\Models;

use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Milestone — an explicit stage marker of a delivery ("Beta ready",
 * "Launch"). Carries its own closed status lifecycle, an optional
 * target date and an ordering. It is an operational marker, not a
 * scheduling tool (no Gantt, no progress percentages).
 */
class Milestone extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_PENDING = 'pending';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_IN_PROGRESS,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'project_id', 'title', 'description', 'status',
        'target_date', 'completed_at', 'sort_order', 'created_by',
    ];

    protected $attributes = [
        'status' => self::STATUS_PENDING,
    ];

    protected function casts(): array
    {
        return [
            'target_date' => 'date',
            'completed_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_IN_PROGRESS], true);
    }

    public function isOverdue(): bool
    {
        return $this->isOpen() && $this->target_date?->lt(Carbon::today()) === true;
    }

    // ── Product scoping ──────────────────────────────────────────────

    /**
     * Milestones inherit the tenant boundary through project → customer,
     * exactly like tasks.
     */
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        return $query->whereHas('project', fn ($q) => $q->whereNull('customer_id')
            ->orWhereHas('customer', fn ($q2) => $q2->whereNull('product_id')
                ->orWhereIn('product_id', $user->products()->pluck('products.id'))));
    }

    public function isAccessibleBy(User $user): bool
    {
        return Customer::userCanAccess($this->project?->customer?->product_id, $user);
    }
}
