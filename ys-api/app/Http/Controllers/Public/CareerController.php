<?php

namespace App\Http\Controllers\Public;

use App\Domains\Content\Models\Career;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CareerController extends Controller
{
    /**
     * GET /api/v1/public/careers?department=
     */
    public function index(Request $request): JsonResponse
    {
        $department = $request->query('department');
        $cacheKey = $department ? "public:careers:list:{$department}" : 'public:careers:list';

        $careers = Cache::remember($cacheKey, 300, fn () =>
            Career::open()
                ->when($department, fn ($q, $d) => $q->byDepartment($d))
                ->ordered()
                ->get()
        );

        $locale = app()->getLocale();

        return response()->json([
            'success' => true,
            'data' => $careers->map(fn ($c) => [
                'id' => $c->id,
                'title' => $locale === 'ar' ? $c->title_ar : $c->title_en,
                'department' => $c->department,
                'location' => $c->location,
                'type' => $c->type,
                'description' => $locale === 'ar' ? $c->description_ar : $c->description_en,
                'is_featured' => $c->is_featured,
            ]),
        ]);
    }

    /**
     * GET /api/v1/public/careers/{id}
     */
    public function show(Career $career): JsonResponse
    {
        if ($career->status !== 'open') {
            abort(404);
        }

        $locale = app()->getLocale();
        $cached = Cache::remember("public:careers:{$career->id}", 300, fn () => [
            'id' => $career->id,
            'title_en' => $career->title_en,
            'title_ar' => $career->title_ar,
            'department' => $career->department,
            'location' => $career->location,
            'type' => $career->type,
            'description_en' => $career->description_en,
            'description_ar' => $career->description_ar,
            'requirements' => $career->requirements,
            'responsibilities' => $career->responsibilities,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $cached['id'],
                'title' => $locale === 'ar' ? $cached['title_ar'] : $cached['title_en'],
                'department' => $cached['department'],
                'location' => $cached['location'],
                'type' => $cached['type'],
                'description' => $locale === 'ar' ? $cached['description_ar'] : $cached['description_en'],
                'requirements' => $cached['requirements'],
                'responsibilities' => $cached['responsibilities'],
            ],
        ]);
    }
}
