<?php

namespace App\Domains\Content\Models;

use App\Domains\Product\Models\Product;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimelineEntry extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'title_en',
        'title_ar',
        'description_en',
        'description_ar',
        'event_date',
        'type',
        'product_id',
        'is_public',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'is_public' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderByDesc('event_date');
    }
}
