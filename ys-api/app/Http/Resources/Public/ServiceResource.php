<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Minimal, localized service data for listing pages.
 * Never exposes admin-only fields.
 */
class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $locale === 'ar' ? $this->name_ar : $this->name_en,
            'short_desc' => $locale === 'ar' ? $this->short_desc_ar : $this->short_desc_en,
            'category' => $this->category,
            'pricing_type' => $this->pricing_type,
            // Nullable for custom-quote services — display layer handles it.
            'starting_price' => $this->starting_price,
            'currency' => $this->currency,
            'billing_cycle' => $this->billing_cycle,
            'is_featured' => $this->is_featured,
            'cover_image' => $this->whenLoaded('coverImage', fn () => $this->coverImage ? [
                'url' => $this->coverImage->url,
                'alt' => $locale === 'ar'
                    ? $this->coverImage->alt_text_ar
                    : $this->coverImage->alt_text_en,
            ] : null),
        ];
    }
}
