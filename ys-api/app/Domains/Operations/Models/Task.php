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
 * Task — a unit of executable work inside a project (engagement
 * delivery). Deliberately NOT:
 *   - a CRM lead/opportunity (the YS-CRM boundary),
 *   - a project in itself,
 *   - an unscheduled to-do: the model carries an explicit status,
 *     priority and (optionally) a due date.
 */
class Task extends Model
{
    use HasFactory, HasUuids;

    public const STATUS_TODO = 'todo';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_BLOCKED = 'blocked';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_TODO,
        self::STATUS_IN_PROGRESS,
        self::STATUS_BLOCKED,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    public const PRIORITY_LOW = 'low';

    public const PRIORITY_NORMAL = 'normal';

    public const PRIORITY_HIGH = 'high';

    public const PRIORITY_URGENT = 'urgent';

    public const PRIORITIES = [
        self::PRIORITY_LOW,
        self::PRIORITY_NORMAL,
        self::PRIORITY_HIGH,
        self::PRIORITY_URGENT,
    ];

    protected $fillable = [
        'project_id', 'title', 'description', 'status', 'priority',
        'due_date', 'completed_at', 'created_by',
    ];

    protected $attributes = [
        'status' => self::STATUS_TODO,
        'priority' => self::PRIORITY_NORMAL,
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
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
        return in_array($this->status, [self::STATUS_TODO, self::STATUS_IN_PROGRESS, self::STATUS_BLOCKED], true);
    }

    public function isOverdue(): bool
    {
        return $this->isOpen() && $this->due_date?->lt(Carbon::today()) === true;
    }

    // ── Product scoping ──────────────────────────────────────────────

    /**
     * Tasks inherit the tenant boundary through project → customer.
     * A task whose project has no customer, or whose customer is global,
     * is visible to every scoped admin.
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
