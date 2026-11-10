# Backend (ys-api)

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown
Laravel 12 · PHP ^8.4 · PostgreSQL · Sanctum 4 · mews/purifier

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
| `HtmlSanitizerService` | `Purifier::clean($html, 'cms')` — single write-time sanitization boundary; used by service descriptions and settings |
| `MediaUploadService` | Server-side MIME sniffing, size limit (default 10 MB), blocked-extension + double-extension guards, UUID filenames, `Storage::putFileAs`, Media row + `uploaded_by` |

## 4. Search (✅ verified)

- Interface `SearchDriver::search(query, types, locale, limit)`; `SearchService` owns locale fallback and limit clamping (`SearchRules`: 2–200 query, 1–50 limit, default 20).
- `PostgresSearchDriver` — one bounded query per type (`service`, `page`, `faq`) with SQL-side `LIMIT` pushdown and real `COUNT` totals over `services`, `static_pages`, `faqs`; deterministic URL-based ordering; parameter binding + escaped `LIKE` patterns.
- Types/locales come from the `SearchType`/`SearchLocale` enums — no duplicated allow-lists anywhere.
- Search exposed at `GET /api/v1/public/search` with dedicated throttle `search` (60/min).

## 5. Jobs & Queue (✅ verified)

| Job | Notes |
|---|---|
| `SendContactRequestNotificationJob` | ShouldBeUnique (`contact-notification-{id}`), tries 3, timeout 30s, backoff 60s; guards missing model by releasing back to queue; sends `emails.contact-notification` to `config('mail.admin_address')` (env `MAIL_ADMIN_ADDRESS` — REQUIRED; logs + skips when unset) |
| `SendAdminUserCreatedJob` | Sent after admin user creation; dispatches `emails.admin-welcome` with plaintext initial password |

Both dispatched with `afterCommit()`. Queue connection configurable (`QUEUE_CONNECTION`); docker-compose runs `php artisan queue:work --sleep=3 --tries=3 --max-time=3600`.

## 6. Controllers — conventions (✅ verified)

- **Admin:** every method begins with `$this->authorize('permission_string')`. Row visibility is permission-gated only (no tenant/product scoping).
- **Public:** read-only listings with strict visibility scoping (published/active only).
- `apiResource` used for services, customers, projects, tasks, milestones, users, roles; complex resources (contact-requests, settings, audit-logs) use explicit route definitions.
- Pagination: `per_page` query param, `{success, data, meta:{current_page,last_page,total}}` shape.

## 7. Observers (✅ verified)

- `ServiceObserver` — audit-log service changes (via `AuditService::logModelChange`).

## 8. Configuration files

See [configuration.md](configuration.md). Backend-specific: `config/security.php` (rate limits, upload allow-list/blocked extensions, session TTLs), `config/sanctum.php`, `config/cors.php`, `config/purifier.php` (`cms` profile), `config/mail.php` (incl. `admin_address`).

## 9. Testing (✅ verified)

- `tests/TestCase.php` — RefreshDatabase + helpers (`actingAsRole`, `actingAsSuperAdmin`, `assertApiSuccess`, `assertApiError`).
- 359 tests / 1313 assertions across Feature + Unit suites (2026-11-10 run), including search service/driver, permissions, audit, search pushdown and migration-from-empty checks.
- Factories for every persisted model. Coverage tooling configured in `phpunit.xml`. `pint` available for formatting (dev).
- CI runs `php artisan test` against a Postgres service (see [deployment.md](deployment.md)).

## 10. Notable design decisions (✅ verified from code comments + implementation)

1. Factory namespace resolution override (`AppServiceProvider`) for `Database\Factories\{Model}Factory`.
2. `preventSilentlyDiscardingAttributes` + `preventLazyLoading` enabled outside production.
3. UUID PKs everywhere (users, roles, services, customers, …) — `HasUuids`; `uuidMorphs` for Sanctum tokens to keep Postgres types consistent.
4. RLS on `audit_logs` + Eloquent immutability guards (update/delete throw).
5. Permission-gated row visibility only; the product-scoped pivot was removed with the Product domain.
6. Passwords: `hashed` cast (bcrypt — Laravel's default driver; no hashing config file exists; `BCRYPT_ROUNDS` applies).
7. Admin password policy: `min:12 + confirmed` on user creation (✅ `UserController@store`); login validation allows `min:8` (⚠️ mismatch, documented in [security.md](security.md)).
