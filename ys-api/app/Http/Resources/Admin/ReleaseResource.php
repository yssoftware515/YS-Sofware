<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReleaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'version' => $this->version,
            'release_date' => $this->release_date->toDateString(),
            'type' => $this->type,
            'release_notes_en' => $this->release_notes_en,
            'release_notes_ar' => $this->release_notes_ar,
            'changelog' => $this->changelog,
            'is_published' => $this->is_published,
            // product_id is required (cascadeOnDelete, not nullable) —
            // safe to access directly once the relation is loaded.
            'product' => $this->whenLoaded('product', fn () => [
                'id' => $this->product->id,
                'name_en' => $this->product->name_en,
                'slug' => $this->product->slug,
            ]),
            // created_by IS nullable with nullOnDelete — null-checked.
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
