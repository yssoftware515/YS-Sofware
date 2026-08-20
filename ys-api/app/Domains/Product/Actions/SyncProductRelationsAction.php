<?php

namespace App\Domains\Product\Actions;

use App\Domains\Product\Models\Product;
use App\Domains\Product\Models\ProductMedia;
use App\Domains\Product\Models\ProductPricingPlan;

/**
 * Synchronizes the admin-maintained child lists of a product
 * (features, pricing plans, media attachments). Full-replace semantics —
 * the payload from the admin UI is the complete list, which keeps the
 * API simple and the audit trail honest (one updated event per product).
 */
class SyncProductRelationsAction
{
    public function features(Product $product, array $items): void
    {
        $product->features()->delete();

        foreach ($items as $index => $item) {
            $product->features()->create([
                'title_en' => $item['title_en'],
                'title_ar' => $item['title_ar'],
                'description_en' => $item['description_en'] ?? null,
                'description_ar' => $item['description_ar'] ?? null,
                'sort_order' => $item['sort_order'] ?? $index,
            ]);
        }
    }

    public function pricingPlans(Product $product, array $items): void
    {
        $product->pricingPlans()->delete();

        foreach ($items as $index => $item) {
            $product->pricingPlans()->create([
                'name_en' => $item['name_en'],
                'name_ar' => $item['name_ar'],
                'pricing_type' => $item['pricing_type'] ?? ProductPricingPlan::TYPE_FIXED,
                // Money discipline — normalize to a 2-decimal string before
                // it reaches the decimal(12,2) column.
                'price' => isset($item['price'])
                    ? number_format((float) $item['price'], 2, '.', '')
                    : null,
                'currency' => strtoupper($item['currency'] ?? 'USD'),
                'billing_cycle' => $item['billing_cycle'] ?? null,
                'is_featured' => (bool) ($item['is_featured'] ?? false),
                'sort_order' => $item['sort_order'] ?? $index,
            ]);
        }
    }

    public function media(Product $product, array $items): void
    {
        $product->mediaAttachments()->delete();

        foreach ($items as $index => $item) {
            $product->mediaAttachments()->create([
                'media_id' => $item['media_id'],
                'kind' => $item['kind'] ?? ProductMedia::KIND_GALLERY,
                'sort_order' => $item['sort_order'] ?? $index,
            ]);
        }
    }
}
