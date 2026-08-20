<?php

namespace App\Domains\Product\Models;

use App\Domains\Auth\Models\User;
use App\Domains\System\Models\Media;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'slug',
        'name_en',
        'name_ar',
        'short_desc_en',
        'short_desc_ar',
        'long_desc_en',
        'long_desc_ar',
        'value_proposition_en',
        'value_proposition_ar',
        'target_audience_en',
        'target_audience_ar',
        'status',
        'current_version',
        'cover_image_id',
        'logo_image_id',
        'icon_key',
        'brand_color',
        'product_url',
        'documentation_url',
        'support_url',
        'is_featured',
        'sort_order',
        'seo_meta',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'seo_meta' => 'array',
            'is_featured' => 'boolean',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────

    public function releases(): HasMany
    {
        return $this->hasMany(ProductRelease::class)->orderByDesc('release_date');
    }

    public function latestRelease(): HasOne
    {
        return $this->hasOne(ProductRelease::class)
            ->where('is_published', true)
            ->orderByDesc('release_date');
    }

    public function coverImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'cover_image_id');
    }

    public function logoImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'logo_image_id');
    }

    public function mediaAttachments(): HasMany
    {
        return $this->hasMany(ProductMedia::class, 'product_id')->orderBy('sort_order');
    }

    public function features(): HasMany
    {
        return $this->hasMany(ProductFeature::class, 'product_id')->orderBy('sort_order');
    }

    public function pricingPlans(): HasMany
    {
        return $this->hasMany(ProductPricingPlan::class, 'product_id')->orderBy('sort_order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopePublic($query)
    {
        return $query->whereIn('status', ['active', 'beta', 'planned']);
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
