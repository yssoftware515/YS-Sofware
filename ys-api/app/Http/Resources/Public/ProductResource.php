<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Minimal product data for listing pages.
 * Never exposes admin-only fields.
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $locale === 'ar' ? $this->name_ar : $this->name_en,
            'short_desc' => $locale === 'ar' ? $this->short_desc_ar : $this->short_desc_en,
            'status' => $this->status,
            'current_version' => $this->current_version,
            'is_featured' => $this->is_featured,
            'icon_key' => $this->icon_key,
            'brand_color' => $this->brand_color,
            // NOTE: whenLoaded() only checks that the relation was QUERIED
            // (via with('coverImage') in the controller), not that a
            // related row actually exists. Most products won't have a
            // cover image set — $this->coverImage is null for those, and
            // the old version of this closure crashed with a fatal error
            // trying to read ->url off of null. The null check here is
            // load-bearing, not decorative.
            'cover_image' => $this->whenLoaded('coverImage', fn () => $this->coverImage ? [
                'url' => $this->coverImage->url,
                'alt' => $locale === 'ar'
                    ? $this->coverImage->alt_text_ar
                    : $this->coverImage->alt_text_en,
            ] : null),
        ];
    }
}
