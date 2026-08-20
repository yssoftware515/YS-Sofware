<?php

namespace App\Http\Controllers\Public;

use App\Domains\Content\Models\TimelineEntry;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class TimelineController extends Controller
{
    /**
     * GET /api/v1/public/timeline
     */
    public function index(): JsonResponse
    {
        $entries = TimelineEntry::with('product:id,name_en,name_ar,slug')
            ->public()
            ->ordered()
            ->get();

        $locale = app()->getLocale();

        return response()->json([
            'success' => true,
            'data' => $entries->map(fn ($e) => [
                'id' => $e->id,
                'title' => $locale === 'ar' ? $e->title_ar : $e->title_en,
                'description' => $locale === 'ar' ? $e->description_ar : $e->description_en,
                'event_date' => $e->event_date->toDateString(),
                'type' => $e->type,
                'product' => $e->product ? [
                    'slug' => $e->product->slug,
                    'name' => $locale === 'ar' ? $e->product->name_ar : $e->product->name_en,
                ] : null,
            ]),
        ]);
    }
}
