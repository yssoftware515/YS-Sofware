<?php

namespace App\Domains\Search\Drivers;

use App\Domains\Search\Contracts\SearchDriver;
use App\Domains\Search\DTOs\SearchResult;
use App\Domains\Search\DTOs\SearchResultCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * PostgreSQL Full-Text Search Driver.
 *
 * Uses GENERATED ALWAYS AS tsvector columns per locale.
 * Uses websearch_to_tsquery() — production-safe, handles arbitrary user input.
 * Uses ts_rank_cd() — cover density ranking, better than ts_rank for short texts.
 *
 * Query complexity: O(log n) via GIN indexes on tsvector columns.
 */
class PostgresSearchDriver implements SearchDriver
{
    /**
     * VULN-19: per-type result queries are bounded in SQL to
     * $limit + margin BEFORE hydration, so a single type with thousands
     * of matches never drags its full result set into PHP. The margin
     * guarantees the merged global top-$limit is always a subset of the
     * hydrated candidates: each type contributes at most its top
     * (limit + margin) rows, and we only ever keep $limit.
     */
    private const PER_TYPE_MARGIN = 5;

    // Map locale to PostgreSQL text search configuration
    private const LOCALE_CONFIG = [
        'en' => 'english',
        'ar' => 'arabic',
    ];

    public function search(
        string $query,
        array $types = [],
        string $locale = 'en',
        int $limit = 20,
    ): SearchResultCollection {
        $start = microtime(true);

        // Defense-in-depth: the locale interpolates into SQL column
        // names, so it must be a whitelisted value — never a fallback.
        if (! isset(self::LOCALE_CONFIG[$locale])) {
            throw new \InvalidArgumentException("Unsupported search locale '{$locale}'.");
        }
        $pgConf = self::LOCALE_CONFIG[$locale];

        // Sanitize — websearch_to_tsquery handles injection + syntax errors
        $sanitized = $this->sanitizeQuery($query);
        if (empty($sanitized)) {
            return $this->emptyCollection($query, $start);
        }

        $all = collect();
        $total = 0;
        $active = empty($types)
            ? ['product', 'article', 'career', 'update']
            : $types;

        // Batch by type — one bounded query per type, then merge + rank.
        // This avoids N+1 and allows per-type eager loading. Each batch
        // is already SQL-limited to limit + margin (VULN-19).
        foreach ($active as $type) {
            $batch = match ($type) {
                'product' => $this->searchProducts($sanitized, $pgConf, $locale, $limit),
                'article' => $this->searchArticles($sanitized, $pgConf, $locale, $limit),
                'career' => $this->searchCareers($sanitized, $pgConf, $locale, $limit),
                'update' => $this->searchUpdates($sanitized, $pgConf, $locale, $limit),
                default => ['results' => collect(), 'count' => 0],
            };

            $all = $all->merge($batch['results']);
            $total += $batch['count'];
        }

        // Global rank sort across the bounded per-type candidates.
        // ts_rank_cd frequently produces identical scores (e.g. every
        // single-term match scores 1.0), so ties must break
        // deterministically or the result order is scan-order dependent.
        // Ties keep the documented per-type order (the $active merge
        // order — products first) and then fall back to URL so the
        // output is stable across runs (F-004 stabilization).
        $typeOrder = array_flip(array_values($active));
        $sorted = $all->sort(function (array $a, array $b) use ($typeOrder): int {
            // ts_rank_cd is float4 — rows that "tie" for ranking purposes
            // can still differ in the 10th+ decimal, which would make the
            // tiebreak depend on noise. Compare rounded ranks so practical
            // ties break deterministically below.
            $byRank = round((float) $b['rank'], 6) <=> round((float) $a['rank'], 6);
            if ($byRank !== 0) {
                return $byRank;
            }

            $byType = ($typeOrder[$a['type']] ?? 0) <=> ($typeOrder[$b['type']] ?? 0);
            if ($byType !== 0) {
                return $byType;
            }

            return strcmp($a['url'], $b['url']);
        })->values()->take($limit);

        return new SearchResultCollection(
            results: $sorted->map(fn ($row) => new SearchResult(
                type: $row['type'],
                id: $row['id'],
                title: $row['title'],
                excerpt: $row['excerpt'] ?? null,
                url: $row['url'],
                rank: (float) $row['rank'],
                // json_build_object() returns the json type, which PDO
                // hands to PHP as a STRING — decode it back to an array
                // for the DTO contract.
                meta: json_decode((string) ($row['meta'] ?? '[]'), true) ?: [],
            )),
            // VULN-19: the total comes from real COUNT queries against
            // the same filtered tables — never from hydrating the full
            // match set into PHP.
            total: $total,
            query: $query,
            driver: 'postgres',
            tookMs: round((microtime(true) - $start) * 1000, 2),
        );
    }

    // ── Per-type search queries ──────────────────────────────────────

    /**
     * @return array{results: Collection, count: int}
     */
    private function searchProducts(string $q, string $conf, string $locale, int $limit): array
    {
        $col = "search_vector_{$locale}";

        // Filters only — shared by the bounded SELECT and the COUNT
        // below (both hit the GIN index on the tsvector column).
        $base = DB::table('products')
            ->whereRaw("{$col} @@ websearch_to_tsquery('{$conf}', ?)", [$q])
            ->whereIn('status', ['active', 'beta'])
            ->whereNull('deleted_at');

        $results = (clone $base)
            ->selectRaw("
                'product'           AS type,
                id::text            AS id,
                name_{$locale}      AS title,
                short_desc_{$locale} AS excerpt,
                slug                AS url,
                ts_rank_cd({$col}, websearch_to_tsquery('{$conf}', ?)) AS rank,
                json_build_object('status', status, 'version', current_version) AS meta
            ", [$q])
            ->orderByDesc('rank')
            ->limit($limit + self::PER_TYPE_MARGIN)
            ->get()
            ->map(fn ($r) => (array) $r);

        return ['results' => $results, 'count' => $base->count()];
    }

    /**
     * @return array{results: Collection, count: int}
     */
    private function searchArticles(string $q, string $conf, string $locale, int $limit): array
    {
        $col = "search_vector_{$locale}";

        $base = DB::table('documentation_articles as a')
            ->join('documentation_categories as c', 'a.category_id', '=', 'c.id')
            ->whereRaw("a.{$col} @@ websearch_to_tsquery('{$conf}', ?)", [$q])
            ->where('a.is_published', true)
            ->whereNull('a.deleted_at');

        $results = (clone $base)
            ->selectRaw("
                'article'                   AS type,
                a.id::text                  AS id,
                a.title_{$locale}           AS title,
                LEFT(a.content_{$locale}, 200) AS excerpt,
                a.slug                      AS url,
                ts_rank_cd(a.{$col}, websearch_to_tsquery('{$conf}', ?)) AS rank,
                json_build_object(
                    'category', c.title_{$locale},
                    'reading_time', a.reading_time_minutes
                ) AS meta
            ", [$q])
            ->orderByDesc('rank')
            ->limit($limit + self::PER_TYPE_MARGIN)
            ->get()
            ->map(fn ($r) => (array) $r);

        return ['results' => $results, 'count' => $base->count()];
    }

    /**
     * @return array{results: Collection, count: int}
     */
    private function searchCareers(string $q, string $conf, string $locale, int $limit): array
    {
        $col = "search_vector_{$locale}";

        $base = DB::table('careers')
            ->whereRaw("{$col} @@ websearch_to_tsquery('{$conf}', ?)", [$q])
            ->where('status', 'open')
            ->whereNull('deleted_at');

        $results = (clone $base)
            ->selectRaw("
                'career'             AS type,
                id::text             AS id,
                title_{$locale}      AS title,
                description_{$locale} AS excerpt,
                id::text             AS url,
                ts_rank_cd({$col}, websearch_to_tsquery('{$conf}', ?)) AS rank,
                json_build_object('department', department, 'type', type) AS meta
            ", [$q])
            ->orderByDesc('rank')
            ->limit($limit + self::PER_TYPE_MARGIN)
            ->get()
            ->map(fn ($r) => (array) $r);

        return ['results' => $results, 'count' => $base->count()];
    }

    /**
     * @return array{results: Collection, count: int}
     */
    private function searchUpdates(string $q, string $conf, string $locale, int $limit): array
    {
        $col = "search_vector_{$locale}";

        $base = DB::table('updates')
            ->whereRaw("{$col} @@ websearch_to_tsquery('{$conf}', ?)", [$q])
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->whereNull('deleted_at');

        $results = (clone $base)
            ->selectRaw("
                'update'             AS type,
                id::text             AS id,
                title_{$locale}      AS title,
                LEFT(content_{$locale}, 200) AS excerpt,
                id::text             AS url,
                ts_rank_cd({$col}, websearch_to_tsquery('{$conf}', ?)) AS rank,
                json_build_object('type', type) AS meta
            ", [$q])
            ->orderByDesc('rank')
            ->limit($limit + self::PER_TYPE_MARGIN)
            ->get()
            ->map(fn ($r) => (array) $r);

        return ['results' => $results, 'count' => $base->count()];
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Sanitize user input before passing to websearch_to_tsquery.
     * websearch_to_tsquery is already injection-safe, but we strip
     * control characters and limit length.
     */
    private function sanitizeQuery(string $query): string
    {
        $clean = preg_replace('/[\x00-\x1F\x7F]/u', '', $query);
        $clean = trim($clean);

        return mb_substr($clean, 0, 500);
    }

    private function emptyCollection(string $query, float $start): SearchResultCollection
    {
        return new SearchResultCollection(
            results: collect(),
            total: 0,
            query: $query,
            driver: 'postgres',
            tookMs: round((microtime(true) - $start) * 1000, 2),
        );
    }
}
