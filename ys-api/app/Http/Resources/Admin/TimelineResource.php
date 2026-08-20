<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimelineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'description_en' => $this->description_en,
            'description_ar' => $this->description_ar,
            'event_date' => $this->event_date->toDateString(),
            'type' => $this->type,
            'is_public' => $this->is_public,
            'sort_order' => $this->sort_order,
            // product_id IS nullable with nullOnDelete (not every
            // milestone is product-specific, e.g. "Founding") —
            // null-checked accordingly.
            'product' => $this->whenLoaded('product', fn () => $this->product ? [
                'id' => $this->product->id,
                'name_en' => $this->product->name_en,
            ] : null),
        ];
    }
}
