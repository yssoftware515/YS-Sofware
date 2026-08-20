<?php

namespace App\Http\Controllers\Public;

use App\Domains\Services\Models\Service;
use App\Http\Controllers\Controller;
use App\Http\Resources\Public\ServiceDetailResource;
use App\Http\Resources\Public\ServiceResource;
use Illuminate\Http\JsonResponse;

class ServiceController extends Controller
{
    /**
     * GET /api/v1/public/services
     */
    public function index(): JsonResponse
    {
        $services = Service::with('coverImage')
            ->public()
            ->ordered()
            ->get();

        return response()->json([
            'success' => true,
            'data' => ServiceResource::collection($services),
        ]);
    }

    /**
     * GET /api/v1/public/services/{slug}
     */
    public function show(string $slug): JsonResponse
    {
        $service = Service::with('coverImage')
            ->public()
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new ServiceDetailResource($service),
        ]);
    }
}
