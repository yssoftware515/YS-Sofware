<?php

namespace App\Http\Controllers\Public;

use App\Domains\Search\Contracts\SearchDriver;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(
        private readonly SearchDriver $search,
    ) {}

    /**
     * GET /api/v1/public/search?q=matrix&types[]=product&locale=en
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
            'types' => ['sometimes', 'array'],
            'types.*' => ['string', 'in:product,article,career,update'],
            'locale' => ['sometimes', 'string', 'in:en,ar'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $results = $this->search->search(
            query: $validated['q'],
            types: $validated['types'] ?? [],
            locale: $validated['locale'] ?? app()->getLocale(),
            limit: $validated['limit'] ?? 20,
        );

        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results->results->values(),
                'grouped' => $results->groupedByType(),
                'meta' => [
                    'total' => $results->total,
                    'query' => $results->query,
                    'took_ms' => $results->tookMs,
                    'driver' => $results->driver,
                ],
            ],
        ]);
    }
}
