<?php

namespace App\Domains\Product\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A pricing tier presented on the product's public page. Presentation
 * only — the company platform explicitly does NOT perform billing; the
 * actual subscription/billing system belongs to the product itself.
 *
 * Money: price is decimal(12,2), cast to string. Never a float.
 */
class ProductPricingPlan extends Model
{
    use HasFactory, HasUuids;

    public const TYPE_FIXED = 'fixed';

    public const TYPE_STARTING_AT = 'starting_at';

    public const TYPE_CUSTOM_QUOTE = 'custom_quote';

    public const TYPE_FREE = 'free';

    public const PRICING_TYPES = [
        self::TYPE_FIXED,
        self::TYPE_STARTING_AT,
        self::TYPE_CUSTOM_QUOTE,
        self::TYPE_FREE,
    ];

    public const CYCLES = ['monthly', 'yearly', 'one_time', 'per_project'];

    protected $fillable = [
        'product_id', 'name_en', 'name_ar', 'pricing_type',
        'price', 'currency', 'billing_cycle', 'is_featured', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_featured' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
