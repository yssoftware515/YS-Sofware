<?php

namespace App\Domains\Operations\Models;

use App\Domains\Auth\Models\User;
use App\Domains\Billing\Models\Customer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContactRequest extends Model
{
    use HasFactory, HasUuids;

    // No soft deletes — contact requests are operational records

    /**
     * "What do you need?" picker shown on the public contact page.
     * The customer picks one; it lands in this column so the admin
     * list can be filtered by request kind.
     */
    public const REQUEST_TYPES = [
        'website',
        'web_platform',
        'mobile_app',
        'saas',
        'ai_solution',
        'ai_agent',
        'automation',
        'crm',
        'ui_ux',
        'branding',
        'custom_software',
        'integration',
        'other',
    ];

    /**
     * How the customer prefers to be reached. Mirrors the public form's
     * "contact method" choice.
     */
    public const CONTACT_PREFERENCES = ['email', 'whatsapp'];

    /** Rough project budget buckets offered on the public form. */
    public const BUDGET_RANGES = ['under_10k', '10k_30k', '30k_100k', 'over_100k', 'flexible'];

    /** Expected project timeline buckets offered on the public form. */
    public const TIMELINES = ['asap', 'one_three_months', 'three_six_months', 'flexible'];

    /**
     * Full status lifecycle of a customer request. Shorter legacy values
     * ('read', 'replied') may still exist in the database and are treated
     * as 'reviewing' by the admin UI.
     */
    public const STATUSES = ['new', 'reviewing', 'contacted', 'in_progress', 'completed', 'archived'];

    protected $fillable = [
        'name',
        'email',
        'company_name',
        'contact_preference',
        'phone',
        'budget_range',
        'timeline',
        'subject',
        'message',
        'details',
        'type',
        'request_type',
        'status',
        'customer_id',
        'ip_address',
        'user_agent',
        'spam_score',
        'handled_by',
        'handled_at',
    ];

    protected function casts(): array
    {
        return [
            'spam_score' => 'float',
            'handled_at' => 'datetime',
            'details' => 'array',
        ];
    }

    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Projects born from this request. One request may produce several
     * engagements; each project points back at most one request.
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'contact_request_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeNew($query)
    {
        return $query->where('status', 'new');
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    // ── Product scoping ──────────────────────────────────────────────

    /**
     * Requests inherit the tenant boundary through their customer link.
     * Unlinked requests (customer_id null) are company-level and stay
     * visible to every scoped admin.
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

    public function isNew(): bool
    {
        return $this->status === 'new';
    }

    /**
     * Legacy statuses ('read', 'replied') from the pre-lifecycle model map
     * onto the current lifecycle so old rows never show as unknown.
     */
    public static function normalizeStatus(string $status): string
    {
        return match ($status) {
            'read', 'replied' => 'reviewing',
            default => in_array($status, self::STATUSES, true) ? $status : 'new',
        };
    }
}
