<?php

namespace App\Domains\Content\Models;

use App\Domains\Product\Models\Product;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentationCategory extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'product_id',
        'parent_id',
        'slug',
        'title_en',
        'title_ar',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    public function articles(): HasMany
    {
        return $this->hasMany(DocumentationArticle::class, 'category_id')->orderBy('sort_order');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('title_en');
    }

    public function scopeForProduct($query, ?string $productId)
    {
        return $query->where('product_id', $productId);
    }
}
