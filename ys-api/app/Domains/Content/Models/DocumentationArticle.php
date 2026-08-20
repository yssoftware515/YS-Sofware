<?php

namespace App\Domains\Content\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentationArticle extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'category_id',
        'slug',
        'title_en',
        'title_ar',
        'content_en',
        'content_ar',
        'version_tag',
        'reading_time_minutes',
        'is_published',
        'sort_order',
        'author_id',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'reading_time_minutes' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────

    public function category(): BelongsTo
    {
        return $this->belongsTo(DocumentationCategory::class, 'category_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('title_en');
    }

    public function scopeForVersion($query, ?string $version)
    {
        if (! $version) {
            return $query;
        }

        return $query->where(function ($q) use ($version) {
            $q->whereNull('version_tag')
                ->orWhere('version_tag', $version);
        });
    }
}
