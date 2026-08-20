<?php

namespace App\Http\Controllers\Public;

use App\Domains\Cms\Models\HomepageSection;
use App\Http\Controllers\Controller;
use App\Http\Resources\Public\HomepageSectionResource;
use Illuminate\Http\JsonResponse;

class HomepageSectionController extends Controller
{
    /**
     * GET /api/v1/public/homepage-sections
     * Returns all enabled homepage sections in order.
     */
    public function index(): JsonResponse
    {
        $sections = HomepageSection::enabled()->ordered()->get();

        return response()->json([
            'success' => true,
            'data' => HomepageSectionResource::collection($sections),
        ]);
    }
}
