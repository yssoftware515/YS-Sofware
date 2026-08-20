<?php

namespace App\Domains\Cms\Models;

use App\Domains\Auth\Models\User;
use App\Domains\System\Models\Media;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StaticPage extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'slug',
        'title_en',
        'title_ar',
        'excerpt_en',
        'excerpt_ar',
        'content_en',
        'content_ar',
        'seo_title_en',
        'seo_title_ar',
        'seo_description_en',
        'seo_description_ar',
        'cover_media_id',
        'status',
        'published_at',
        'sort_order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'sort_order' => 'integer',
        ];
    }

    public function cover(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'cover_media_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeBySlug($query, string $slug)
    {
        return $query->where('slug', $slug);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('title_en');
    }
}
