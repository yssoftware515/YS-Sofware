<?php

namespace App\Http\Controllers\Public;

use App\Domains\Content\Models\Update;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UpdateController extends Controller
{
    /**
     * GET /api/v1/public/updates?type=&product_id=&page=
     */
    public function index(Request $request): JsonResponse
    {
        $updates = Update::with('product:id,name_en,name_ar,slug')
            ->published()
            ->when($request->query('type'), fn ($q, $t) => $q->ofType($t))
            ->when($request->query('product_id'), fn ($q, $id) => $q->where('product_id', $id))
            ->orderByDesc('published_at')
            ->paginate($this->perPage($request, 10));

        $locale = app()->getLocale();

        return response()->json([
            'success' => true,
            'data' => $updates->map(fn ($u) => [
                'id' => $u->id,
                'title' => $locale === 'ar' ? $u->title_ar : $u->title_en,
                'content' => $locale === 'ar' ? $u->content_ar : $u->content_en,
                'type' => $u->type,
                'is_featured' => $u->is_featured,
                'published_at' => $u->published_at->toIso8601String(),
                'product' => $u->product ? [
                    'slug' => $u->product->slug,
                    'name' => $locale === 'ar' ? $u->product->name_ar : $u->product->name_en,
                ] : null,
            ]),
            'meta' => [
                'current_page' => $updates->currentPage(),
                'last_page' => $updates->lastPage(),
                'total' => $updates->total(),
            ],
        ]);
    }
}
