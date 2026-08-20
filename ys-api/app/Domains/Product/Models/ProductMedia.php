<?php

namespace App\Domains\Product\Models;

use App\Domains\System\Models\Media;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A media attachment placed on a product page (hero, gallery, or
 * screenshot). Rows in `media` are reusable platform-wide; this pivot
 * records product placement + ordering only.
 */
class ProductMedia extends Model
{
    use HasFactory, HasUuids;

    public const KIND_HERO = 'hero';

    public const KIND_GALLERY = 'gallery';

    public const KIND_SCREENSHOT = 'screenshot';

    public const KINDS = [self::KIND_HERO, self::KIND_GALLERY, self::KIND_SCREENSHOT];

    protected $fillable = ['product_id', 'media_id', 'kind', 'sort_order'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
