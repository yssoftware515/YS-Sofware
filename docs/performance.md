# Performance

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## 1. Backend performance features (✅ verified)

| Feature | Implementation | Notes |
|---|---|---|
| Full-text search | PostgreSQL FTS with GIN indexes (`search_vector_*` generated columns) | O(1)-ish index lookups; `ts_rank_cd` ranking |
| Feature flags | Single Redis key `ys:feature_flags:all`, TTL 300s, atomic-lock rebuild (stampede-safe) | No per-flag lookups |
| Rate limiting | In-memory default / Redis when configured | prevents abuse-driven load |
| Indexes | Composite indexes on the hot query paths (status+sort_order, product_id+release_date, published_at+type, user_id+created_at, etc.) | ✅ migrations |
| Queue | `jobs` table / Redis queue; async email | worker in docker |
| Caching | `Cache::put` for health check only ⚠️; **no general response caching** on backend | ❓ no cache tags per entity |
| N+1 protection | `preventLazyLoading` enabled outside production (dev only) | ✅ AppServiceProvider |
| Pagination | All admin list endpoints paginate (`per_page`) | ✅ |

## 2. Frontend performance features (✅ verified)

| Feature | Implementation |
|---|---|
| ISR | Public GETs revalidate every 60s (`lib/api/client.ts`) |
| Static assets | Nginx `expires 1y` + immutable for js/css/png/… |
| Image optimization | `next/image` (avif/webp formats), remote patterns for API storage |
| Compression | Next.js `compress: true` + nginx gzip |
| Fonts | Google Fonts via CSS @import (⚠️ render-blocking without next/font) |
| Bundle | No bundle analysis tool configured ❓ |
| Animations | framer-motion with `prefers-reduced-motion` respect |

## 3. Search performance (✅ PostgresSearchDriver)

- One query per type (up to 4), each filtered by visibility + `search_vector @@ websearch_to_tsquery`; merged + sorted + limited. Uses GIN indexes. `websearch_to_tsquery` handles user input safely (no injection) and supports basic operators. Query cap: 500 chars, limit param.

## 4. Observations & risks (⚠️)

| # | Observation | Severity |
|---|---|---|
| P-1 | Backend has **no response caching** for public endpoints (settings, menus, products…) — every page load hits the DB. The 60s ISR on the frontend mitigates this for SSR pages, but API clients (search, contact) always hit DB. | Medium |
| P-2 | `latestRelease()` relationship uses `limit(1)` inside a HasMany — no join-subquery; works but fires per-product on listings (⚠️ potential N+1 on product lists with releases; mitigated by `preventLazyLoading` in dev only). | Low |
| P-3 | Admin dashboard fires 8 parallel fetches per render (widgets) — 2 will 404 (see known-issues). | Low |
| P-4 | Frontend `Promise.allSettled` in public layout: slow API adds latency to every page render (60s revalidate softens). | Low |
| P-5 | Grafana container exists but no dashboards/datasources provisioned — no real metrics visibility. | Medium (ops) |
| P-6 | No Laravel OPcache/session driver tuning docs; `SESSION_DRIVER` from env. Redis used for cache; sessions driver unverified in .env values. | ❓ |
| P-7 | `websearch_to_tsquery` is CPU-cheap, but 4 separate queries per search; fine at this scale. | Low |
| P-8 | Frontend bundle: `lib/platform` (191 files) imported by admin only (admin layout) — public bundle unaffected ✅. | OK |

## 5. Benchmarks ❓

No load tests, no profiling data exist in the repo. ❓
