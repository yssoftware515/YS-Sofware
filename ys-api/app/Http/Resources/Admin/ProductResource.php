<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name_en' => $this->name_en,
            'name_ar' => $this->name_ar,
            'short_desc_en' => $this->short_desc_en,
            'short_desc_ar' => $this->short_desc_ar,
            'long_desc_en' => $this->long_desc_en,
            'long_desc_ar' => $this->long_desc_ar,
            'value_proposition_en' => $this->value_proposition_en,
            'value_proposition_ar' => $this->value_proposition_ar,
            'target_audience_en' => $this->target_audience_en,
            'target_audience_ar' => $this->target_audience_ar,
            'status' => $this->status,
            'current_version' => $this->current_version,
            'cover_image_id' => $this->cover_image_id,
            'logo_image_id' => $this->logo_image_id,
            'icon_key' => $this->icon_key,
            'brand_color' => $this->brand_color,
            'product_url' => $this->product_url,
            'documentation_url' => $this->documentation_url,
            'support_url' => $this->support_url,
            'is_featured' => $this->is_featured,
            'sort_order' => $this->sort_order,
            'seo_meta' => $this->seo_meta,
            // Same fix as Public\ProductResource: whenLoaded() confirms the
            // relation was queried, not that the related row exists.
            'cover_image' => $this->whenLoaded('coverImage', fn () => $this->coverImage ? [
                'id' => $this->coverImage->id,
                'url' => $this->coverImage->url,
                'alt' => $this->coverImage->alt_text_en,
            ] : null),
            'logo_image' => $this->whenLoaded('logoImage', fn () => $this->logoImage ? [
                'id' => $this->logoImage->id,
                'url' => $this->logoImage->url,
                'alt' => $this->logoImage->alt_text_en,
            ] : null),
            'features' => $this->whenLoaded('features', fn () => $this->features->map(fn ($f) => [
                'id' => $f->id,
                'title_en' => $f->title_en,
                'title_ar' => $f->title_ar,
                'description_en' => $f->description_en,
                'description_ar' => $f->description_ar,
                'sort_order' => $f->sort_order,
            ])),
            'pricing_plans' => $this->whenLoaded('pricingPlans', fn () => $this->pricingPlans->map(fn ($p) => [
                'id' => $p->id,
                'name_en' => $p->name_en,
                'name_ar' => $p->name_ar,
                'pricing_type' => $p->pricing_type,
                'price' => $p->price,
                'currency' => $p->currency,
                'billing_cycle' => $p->billing_cycle,
                'is_featured' => $p->is_featured,
                'sort_order' => $p->sort_order,
            ])),
            'media' => $this->whenLoaded('mediaAttachments', fn () => $this->mediaAttachments->map(fn ($m) => [
                'id' => $m->id,
                'media_id' => $m->media_id,
                'kind' => $m->kind,
                'sort_order' => $m->sort_order,
                // Avoid crash when the referenced media row was deleted
                'url' => $m->media?->url,
                'alt' => $m->media?->alt_text_en,
            ])),
            'releases_count' => $this->whenLoaded('releases', fn () => $this->releases->count()),
            // created_by is nullable with ->nullOnDelete() (see products
            // migration) — if the creating admin's account is later
            // deleted, this legitimately becomes null, not just "not
            // loaded". Same crash risk as cover_image above.
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
