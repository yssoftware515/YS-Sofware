<?php

namespace App\Domains\Services\Models;

use App\Domains\Auth\Models\User;
use App\Domains\System\Models\Media;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A company service offered by YS Technologies — the "services" side of
 * the platform, deliberately distinct from SaaS products:
 *
 *   products  → the YS product catalog (Sprint 1 Product domain)
 *   services  → custom work for customers: websites, mobile apps, AI,
 *               automation, UI/UX, branding, integrations, consulting...
 *
 * Pricing is intentionally flexible: most services need a custom
 * quotation (pricing_type = custom_quote), so no fixed price is forced.
 */
class Service extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_INACTIVE, self::STATUS_ARCHIVED];

    public const PRICING_TYPE_CUSTOM_QUOTE = 'custom_quote';

    public const PRICING_TYPE_STARTING_AT = 'starting_at';

    public const PRICING_TYPE_FIXED = 'fixed';

    public const PRICING_TYPE_HOURLY = 'hourly';

    public const PRICING_TYPES = [
        self::PRICING_TYPE_CUSTOM_QUOTE,
        self::PRICING_TYPE_STARTING_AT,
        self::PRICING_TYPE_FIXED,
        self::PRICING_TYPE_HOURLY,
    ];

    public const BILLING_CYCLES = ['per_project', 'per_month', 'per_hour', 'custom'];

    // Admin-only business classification — how this service is sold, so
    // management can group the catalog by delivery channel. NULL = unclassified.
    public const SERVICE_CLASS_CUSTOM = 'custom';

    public const SERVICE_CLASS_PRODUCT = 'product';

    public const SERVICE_CLASS_SUBSCRIPTION = 'subscription';

    public const SERVICE_CLASSES = [
        self::SERVICE_CLASS_CUSTOM,
        self::SERVICE_CLASS_PRODUCT,
        self::SERVICE_CLASS_SUBSCRIPTION,
    ];

    protected $fillable = [
        'slug', 'name_en', 'name_ar', 'category', 'service_class',
        'short_desc_en', 'short_desc_ar', 'description_en', 'description_ar',
        'cover_image_id', 'pricing_type', 'starting_price', 'currency',
        'billing_cycle', 'status', 'is_featured', 'sort_order', 'seo_meta',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'starting_price' => 'decimal:2',
            'is_featured' => 'boolean',
            'seo_meta' => 'array',
        ];
    }

    public function coverImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'cover_image_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePublic($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name_en');
    }
}
