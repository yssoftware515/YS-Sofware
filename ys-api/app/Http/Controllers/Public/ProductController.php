<?php

namespace App\Http\Controllers\Public;

use App\Domains\Product\Models\Product;
use App\Http\Controllers\Controller;
use App\Http\Resources\Public\ProductDetailResource;
use App\Http\Resources\Public\ProductResource;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    /**
     * GET /api/v1/public/products
     */
    public function index(): JsonResponse
    {
        $products = Product::with('coverImage')
            ->public()
            ->ordered()
            ->get();

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products),
        ]);
    }

    /**
     * GET /api/v1/public/products/{slug}
     */
    public function show(string $slug): JsonResponse
    {
        $product = Product::with(['coverImage', 'logoImage', 'features', 'pricingPlans', 'mediaAttachments.media', 'latestRelease'])
            ->public()
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new ProductDetailResource($product),
        ]);
    }
}
