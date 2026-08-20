<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Product\Actions\CreateProductAction;
use App\Domains\Product\Actions\DeleteProductAction;
use App\Domains\Product\Actions\UpdateProductAction;
use App\Domains\Product\DTOs\CreateProductDTO;
use App\Domains\Product\DTOs\UpdateProductDTO;
use App\Domains\Product\Models\Product;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Product\CreateProductRequest;
use App\Http\Requests\Admin\Product\UpdateProductRequest;
use App\Http\Resources\Admin\ProductResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    public function __construct(
        private readonly CreateProductAction $createProduct,
        private readonly UpdateProductAction $updateProduct,
        private readonly DeleteProductAction $deleteProduct,
    ) {}

    /**
     * GET /api/v1/admin/products
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('manage_products');

        $products = Product::with(['coverImage', 'logoImage', 'features', 'pricingPlans', 'mediaAttachments.media', 'creator'])
            ->ordered()
            // Product-scoping (see User::canAccessProduct docblock): a
            // scoped admin shouldn't even see products outside their
            // access in the list — filtering here, not just blocking
            // show/update/destroy below, closes that info-leak.
            ->when(! Auth::user()->isSuperAdmin(), fn ($q) => $q->whereIn('id', Auth::user()->products()->pluck('products.id'))
            )
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('search'), fn ($q, $search) => $q->where(fn ($sub) => $sub
                ->where('name_en', 'ilike', "%{$search}%")
                ->orWhere('name_ar', 'ilike', "%{$search}%")
                ->orWhere('slug', 'ilike', "%{$search}%")
            )
            )
            ->paginate($this->perPage($request, 15));

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * POST /api/v1/admin/products
     */
    public function store(CreateProductRequest $request): JsonResponse
    {
        $this->authorize('manage_products');

        $product = $this->createProduct->execute(
            CreateProductDTO::fromRequest($request)
        );

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully.',
            'data' => new ProductResource(
                $product->load(['coverImage', 'logoImage', 'features', 'pricingPlans', 'mediaAttachments.media'])
            ),
        ], Response::HTTP_CREATED);
    }

    /**
     * GET /api/v1/admin/products/{product}
     */
    public function show(Product $product): JsonResponse
    {
        $this->authorize('manage_products');
        abort_unless(Auth::user()->canAccessProduct($product), 403, 'You do not have access to this product.');

        return response()->json([
            'success' => true,
            'data' => new ProductResource(
                $product->load(['coverImage', 'logoImage', 'features', 'pricingPlans', 'mediaAttachments.media', 'releases', 'creator'])
            ),
        ]);
    }

    /**
     * PUT /api/v1/admin/products/{product}
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $this->authorize('manage_products');
        abort_unless(Auth::user()->canAccessProduct($product), 403, 'You do not have access to this product.');

        $updated = $this->updateProduct->execute(
            $product,
            UpdateProductDTO::fromArray($request->validated())
        );

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully.',
            'data' => new ProductResource(
                $updated->load(['coverImage', 'logoImage', 'features', 'pricingPlans', 'mediaAttachments.media'])
            ),
        ]);
    }

    /**
     * DELETE /api/v1/admin/products/{product}
     */
    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('manage_products');
        abort_unless(Auth::user()->canAccessProduct($product), 403, 'You do not have access to this product.');

        $this->deleteProduct->execute($product);

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully.',
        ]);
    }
}
