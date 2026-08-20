<?php

namespace App\Domains\System\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'disk',
        'path',
        'filename',
        'original_name',
        'mime_type',
        'size',
        'alt_text_en',
        'alt_text_ar',
        'mediable_type',
        'mediable_id',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // ── Accessors ────────────────────────────────────────────────────

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function getHumanSizeAttribute(): string
    {
        $bytes = $this->size;
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 2).' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 2).' KB';
        }

        return $bytes.' B';
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeImages($query)
    {
        return $query->where('mime_type', 'like', 'image/%');
    }
}
