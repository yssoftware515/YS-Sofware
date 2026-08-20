# Public Search - Deep Dive

**Source of truth:** `app/Http/Controllers/Public/SearchController.php`, `app/Domains/Search/*`. **Date:** 2026-08-07

> + = verified from source | _ = inferred | ? = unknown

## Endpoint

`GET /api/v1/public/search` (`SearchController` is invokable). Request:
- `q` (required, 2-200 chars)
- `types[]` (optional; values: product, article, career, update)
- `locale` (optional; `en`|`ar`)
- `limit` (optional; 1-50, default 20)

Returns JSON:
```
success / data.result / data.grouped (byType) / meta: total, query, took_ms, driver
```
(verified in controller)

## Driver architecture

- Searches via the `SearchDriver` contract injected into the controller (interface-backed DI). +
- The **PostgresSearchDriver** runs FTS (full-text search) using Postgres `tsvector` + GIN index. `?;` (search [] in config.php driver binding)
- Non-functional when the DB isn't Postgres, i.e. if `DB_CONNECTION=sqlite` (local tests) the driver falls back? Not verified: `=`.

## Result objects

- `SearchResult` / `SearchResultCollection` DTOs in `app/Domains/Search/DTOs` holding doc id, type, title, snippet, score, etc. Conformant with `groupedByType()`, used by SearchController. +
- The controller maps `$results->results->values()` so the JSON is a plain array, not an object keyed by int. +.

## Behavior notes

- No ranking threshold exposed; snippet/summary generation lives in the driver. +
- Locale is a filter (en vs ar), type filter restricted to 4 allowed entities. Product search includes releases filtered by published only? `=`.

## Performance / cache

- No explicit HTTP cache headers on this route. The frontend caches pages (next ISR 60s), not the API. `=`.
- Postgres FTS + GIN is the only search tier (no Meilisearch or Elastic; string in config only). +

## Known limitation

- Only 4 entity types searchable; e.g., docs / timelines / careers pages are not part of `types` filter (career IS there). `?`