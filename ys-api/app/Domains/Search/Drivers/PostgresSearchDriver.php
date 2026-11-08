<?php

namespace App\Domains\Search\Drivers;

use App\Domains\Search\Contracts\SearchDriver;
use App\Domains\Search\DTOs\SearchResult;
use App\Domains\Search\DTOs\SearchResultCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * PostgreSQL search driver for the public site search.
 *
 * Searches only the publicly reachable content: services, static pages
 * and FAQs. Retired type batches (products, documentation articles,
 * careers, updates) were removed together with their public routes in
 * the 2026 cleanup — searching them would return 308-redirect mirrors.
 *
 * The three surviving tables are tiny (dozens of rows), so bounded
 * ILIKE matching is the right tool: no tsvector columns needed, and a
 * trigram index can be added later if the content grows.
 *
 * Contract preserved from the FTS driver era:
 * - Bounded per-type candidate queries before PHP hydration
 * - Deterministic, URL-based tie-breaking (F-004)
 * - Parameter binding everywhere + escaped LIKE patterns (VULN-19)
 */
class PostgresSearchDriver implements SearchDriver
{
    /**
     * VULN-19: per-type result queries are bounded in SQL to
     * $limit + margin BEFORE hydration, so a single type with thousands
     * of matches never drags its full result set into PHP.
     */
    private const PER_TYPE_MARGIN = 5;

    /** Locale whitelist — used to build SQL column names safely. */
    private const LOCALES = ['en', 'ar'];

    public function search(
        string $query,
        array $types = [],
        string $locale = 'en',
        int $limit = 20,
    ): SearchResultCollection {
        $start = microtime(true);

        // Defense-in-depth: the locale interpolates into SQL column
        // names, so it must be a whitelisted value — never a fallback.
        if (! in_array($locale, self::LOCALES, true)) {
            throw new \InvalidArgumentException("Unsupported search locale '{$locale}'.");
        }

        $sanitized = $this->sanitizeQuery($query);
        if (empty($sanitized)) {
            return $this->emptyCollection($query, $start);
        }

        $allowed = ['service', 'page', 'faq'];
        $active = empty($types)
            ? $allowed
            : array_values(array_intersect($allowed, $types));

        if ($active === []) {
            return $this->emptyCollection($query, $start);
        }

        $all = collect();
        $total = 0;

        // Batch by type — one bounded query per type, then merge + rank.
        foreach ($active as $type) {
            $batch = match ($type) {
                'service' => $this->searchServices($sanitized, $locale, $limit),
                'page'    => $this->searchPages($sanitized, $locale, $limit),
                'faq'     => $this->searchFaqs($sanitized, $locale, $limit),
                default   => ['results' => collect(), 'count' => 0],
            };

            $all = $all->merge($batch['results']);
            $total += $batch['count'];
        }

        // Merge + rank: identical rank values (1.0) for LIKE matches, so
        // deterministic order comes from the per-type order then URL
        // comparison — stable across runs (F-004).
        $typeOrder = array_flip($active);
        $sorted = $all->sort(function (array $a, array $b) use ($typeOrder): int {
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
                meta: is_array($row['meta'] ?? null) ? $row['meta'] : [],
            )),
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
    private function searchServices(string $q, string $locale, int $limit): array
    {
        $base = DB::table('services')
            ->where(function ($w) use ($q, $locale) {
                $w->where('name_' . $locale, 'ilike', $this->likePattern($q))
                  ->orWhere('short_desc_' . $locale, 'ilike', $this->likePattern($q));
            })
            ->where('status', 'active')
            ->whereNull('deleted_at');

        $results = (clone $base)
            ->selectRaw("
                'service'             AS type,
                id::text              AS id,
                name_{$locale}        AS title,
                short_desc_{$locale}  AS excerpt,
                ? || slug             AS url,
                1.0                   AS rank,
                json_build_object('category', category) AS meta
            ", ["/{$locale}/services/"])
            ->orderBy('name_' . $locale)
            ->limit($limit + self::PER_TYPE_MARGIN)
            ->get()
            ->map(fn ($r) => (array) $r);

        return ['results' => $results, 'count' => $base->count()];
    }

    /**
     * @return array{results: Collection, count: int}
     */
    private function searchPages(string $q, string $locale, int $limit): array
    {
        $base = DB::table('static_pages')
            ->where(function ($w) use ($q, $locale) {
                $w->where('title_' . $locale, 'ilike', $this->likePattern($q))
                  ->orWhere('excerpt_' . $locale, 'ilike', $this->likePattern($q));
            })
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->whereNull('deleted_at');

        $results = (clone $base)
            ->selectRaw("
                'page'                AS type,
                id::text              AS id,
                title_{$locale}       AS title,
                excerpt_{$locale}     AS excerpt,
                ? || slug             AS url,
                1.0                   AS rank,
                '{}'::json            AS meta
            ", ["/{$locale}/"])
            ->orderBy('title_' . $locale)
            ->limit($limit + self::PER_TYPE_MARGIN)
            ->get()
            ->map(fn ($r) => (array) $r);

        return ['results' => $results, 'count' => $base->count()];
    }

    /**
     * @return array{results: Collection, count: int}
     */
    private function searchFaqs(string $q, string $locale, int $limit): array
    {
        $base = DB::table('faqs')
            ->where(function ($w) use ($q, $locale) {
                $w->where('question_' . $locale, 'ilike', $this->likePattern($q))
                  ->orWhere('answer_' . $locale, 'ilike', $this->likePattern($q));
            })
            ->where('status', 'published')
            ->whereNull('deleted_at');

        $results = (clone $base)
            ->selectRaw("
                'faq'                 AS type,
                id::text              AS id,
                question_{$locale}    AS title,
                LEFT(answer_{$locale}, 200) AS excerpt,
                ?                     AS url,
                1.0                   AS rank,
                json_build_object('category', category) AS meta
            ", ["/{$locale}/faq"])
            ->orderBy('sort_order')
            ->limit($limit + self::PER_TYPE_MARGIN)
            ->get()
            ->map(fn ($r) => (array) $r);

        return ['results' => $results, 'count' => $base->count()];
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * ILIKE pattern with escaped LIKE wildcards (% and _) so arbitrary
     * user input can never widen the match set beyond the intended
     * literal substring. Bound as a parameter — never interpolated.
     */
    private function likePattern(string $q): string
    {
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $q);
        return '%' . $escaped . '%';
    }

    /**
     * Strip control characters and limit length before matching.
     */
    private function sanitizeQuery(string $query): string
    {
        $clean = preg_replace('/[\x00-\x1F\x7F]/u', '', $query);
        $clean = trim((string) $clean);

        return mb_substr($clean, 0, 200);
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
