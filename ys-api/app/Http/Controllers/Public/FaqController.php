<?php

namespace App\Http\Controllers\Public;

use App\Domains\Cms\Models\Faq;
use App\Http\Controllers\Controller;
use App\Http\Resources\Public\FaqResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class FaqController extends Controller
{
    /**
     * GET /api/v1/public/faqs?category=
     */
    public function index(Request $request): JsonResponse
    {
        $category = $request->query('category');
        $cacheKey = $category ? "public:faqs:list:{$category}" : 'public:faqs:list';

        $faqs = Cache::remember($cacheKey, 600, fn () => Faq::published()
            ->when($category, fn ($q, $c) => $q->byCategory($c))
            ->ordered()
            ->get()
        );

        return response()->json([
            'success' => true,
            'data' => FaqResource::collection($faqs),
        ]);
    }
}
