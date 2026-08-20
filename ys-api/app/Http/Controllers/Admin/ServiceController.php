<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Services\Models\Service;
use App\Domains\System\Services\HtmlSanitizerService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Services\CreateServiceRequest;
use App\Http\Requests\Admin\Services\UpdateServiceRequest;
use App\Http\Resources\Admin\ServiceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class ServiceController extends Controller
{
    /**
     * GET /api/v1/admin/services
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('view_services');

        $services = Service::with(['coverImage', 'creator'])
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('category'), fn ($q, $category) => $q->where('category', $category))
            ->when($request->query('service_class'), fn ($q, $class) => $q->where('service_class', $class))
            ->when($request->query('search'), fn ($q, $search) => $q->where(fn ($sub) => $sub
                ->where('name_en', 'ilike', "%{$search}%")
                ->orWhere('name_ar', 'ilike', "%{$search}%")
                ->orWhere('slug', 'ilike', "%{$search}%")
            )
            )
            ->ordered()
            ->paginate($this->perPage($request, 15));

        return response()->json([
            'success' => true,
            'data' => ServiceResource::collection($services),
            'meta' => [
                'current_page' => $services->currentPage(),
                'last_page' => $services->lastPage(),
                'per_page' => $services->perPage(),
                'total' => $services->total(),
            ],
        ]);
    }

    /**
     * POST /api/v1/admin/services
     */
    public function store(CreateServiceRequest $request): JsonResponse
    {
        $this->authorize('manage_services');

        $validated = $request->validated();

        // VULN-04: descriptions are markup-capable — sanitize at the
        // write boundary (plain text passes through byte-for-byte).
        $sanitizer = app(HtmlSanitizerService::class);

        // Money discipline — the decimal(12,2) column expects a string,
        // not a float. Normalize before it reaches the model.
        $service = Service::create([
            'slug' => $validated['slug'],
            'name_en' => $validated['name_en'],
            'name_ar' => $validated['name_ar'],
            'category' => $validated['category'] ?? null,
            'service_class' => $validated['service_class'] ?? null,
            'short_desc_en' => $validated['short_desc_en'] ?? null,
            'short_desc_ar' => $validated['short_desc_ar'] ?? null,
            'description_en' => $sanitizer->sanitizeIfHtml($validated['description_en'] ?? null),
            'description_ar' => $sanitizer->sanitizeIfHtml($validated['description_ar'] ?? null),
            'cover_image_id' => $validated['cover_image_id'] ?? null,
            'pricing_type' => $validated['pricing_type'],
            'starting_price' => isset($validated['starting_price'])
                ? number_format((float) $validated['starting_price'], 2, '.', '')
                : null,
            'currency' => strtoupper($validated['currency'] ?? 'USD'),
            'billing_cycle' => $validated['billing_cycle'] ?? null,
            'status' => $validated['status'] ?? Service::STATUS_INACTIVE,
            'is_featured' => (bool) ($validated['is_featured'] ?? false),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'seo_meta' => $validated['seo_meta'] ?? null,
            'created_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Service created successfully.',
            'data' => new ServiceResource($service->load('coverImage')),
        ], Response::HTTP_CREATED);
    }

    /**
     * GET /api/v1/admin/services/{service}
     */
    public function show(Service $service): JsonResponse
    {
        $this->authorize('view_services');

        return response()->json([
            'success' => true,
            'data' => new ServiceResource(
                $service->load(['coverImage', 'creator'])
            ),
        ]);
    }

    /**
     * PUT /api/v1/admin/services/{service}
     */
    public function update(UpdateServiceRequest $request, Service $service): JsonResponse
    {
        $this->authorize('manage_services');

        $validated = $request->validated();

        // Same money discipline as store(): the decimal(12,2) column
        // expects a string, not a float, and currencies are stored in
        // uppercase (e.g. 'usd' → 'USD').
        if (array_key_exists('starting_price', $validated)) {
            $validated['starting_price'] = $validated['starting_price'] !== null
                ? number_format((float) $validated['starting_price'], 2, '.', '')
                : null;
        }
        if (array_key_exists('currency', $validated) && $validated['currency'] !== null) {
            $validated['currency'] = strtoupper($validated['currency']);
        }

        // VULN-04: sanitize markup-capable descriptions on update.
        $sanitizer = app(HtmlSanitizerService::class);
        if (array_key_exists('description_en', $validated)) {
            $validated['description_en'] = $sanitizer->sanitizeIfHtml($validated['description_en']);
        }
        if (array_key_exists('description_ar', $validated)) {
            $validated['description_ar'] = $sanitizer->sanitizeIfHtml($validated['description_ar']);
        }

        $service->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Service updated successfully.',
            'data' => new ServiceResource(
                $service->fresh()->load(['coverImage', 'creator'])
            ),
        ]);
    }

    /**
     * DELETE /api/v1/admin/services/{service}
     */
    public function destroy(Service $service): JsonResponse
    {
        $this->authorize('manage_services');

        // Sanity guard: an active service that customers can currently
        // see should be deliberately taken offline first — switching
        // status to 'inactive' is the intended flow, not a surprise
        // deletion. Archived services delete without friction.
        if ($service->status === Service::STATUS_ACTIVE) {
            return response()->json([
                'success' => false,
                'message' => 'Deactivate this service (status = inactive) before deleting it.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service deleted successfully.',
        ]);
    }
}
