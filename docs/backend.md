# Backend (ys-api)

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown
Laravel 12 · PHP ^8.4 · PostgreSQL · Sanctum 4 · mews/purifier · predis (dormant, optional Redis client)

---

## 1. Application Bootstrap

`bootstrap/app.php` (✅ verified):

- `apiPrefix: 'api/v1'`; only `routes/api.php` exists (no `web.php`, no `console.php`).
- Built-in health route `/up`.
- Global middleware (all requests): `SecurityHeaders` → `ForceJsonResponse` → `CookieToBearer`.
- Alias `active` → `EnsureUserIsActive`.
- `$middleware->statefulApi()` (Sanctum SPA cookies).
- Centralized JSON error rendering (ValidationException→422 `VALIDATION_ERROR`, AuthenticationException→401 `UNAUTHENTICATED`, HttpException→`HTTP_ERROR`, Throwable→500 `SERVER_ERROR`; production hides messages).
- Providers: `AppServiceProvider`, `AuthServiceProvider`.

## 2. Middleware (✅ verified, full behavior)

| Middleware | Behavior |
|---|---|
| `SecurityHeaders` | Sets CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, X-XSS-Protection 0, Referrer-Policy, Permissions-Policy; HSTS only in production; removes X-Powered-By and Server headers |
| `ForceJsonResponse` | Sets `Accept: application/json` on every request |
| `CookieToBearer` | If no Bearer token but cookie `ys_admin_token` present → copies cookie value into `Authorization: Bearer …` |
| `EnsureUserIsActive` | On any authed request: if `is_active=false` → revokes all tokens, 403 `ACCOUNT_DISABLED` |

## 3. Domain Services (✅ verified)

| Service | Purpose |
|---|---|
| `AuditService` | Writes `audit_logs`; `log()` captures action/resource/user/IP/UA/old+new values; `logModelChange()` for observers; `userId` must be passed explicitly in queue jobs (Auth::id() is null there) |
| `FeatureFlagService` | Cache-backed flags under single key `ys:feature_flags:all` (TTL 300s) via the Laravel Cache abstraction (file in production); atomic lock rebuild with stampede protection; graceful DB fallback when the cache is unavailable (Phase 4A, P1-01); `isEnabled`, `isEnabledFor` (role/user targeting), `invalidate`, `warm` |
| `HtmlSanitizerService` | `Purifier::clean($html, 'cms')` — single write-time sanitization boundary; used by product DTOs and doc article actions (✅ verified call sites) |
| `MediaUploadService` | Server-side MIME sniffing, size limit (default 10 MB), blocked-extension + double-extension guards, UUID filenames, `Storage::putFileAs`, Media row + `uploaded_by` |

## 4. Search (✅ verified)

- Interface `SearchDriver::search(query, types, locale, limit)`.
- `PostgresSearchDriver` — one query per type (product/article/career/update), `websearch_to_tsquery` (safe user input), `ts_rank_cd` ranking, EN `english` / AR `arabic` configs, visibility filters (products active/beta; articles published; careers open; updates published), merged + globally sorted + limited, wrapped in `SearchResultCollection` (`groupedByType()` for the frontend).
- Backed by generated `tsvector` columns + GIN indexes (migration 000011).
- Search exposed at `GET /api/v1/public/search` with dedicated throttle `search` (60/min).

## 5. Jobs & Queue (✅ verified)

| Job | Notes |
|---|---|
| `SendContactRequestNotificationJob` | ShouldBeUnique (`contact-notification-{id}`), tries 3, timeout 30s, backoff 60s; guards missing model by releasing back to queue; sends `emails.contact-notification` to `config('mail.admin_address')` (env `MAIL_ADMIN_ADDRESS` — REQUIRED; logs + skips when unset) |
| `SendAdminUserCreatedJob` | Sent after admin user creation; dispatches `emails.admin-welcome` with plaintext initial password |

Both dispatched with `afterCommit()`. Queue connection configurable (`QUEUE_CONNECTION`); docker-compose runs `php artisan queue:work --sleep=3 --tries=3 --max-time=3600`.

## 6. Controllers — conventions (✅ verified)

- **Admin:** every method begins with `$this->authorize('permission_string')`; product-scoped resources additionally call `Auth::user()->canAccessProduct($product)` returning 403 when denied (products, releases, docs categories/articles).
- **Public:** read-only listings with strict visibility scoping (published/open/active only).
- `apiResource` used where applicable; complex resources (docs, faqs, menus, homepage-sections, feature-flags, timeline, contact-requests, settings, media) use explicit route definitions.
- Pagination: `per_page` query param, `{success, data, meta:{current_page,last_page,total}}` shape.

## 7. Observers (✅ verified)

- `ProductObserver` — audit-log product changes (via `AuditService::logModelChange`).
- `ProductReleaseObserver` — audit + keeps `products.current_version` in sync with latest published release.

## 8. Configuration files

See [configuration.md](configuration.md). Backend-specific: `config/security.php` (rate limits, upload allow-list/blocked extensions, session TTLs), `config/sanctum.php`, `config/cors.php`, `config/purifier.php` (`cms` profile), `config/mail.php` (incl. `admin_address`).

## 9. Testing (✅ verified)

- `tests/TestCase.php` — RefreshDatabase + helpers (`actingAsRole`, `actingAsSuperAdmin`, `assertApiSuccess`, `assertApiError`).
- 5 files / 42 methods: `AuthTest` (11), `ProductTest` (8), `DocumentationTest` (8), `PublicEndpointsTest` (9), `ActionTest` (6).
- 11 factories. Coverage tooling configured in `phpunit.xml`. `pint` available for formatting (dev).
- CI runs `php artisan test` against a Postgres service (see [deployment.md](deployment.md)).

## 10. Notable design decisions (✅ verified from code comments + implementation)

1. Factory namespace resolution override (`AppServiceProvider`) for `Database\Factories\{Model}Factory`.
2. `preventSilentlyDiscardingAttributes` + `preventLazyLoading` enabled outside production.
3. UUID PKs everywhere (users, roles, products, …) — `HasUuids`; `uuidMorphs` for Sanctum tokens to keep Postgres types consistent.
4. RLS on `audit_logs` + Eloquent immutability guards (update/delete throw).
5. Fail-closed product scoping: `admin_product_access` pivot; backfilled via data migration 000004.
6. Passwords: `hashed` cast (bcrypt — Laravel's default driver; no hashing config file exists and `PASSWORD_HASH_DRIVER` is read nowhere, removed in Sprint 12 C-7; `BCRYPT_ROUNDS` applies).
7. Admin password policy: `min:12 + confirmed` on user creation (✅ `UserController@store`); login validation allows `min:8` (⚠️ mismatch, documented in [security.md](security.md)).
