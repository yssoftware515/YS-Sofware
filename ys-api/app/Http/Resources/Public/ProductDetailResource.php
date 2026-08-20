<?php

namespace App\Http\Resources\Public;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = app()->getLocale();

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $locale === 'ar' ? $this->name_ar : $this->name_en,
            'short_desc' => $locale === 'ar' ? $this->short_desc_ar : $this->short_desc_en,
            'long_desc' => $locale === 'ar' ? $this->long_desc_ar : $this->long_desc_en,
            'value_proposition' => $locale === 'ar' ? $this->value_proposition_ar : $this->value_proposition_en,
            'target_audience' => $locale === 'ar' ? $this->target_audience_ar : $this->target_audience_en,
            'status' => $this->status,
            'current_version' => $this->current_version,
            'is_featured' => $this->is_featured,
            'icon_key' => $this->icon_key,
            'brand_color' => $this->brand_color,
            // Destination URLs — presented as Launch / Docs / Support
            // buttons on the public page. Null until the product has its
            // own site / docs (this platform never hosts product code).
            'product_url' => $this->product_url,
            'documentation_url' => $this->documentation_url,
            'support_url' => $this->support_url,
            'cover_image' => $this->whenLoaded('coverImage', fn () => $this->coverImage ? [
                'url' => $this->coverImage->url,
                'alt' => $locale === 'ar'
                    ? $this->coverImage->alt_text_ar
                    : $this->coverImage->alt_text_en,
            ] : null),
            'logo_image' => $this->whenLoaded('logoImage', fn () => $this->logoImage ? [
                'url' => $this->logoImage->url,
                'alt' => $locale === 'ar'
                    ? $this->logoImage->alt_text_ar
                    : $this->logoImage->alt_text_en,
            ] : null),
            'features' => $this->whenLoaded('features', fn () => $this->features->map(fn ($f) => [
                'title' => $locale === 'ar' ? $f->title_ar : $f->title_en,
                'description' => $locale === 'ar' ? $f->description_ar : $f->description_en,
                'sort_order' => $f->sort_order,
            ])),
            'pricing_plans' => $this->whenLoaded('pricingPlans', fn () => $this->pricingPlans->map(fn ($p) => [
                'name' => $locale === 'ar' ? $p->name_ar : $p->name_en,
                'pricing_type' => $p->pricing_type,
                'price' => $p->price, // decimal string or null
                'currency' => $p->currency,
                'billing_cycle' => $p->billing_cycle,
                'is_featured' => $p->is_featured,
                'sort_order' => $p->sort_order,
            ])),
            'media' => $this->whenLoaded('mediaAttachments', fn () => $this->mediaAttachments->map(fn ($m) => [
                'url' => $m->media?->url,
                'alt' => $locale === 'ar' ? $m->media?->alt_text_ar : $m->media?->alt_text_en,
                'kind' => $m->kind,
                'sort_order' => $m->sort_order,
            ])),
            'latest_release' => $this->whenLoaded('latestRelease', function () use ($locale) {
                // latestRelease is a hasOne relation — a single model or null.
                $release = $this->latestRelease;
                if (! $release) {
                    return null;
                }

                return [
                    'version' => $release->version,
                    'release_date' => $release->release_date->toDateString(),
                    'notes' => $locale === 'ar'
                        ? $release->release_notes_ar
                        : $release->release_notes_en,
                ];
            }),
            'seo' => [
                'title' => $this->seo_meta['title_'.$locale]
                    ?? ($locale === 'ar' ? $this->name_ar : $this->name_en),
                'description' => $this->seo_meta['description_'.$locale]
                    ?? ($locale === 'ar' ? $this->short_desc_ar : $this->short_desc_en),
            ],
        ];
    }
}
