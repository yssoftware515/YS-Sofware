<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CareerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'department' => $this->department,
            'location' => $this->location,
            'type' => $this->type,
            'description_en' => $this->description_en,
            'description_ar' => $this->description_ar,
            'requirements' => $this->requirements,
            'responsibilities' => $this->responsibilities,
            'status' => $this->status,
            'is_featured' => $this->is_featured,
            'sort_order' => $this->sort_order,
            // Nullable + nullOnDelete on created_by (same pattern as
            // Product::creator) — null-checked for the same reason.
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
