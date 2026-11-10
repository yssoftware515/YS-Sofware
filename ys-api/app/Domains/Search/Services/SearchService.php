<?php

namespace App\Domains\Search\Services;

use App\Domains\Search\Contracts\SearchDriver;
use App\Domains\Search\DTOs\SearchResultCollection;
use App\Domains\Search\SearchRules;

/**
 * Application-facing search boundary.
 *
 * Owns the request-independent decisions — locale fallback and limit
 * clamping — so the HTTP layer stays thin and every caller (HTTP today,
 * console/API tomorrow) gets the same guarantees.
 *
 * Execution stays in the SearchDriver: this service never touches the
 * database and adds no queries. Type filtering remains in the driver
 * because it is the component that owns the type → table mapping.
 */
final class SearchService
{
    public function __construct(
        private readonly SearchDriver $driver,
    ) {}

    /**
     * @param  string[]  $types  SearchType values; [] means every type
     */
    public function search(
        string $query,
        array $types = [],
        ?string $locale = null,
        ?int $limit = null,
    ): SearchResultCollection {
        return $this->driver->search(
            query: $query,
            types: $types,
            locale: $locale ?? app()->getLocale(),
            limit: max(1, min($limit ?? SearchRules::DEFAULT_LIMIT, SearchRules::MAX_LIMIT)),
        );
    }
}
