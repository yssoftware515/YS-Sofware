<?php

namespace App\Domains\System\Models;

use App\Domains\Auth\Models\User;
use App\Domains\Product\Models\Product;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeatureFlag extends Model
{
    use HasUuids;

    protected $fillable = [
        'key',
        'is_enabled',
        'description',
        'product_id',
        'environment',
        'enabled_for',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'enabled_for' => 'array',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Check if flag is enabled for current environment.
     */
    public function isActiveForEnvironment(): bool
    {
        if (! $this->is_enabled) {
            return false;
        }

        return $this->environment === 'all'
            || $this->environment === app()->environment();
    }
}
