<?php

namespace App\Domains\Search\Contracts;

use App\Domains\Search\DTOs\SearchResultCollection;
use App\Domains\Search\SearchRules;

/**
 * Search driver abstraction.
 *
 * Current implementation: bounded PostgreSQL ILIKE queries per type.
 * Future swap: Meilisearch driver — zero changes to calling code.
 *
 * Drivers execute the search; request-independent defaults and bounds
 * live in SearchService/SearchRules so they stay consistent everywhere.
 */
interface SearchDriver
{
    /**
     * @param  string  $query  Raw user input (will be sanitized internally)
     * @param  array<string>  $types  SearchType values; [] means every type
     * @param  string  $locale  SearchLocale value ('en' | 'ar')
     */
    public function search(
        string $query,
        array $types = [],
        string $locale = 'en',
        int $limit = SearchRules::DEFAULT_LIMIT,
    ): SearchResultCollection;
}
