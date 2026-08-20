<?php

namespace App\Domains\Search\Contracts;

use App\Domains\Search\DTOs\SearchResultCollection;

/**
 * Search driver abstraction.
 *
 * Current implementation: PostgreSQL FTS with weighted tsvectors.
 * Future swap: Meilisearch driver — zero changes to calling code.
 */
interface SearchDriver
{
    /**
     * @param  string  $query  Raw user input (will be sanitized internally)
     * @param  array<string>  $types  e.g. ['product', 'article', 'career']
     * @param  string  $locale  'en' | 'ar'
     */
    public function search(
        string $query,
        array $types = [],
        string $locale = 'en',
        int $limit = 20,
    ): SearchResultCollection;
}
