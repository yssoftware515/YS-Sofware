<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $locale === 'ar' ? $this->name_ar : $this->name_en,
            'short_desc' => $locale === 'ar' ? $this->short_desc_ar : $this->short_desc_en,
            'description' => $locale === 'ar' ? $this->description_ar : $this->description_en,
            'category' => $this->category,
            'pricing_type' => $this->pricing_type,
            'starting_price' => $this->starting_price,
            'currency' => $this->currency,
            'billing_cycle' => $this->billing_cycle,
            'cover_image' => $this->whenLoaded('coverImage', fn () => $this->coverImage ? [
                'url' => $this->coverImage->url,
                'alt' => $locale === 'ar'
                    ? $this->coverImage->alt_text_ar
                    : $this->coverImage->alt_text_en,
            ] : null),
            'seo' => [
                'title' => $this->seo_meta['title_'.$locale]
                    ?? ($locale === 'ar' ? $this->name_ar : $this->name_en),
                'description' => $this->seo_meta['description_'.$locale]
                    ?? ($locale === 'ar' ? $this->short_desc_ar : $this->short_desc_en),
            ],
        ];
    }
}
