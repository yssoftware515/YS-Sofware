<?php

namespace App\Domains\Product\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One structured capability of a product (bilingual title + optional
 * short description), rendered as a features grid on the public page.
 */
class ProductFeature extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['product_id', 'title_en', 'title_ar', 'description_en', 'description_ar', 'sort_order'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
