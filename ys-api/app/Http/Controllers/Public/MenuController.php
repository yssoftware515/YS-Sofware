<?php

namespace App\Http\Controllers\Public;

use App\Domains\Cms\Models\Menu;
use App\Http\Controllers\Controller;
use App\Http\Resources\Public\MenuResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class MenuController extends Controller
{
    /**
     * GET /api/v1/public/menus?location=
     * Returns menus with nested items.
     */
    public function index(): JsonResponse
    {
        $menus = Cache::remember('public:menus:list', 600, fn () =>
            Menu::where('is_active', true)
                ->with(['rootItems' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                    'rootItems.children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
                ->get()
        );

        return response()->json([
            'success' => true,
            'data' => MenuResource::collection($menus),
        ]);
    }

    /**
     * GET /api/v1/public/menus/{location}
     */
    public function show(string $location): JsonResponse
    {
        $menu = Cache::remember("public:menus:{$location}", 600, fn () =>
            Menu::where('location', $location)
                ->where('is_active', true)
                ->with(['rootItems' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
                    'rootItems.children' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
                ->firstOrFail()
        );

        return response()->json([
            'success' => true,
            'data' => new MenuResource($menu),
        ]);
    }
}
