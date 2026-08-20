<?php

namespace App\Http\Controllers\Public;

use App\Domains\Content\Models\RoadmapItem;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapController extends Controller
{
    /**
     * GET /api/v1/public/roadmap?product_id=&status=
     */
    public function index(Request $request): JsonResponse
    {
        $items = RoadmapItem::with('product:id,name_en,name_ar,slug')
            ->public()
            ->when($request->query('product_id'), fn ($q, $id) => $q->where('product_id', $id))
            ->when($request->query('status'), fn ($q, $s) => $q->byStatus($s))
            ->ordered()
            ->get();

        $locale = app()->getLocale();

        return response()->json([
            'success' => true,
            'data' => $items->map(fn ($item) => [
                'id' => $item->id,
                'title' => $locale === 'ar' ? $item->title_ar : $item->title_en,
                'description' => $locale === 'ar' ? $item->description_ar : $item->description_en,
                'status' => $item->status,
                'priority' => $item->priority,
                'target_version' => $item->target_version,
                'target_quarter' => $item->target_quarter,
                'product' => $item->product ? [
                    'slug' => $item->product->slug,
                    'name' => $locale === 'ar' ? $item->product->name_ar : $item->product->name_en,
                ] : null,
            ]),
        ]);
    }
}
