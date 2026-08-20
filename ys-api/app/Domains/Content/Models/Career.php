<?php

namespace App\Domains\Content\Models;

use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Career extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'title_en',
        'title_ar',
        'department',
        'location',
        'type',
        'description_en',
        'description_ar',
        'requirements',
        'responsibilities',
        'status',
        'is_featured',
        'sort_order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'requirements' => 'array',
            'responsibilities' => 'array',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeByDepartment($query, string $department)
    {
        return $query->where('department', $department);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('title_en');
    }
}
