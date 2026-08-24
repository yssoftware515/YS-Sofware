<?php

namespace App\Http\Controllers\Public;

use App\Domains\Services\Models\Service;
use App\Http\Controllers\Controller;
use App\Http\Resources\Public\ServiceDetailResource;
use App\Http\Resources\Public\ServiceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ServiceController extends Controller
{
    /**
     * GET /api/v1/public/services
     */
    public function index(): JsonResponse
    {
        $services = Cache::remember('public:services:list', 300, fn () =>
            Service::with('coverImage')
                ->public()
                ->ordered()
                ->get()
        );

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
        $service = Cache::remember("public:services:{$slug}", 300, fn () =>
            Service::with('coverImage')
                ->public()
                ->where('slug', $slug)
                ->firstOrFail()
        );

        return response()->json([
            'success' => true,
            'data' => new ServiceDetailResource($service),
        ]);
    }
}
