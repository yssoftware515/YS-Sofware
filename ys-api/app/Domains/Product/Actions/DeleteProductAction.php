<?php

namespace App\Domains\Product\Actions;

use App\Domains\Product\Models\Product;
use Illuminate\Validation\ValidationException;

class DeleteProductAction
{
    public function execute(Product $product): void
    {
        // Prevent deletion of active/beta products as a safety guard
        if (in_array($product->status, ['active', 'beta'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Cannot delete an active or beta product. Archive it first.'],
            ]);
        }

        $product->delete(); // Soft delete — data preserved, audit log captures it
    }
}
