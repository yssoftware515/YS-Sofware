<?php

namespace App\Http\Controllers\Public;

use App\Domains\Cms\Models\StaticPage;
use App\Http\Controllers\Controller;
use App\Http\Resources\Public\StaticPageResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class StaticPageController extends Controller
{
    /**
     * GET /api/v1/public/pages
     */
    public function index(): JsonResponse
    {
        $pages = Cache::remember('public:pages:list', 300, fn () =>
            StaticPage::published()->ordered()->get()
        );

        return response()->json([
            'success' => true,
            'data' => StaticPageResource::collection($pages),
        ]);
    }

    /**
     * GET /api/v1/public/pages/{slug}
     */
    public function show(string $slug): JsonResponse
    {
        $page = Cache::remember("public:pages:{$slug}", 300, fn () =>
            StaticPage::published()->bySlug($slug)->firstOrFail()->load('cover')
        );

        return response()->json([
            'success' => true,
            'data' => new StaticPageResource($page),
        ]);
    }
}
