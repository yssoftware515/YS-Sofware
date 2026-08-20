<?php

namespace App\Domains\Product\Actions;

use App\Domains\Product\DTOs\CreateProductDTO;
use App\Domains\Product\Models\Product;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class CreateProductAction
{
    public function __construct(
        private readonly SyncProductRelationsAction $sync,
    ) {}

    public function execute(CreateProductDTO $dto): Product
    {
        // Extra guard: slug uniqueness (also enforced at DB level)
        if (Product::where('slug', $dto->slug)->exists()) {
            throw ValidationException::withMessages([
                'slug' => ['A product with this slug already exists.'],
            ]);
        }

        $product = Product::create([
            'slug' => $dto->slug,
            'name_en' => $dto->nameEn,
            'name_ar' => $dto->nameAr,
            'status' => $dto->status,
            'short_desc_en' => $dto->shortDescEn,
            'short_desc_ar' => $dto->shortDescAr,
            'long_desc_en' => $dto->longDescEn,
            'long_desc_ar' => $dto->longDescAr,
            'value_proposition_en' => $dto->valuePropEn,
            'value_proposition_ar' => $dto->valuePropAr,
            'target_audience_en' => $dto->targetAudienceEn,
            'target_audience_ar' => $dto->targetAudienceAr,
            'cover_image_id' => $dto->coverImageId,
            'logo_image_id' => $dto->logoImageId,
            'icon_key' => $dto->iconKey,
            'brand_color' => $dto->brandColor,
            'product_url' => $dto->productUrl,
            'documentation_url' => $dto->documentationUrl,
            'support_url' => $dto->supportUrl,
            'is_featured' => $dto->isFeatured,
            'sort_order' => $dto->sortOrder,
            'seo_meta' => $dto->seoMeta,
            'created_by' => Auth::id(),
        ]);

        if ($dto->features !== null) {
            $this->sync->features($product, $dto->features);
        }
        if ($dto->pricingPlans !== null) {
            $this->sync->pricingPlans($product, $dto->pricingPlans);
        }
        if ($dto->mediaAttachments !== null) {
            $this->sync->media($product, $dto->mediaAttachments);
        }

        return $product->fresh();
    }
}
