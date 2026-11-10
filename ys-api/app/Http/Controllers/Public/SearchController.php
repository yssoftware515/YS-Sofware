<?php

namespace App\Http\Controllers\Public;

use App\Domains\Search\Enums\SearchLocale;
use App\Domains\Search\Enums\SearchType;
use App\Domains\Search\SearchRules;
use App\Domains\Search\Services\SearchService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SearchController extends Controller
{
    public function __construct(
        private readonly SearchService $search,
    ) {}

    /**
     * GET /api/v1/public/search?q=website&types[]=service&locale=en
     *
     * Validates the HTTP shape only; defaults and bounds live in
     * SearchService/SearchRules. The response envelope is the public
     * contract consumed by the site header search.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:'.SearchRules::MIN_QUERY_LENGTH, 'max:'.SearchRules::MAX_QUERY_LENGTH],
            'types' => ['sometimes', 'array'],
            'types.*' => ['string', Rule::enum(SearchType::class)],
            'locale' => ['sometimes', 'string', Rule::enum(SearchLocale::class)],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:'.SearchRules::MAX_LIMIT],
        ]);

        $results = $this->search->search(
            query: $validated['q'],
            types: $validated['types'] ?? [],
            locale: $validated['locale'] ?? null,
            limit: isset($validated['limit']) ? (int) $validated['limit'] : null,
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
