<?php

namespace App\Domains\Search\DTOs;

readonly class SearchResult
{
    public function __construct(
        public string $type,        // 'product' | 'article' | 'career' | 'update'
        public string $id,
        public string $title,
        public ?string $excerpt,
        public string $url,         // frontend-consumable slug path
        public float $rank,        // relevance score from FTS
        public array $meta = [],   // type-specific extras
    ) {}
}
