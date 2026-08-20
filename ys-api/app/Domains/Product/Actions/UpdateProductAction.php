<?php

namespace App\Domains\Product\Actions;

use App\Domains\Product\DTOs\UpdateProductDTO;
use App\Domains\Product\Models\Product;
use Illuminate\Validation\ValidationException;

class UpdateProductAction
{
    public function __construct(
        private readonly SyncProductRelationsAction $sync,
    ) {}

    public function execute(Product $product, UpdateProductDTO $dto): Product
    {
        $changes = $dto->toArray();

        // Slug uniqueness check — exclude current product
        if (isset($changes['slug'])) {
            $exists = Product::where('slug', $changes['slug'])
                ->where('id', '!=', $product->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'slug' => ['A product with this slug already exists.'],
                ]);
            }
        }

        if (! empty($changes)) {
            $product->update($changes);
        }

        // Child lists use full-replace semantics: a present (even empty)
        // array means "this is now the complete list".
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
