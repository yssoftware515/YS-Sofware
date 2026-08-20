<?php

namespace App\Domains\Search\DTOs;

use Illuminate\Support\Collection;

readonly class SearchResultCollection
{
    /** @param Collection<int, SearchResult> $results */
    public function __construct(
        public Collection $results,
        public int $total,
        public string $query,
        public string $driver, // 'postgres' | 'meilisearch'
        public float $tookMs,
    ) {}

    public function isEmpty(): bool
    {
        return $this->results->isEmpty();
    }

    /** Group results by type for frontend rendering */
    public function groupedByType(): Collection
    {
        return $this->results->groupBy('type');
    }
}
