<?php

namespace App\Http\Controllers\Public;

use App\Domains\Content\Models\Career;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CareerController extends Controller
{
    /**
     * GET /api/v1/public/careers?department=
     */
    public function index(Request $request): JsonResponse
    {
        $careers = Career::open()
            ->when($request->query('department'), fn ($q, $d) => $q->byDepartment($d))
            ->ordered()
            ->get();

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

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $career->id,
                'title' => $locale === 'ar' ? $career->title_ar : $career->title_en,
                'department' => $career->department,
                'location' => $career->location,
                'type' => $career->type,
                'description' => $locale === 'ar' ? $career->description_ar : $career->description_en,
                'requirements' => $career->requirements,
                'responsibilities' => $career->responsibilities,
            ],
        ]);
    }
}
