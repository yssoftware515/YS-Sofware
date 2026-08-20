<?php

namespace App\Http\Controllers\Public;

use App\Domains\Cms\Models\Faq;
use App\Http\Controllers\Controller;
use App\Http\Resources\Public\FaqResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    /**
     * GET /api/v1/public/faqs?category=
     */
    public function index(Request $request): JsonResponse
    {
        $faqs = Faq::published()
            ->when($request->query('category'), fn ($q, $c) => $q->byCategory($c))
            ->ordered()
            ->get();

        return response()->json([
            'success' => true,
            'data' => FaqResource::collection($faqs),
        ]);
    }
}
