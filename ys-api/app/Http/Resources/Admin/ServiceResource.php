<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name_en' => $this->name_en,
            'name_ar' => $this->name_ar,
            'category' => $this->category,
            // Admin-only business classification — deliberately not part of
            // the public service payload.
            'service_class' => $this->service_class,
            'short_desc_en' => $this->short_desc_en,
            'short_desc_ar' => $this->short_desc_ar,
            'description_en' => $this->description_en,
            'description_ar' => $this->description_ar,
            'cover_image_id' => $this->cover_image_id,
            'pricing_type' => $this->pricing_type,
            // decimal(12,2) back as string — decoded by the frontend as a
            // display string, never float math.
            'starting_price' => $this->starting_price,
            'currency' => $this->currency,
            'billing_cycle' => $this->billing_cycle,
            'status' => $this->status,
            'is_featured' => $this->is_featured,
            'sort_order' => $this->sort_order,
            'seo_meta' => $this->seo_meta,
            'cover_image' => $this->whenLoaded('coverImage', fn () => $this->coverImage ? [
                'id' => $this->coverImage->id,
                'url' => $this->coverImage->url,
                'alt' => $this->coverImage->alt_text_en,
            ] : null),
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
