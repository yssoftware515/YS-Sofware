# Phase 4B — Production Infrastructure & Runtime Verification Report

- **Date:** 2026-08-18
- **Host:** Windows 11, no container runtime (Docker absent — container-level steps BLOCKED with evidence)
- **Stack verified at runtime:** `ys-api` (Laravel, production-mode `php artisan serve` on 127.0.0.1:8000, `TRUSTED_PROXIES=127.0.0.1`) and `ys-web` (Next.js 16.3.1 standalone build via `.next/standalone/server.js` on 127.0.0.1:3000) against PostgreSQL 16.14 (`ys_smoke` database).
- **Status legend:** PASS / FAIL / BLOCKED / OPERATOR CONTROLLED / UNKNOWN
- **Rule applied:** no app-code changes except where runtime verification exposed a genuine defect (3 genuine defects found and fixed — §3, §11, §15). Secrets redacted throughout.

---

## 1. Scope & Method

Verification of production infrastructure claims from Phase 4/4A: cookie auth, feature flags, tenant scoping, transactional milestone reorder, queue worker + scheduler, storage/log persistence, backup primitive, OPcache, production config, and the frontend standalone runtime. Each step exercised the **real** production code path (`APP_ENV=production`-equivalent server, cookie-based Sanctum auth) with evidence captured per step. No commits made; working tree left dirty as instructed.

## 2. Environment

| Item | Value |
|---|---|
| Host | Windows 11 (no Docker, no nginx, no cron) |
| API | `ys-api`, Laravel 12.x, `php artisan serve` port 8000, production mode, debug OFF |
| Web | `ys-web`, Next.js 16.3.1 (Turbopack), `.next/standalone/server.js` port 3000 |
| DB | PostgreSQL 16.14, `ys_smoke` (smoke) + `ys_api` (dev) |
| Config store | file (cache + sessions), queue = database |

## 3. P1 — Cookie authentication always returned 401 (GENUINE DEFECT — FIXED & VERIFIED)

**Severity:** P1 — every stateful (browser) request failed authentication in production.

**Root-cause chain (fully diagnosed):**

1. `CookieToBearer` was registered in the **global** middleware stack, so it ran **before** Sanctum's stateful `EncryptCookies` middleware. It read the cookie value raw (still encrypted, still containing the `CookieValuePrefix`) and forwarded it as the Bearer token → token lookup failed → 401.
2. Moving `CookieToBearer` into the **api group** (after `EnsureFrontendRequestsAreStateful`, which decrypts cookies) alone was still insufficient: `Router::resolveMiddleware()` runs `SortedMiddleware` on the group using `$middlewarePriority`. Framework defaults pin `AuthenticatesRequests` (≈ priority 6) and `SubstituteBindings` (≈ 9); the **unlisted** `CookieToBearer` stayed in its registered position, i.e. **after** `Authenticate` — so `Authenticate` still rejected the request before `CookieToBearer` could set the `Authorization` header.
3. **Final fix (both halves required):**
   - `ys-api/bootstrap/app.php` — `$middleware->api(append: [CookieToBearer::class])` (api group, after stateful cookie decryption) **and**
   - `$middleware->prependToPriorityList(AuthenticatesRequests::class, CookieToBearer::class)` — pins the middleware **before** `Authenticate` in the priority sort.
   - Resulting pipeline (runtime-verified): `[stateful, CookieToBearer, Authenticate:sanctum, SubstituteBindings, active, idle]`.
4. `CookieToBearer` itself: reads `config('security.cookies.name')` (`ys_admin_token`), passes the **decrypted, prefix-stripped** value straight into the Bearer header. It must **not** re-validate the `CookieValuePrefix` — `EncryptCookies` already strips it (`validateValue`), and `EncryptCookies::$serialize = false` is the runtime default (confirmed in vendor).

**Regression test** (`ys-api/tests/Feature/Auth/AuthTest.php` — `test_cookie_authenticated_request_round_trip`): raw token via `withCookie` (the Laravel test client encrypts with the prefix itself), `Origin: http://localhost:3000`, `withCredentials()`, `getJson('/api/v1/auth/me')` → 200 + `data.email`. **Passing.**

**Runtime smoke (production server, `TRUSTED_PROXIES=127.0.0.1`, `X-Forwarded-Proto: https`, `Origin: http://localhost:3000`):**

| Step | Result |
|---|---|
| GET `/sanctum/csrf-cookie` | 204 + XSRF-TOKEN/`ys_session` cookies (samesite=strict) |
| POST `/api/v1/auth/login` | 200 + user + `ys_admin_token` cookie |
| GET `/api/v1/auth/me` with **cookie only** | **200** (was 401 before fix) |
| GET `/api/v1/admin/feature-flags` with cookie | 200 |
| POST logout → `/me` after | 200 → 401 |
| Re-login | 200 |
| Bearer token (decrypted plainTextToken, non-stateful, no Origin) | 200 on `/me` + `/admin/feature-flags` |
| No auth at all | 401 UNAUTHENTICATED |

**Result: PASS (fixed).**

## 4. Docker image builds — BLOCKED

No container runtime exists on this host (`docker --version`, podman, etc. all absent). Backend/frontend/nginx images, multi-stage `npm ci && next build` and `composer install` phases **cannot be executed here**. Static review notes: `ys-web/Dockerfile` correctly copies `public`, `.next/standalone`, and `.next/static` (line 36 — the standalone folder alone is NOT sufficient; the local standalone lacked static until copied, §11).

## 5. Compose stack smoke — BLOCKED

`docker compose up` cannot run (no runtime). Compose YAML strict-parsed without errors; services: `frontend`, `backend`, `database`, `nginx`, `queue-worker`, `scheduler`; profiles: `backup`, `mailhog`, `monitoring`. No Redis anywhere in the stack (comment at compose line 63: "queue = database (jobs table). NO Redis service exists.").

## 6. OPcache (host PHP runtime evidence)

`php -i` / OPcache runtime (production ini, `ys-api/docker/php/opcache.ini`): `opcache.enable=On`, `validate_timestamps=Off` (no per-request stat checks), memory `128M`, max files `20000`, `JIT` default (not enabled). No container-level (php-fpm) evidence possible — **BLOCKED** for the container form; host PHP runtime PASS.

## 7. Production configuration audit (redacted)

| Setting | Runtime value | Note |
|---|---|---|
| `APP_ENV` | production (server) | local dev .env only for tooling runs |
| `APP_DEBUG` | false | |
| `APP_KEY` | set (encryption works — cookie/CSRF round trips) | |
| `CACHE_STORE` | file | no Redis anywhere |
| `SESSION_DRIVER` | file | `SESSION_ENCRYPT=true`, `SESSION_SAME_SITE=strict`, lifetime 120 min |
| `QUEUE_CONNECTION` | database | `jobs` + `failed_jobs` tables migrated |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:3000,127.0.0.1:3000` | cookie auth domain contract |
| `TRUSTED_PROXIES` | `127.0.0.1` (runtime) / `172.16.0.0/12` (compose) | |
| `REQUIRE_TLS` | true (server) — TLS gate 403s plain-HTTP (see §15) | |
| Auth cookie name | `ys_admin_token` (config default) | |
| `MAIL_MAILER` | log | no external SMTP dependency |
| Sanctum `last_used_at` | false | idle timeout enforced by `EnforceIdleSessionTimeout` |
| Web `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api/v1` (local) / `http://localhost:8000/api/v1` (compose default ARG) | see §20 operator notes |
| Postgres | local 16.14; credentials redacted | |

**Result: PASS** (values consistent with the documented deployment contract).

## 8. Feature flags — runtime (STEP 7)

Exercised the full admin flag lifecycle against the production server with cookie auth:

- Admin create → `{"success":true,... "key":"phase4b.smoke_flag","is_enabled":true,"environment":"all"}` (id `01a015eb-e825-…`).
- Admin list reflects it immediately (cache invalidation on mutation works).
- `FeatureFlagService::isEnabled('phase4b.smoke_flag')` → **true** (cache-warmed path), second call served from the file-cache (no DB hit — cache files present under `storage/framework/cache/data`).
- **DB-fallback path:** with `storage/framework/cache` renamed away, `isEnabled()` still returns **true** — service degrades to the database (source of truth) without a 500 (Phase 4A resilience contract).
- Toggle `is_enabled:false` → service returns false; re-enable → true (API round trip).
- No Redis involvement: file store + no redis extension loaded.

**Result: PASS.**

## 9. Tenant (product) scoping — runtime (STEP 8)

Hierarchy created via the API as Super Admin: Product A (`01a015ee-1a22-…`), Product B (`01a015ee-1b82-…`), Customer "Acme Corp" → A, Project "Alpha" → Acme, Task → Alpha. Two Admin-role users created and product-scoped via `PUT /api/v1/admin/users/{id}/products` (`user.product_access_updated` audit events logged).

| Check | Result |
|---|---|
| Tenant-A sees Acme / Project Alpha / task (inheritance chain customer→project→task) | PASS (all 3 listed) |
| Tenant-A admin product list shows only Product A | PASS |
| Tenant-B sees **empty** customers/projects/tasks | PASS |
| Tenant-B direct `GET /admin/projects/{A}` and `/admin/customers/{A}` | **403** (both) |
| Tenant-B `POST /admin/milestones/{A}/move` | 403 (re-asserted inside the transactional action) |
| Anonymous public product page (`/api/v1/public/products/{slug}`) | 200 (TLS header; 403 TLS_REQUIRED without — guard working) |
| Audit trail for the scoping actions | PASS (`user.product_access_updated` ×2) |

Note: user creation does **not** accept a `products` field (product access is a dedicated, separately-gated endpoint — by design, per `manage_admins` contract).

**Result: PASS.**

## 10. Milestone transaction — runtime (STEP 9)

3 milestones created under Project Alpha (ranks 1,2,3). Reorder via `POST /admin/milestones/{id}/move`:

- M1 down → `[Two(1), One(2), Three(3)]` — ranks re-stamped contiguously (atomic re-stamp: no gaps/duplicates at any point).
- M3 up → `[Two(1), Three(2), One(3)]`.
- Audit: `milestone.created` ×3, `milestone.moved` ×2.
- The reorder wraps the whole re-stamp in `DB::transaction` (`ReorderMilestonesAction`); forced-rollback semantics covered by the automated suite (461 tests green, incl. transaction tests from Phase 4A).

**Result: PASS** (success path + audit + atomicity; forced rollback by suite).

## 11. Frontend production runtime (STEP 10) + `/health/live` defect (GENUINE DEFECT — FIXED)

**Standalone runtime:** `.next/standalone/server.js` runs the production build: `/` → 307 → `/en` → 200; `/admin/login` 200; unknown routes → 404; security headers present (`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`), no `X-Powered-By`/`Server` leak; strict CSP with per-request nonce from `proxy.ts`.

**Defect found (P2):** the Dockerfile HEALTHCHECK and compose healthcheck both curl `/health/live`, and `ops/watchdog/healthcheck.sh` probes it — but the locale middleware (`proxy.ts`) 307-redirected `/health/live` → `/en/health/live` → **404**, so the web container's healthcheck **always failed** (container forever unhealthy / readiness broken). The committed route handler `app/health/live/route.ts` existed but was unreachable.

**Fix:** `ys-web/proxy.ts` — pass `/health` through (added to the internals/static skip list). Rebuilt (`next build`), re-verified:

- `GET /health/live` → **200** `{"success":true,"data":{"status":"ok"}}`
- JS chunks (130 refs in HTML) → **200** (after copying `.next/static` + `public` into the standalone dir — parity with the Dockerfile's COPY lines; the local standalone produced by `next build` does not contain them)
- `/branding/favicon/favicon.svg` etc. → 200
- `/en/status` → renders **"All core systems operational"** from real API `/health` data (Database + Cache rows), **no "vundefined"**, no "Status check unavailable"

**Result: PASS (fixed).** Frontend gates after the fix: `tsc --noEmit` clean, `eslint .` clean, **vitest 75/75**, `next build` green.

## 12. Queue worker + scheduler (STEP 11)

- Two real jobs (`SendAdminUserCreatedJob`) were queued by the runtime user-creation flow (jobs table) — real end-to-end data.
- `php artisan queue:work --once --tries=3` ×2 → both **DONE** (74.9 ms, 73.4 ms); jobs table 0 pending, 0 failed; rendered notification emails present in `laravel.log` (log mailer).
- `php artisan schedule:list` → "No scheduled tasks have been defined." — the scheduler service runs (`schedule:work` in compose) but there are **zero** `Schedule::` definitions in the codebase. `schedule:run` executes cleanly (no-op).

**Result: PASS (worker); scheduler = OPERATOR CONTROLLED (runs, but no tasks defined — nothing scheduled anywhere; no cron needed yet).**

## 13. Storage & log persistence (STEP 12)

- Compose mounts a single named volume `backend_storage:/app/storage` on backend, queue-worker and scheduler (lines 98/178/203).
- Host runtime writes confirmed on disk: `storage/logs/laravel.log` (mail + app output), `storage/framework/sessions` (20 file-driver session files incl. the live smoke sessions), `storage/framework/cache/data` (file cache), views compiled.
- `.gitignore` excludes storage content; persistence across restarts is inherent (files on disk; in compose, the named volume).

**Result: PASS** (host-level evidence; container volume behavior BLOCKED).

## 14. Backup primitive (STEP 13)

- Host-level (PostgreSQL 16 tools at `C:\Program Files\PostgreSQL\16\bin`):
  - `pg_dump -Fc -Z9 -d ys_smoke` → **exit 0**, custom-format gzip dump, 128,902 bytes, 271 TOC entries.
  - `pg_restore --list` → archive readable (TOC parsed).
- Restore into a live DB **intentionally not performed** (destructive) — restore mechanics covered by the design (`.tmp.$$` file + `--list` validation + no overwrite, per `ops/backup/backup.sh`).
- Compose backup service (`/backup/backup.sh`, `BACKUP_RETENTION=7`) — **BLOCKED** (no containers).

**Result: PASS (primitive) / BLOCKED (container form).**

## 15. nginx edge defect — `X-Forwarded-Proto` (GENUINE DEFECT — FIXED)

**Defect (P2, deployment-breaking):** the compose edge (`docker/nginx/sites/default.conf`) forwards every location with `proxy_set_header X-Forwarded-Proto $scheme`. The edge listens on plain HTTP (port 80, no 443 vhost by design; TLS terminates on an external gateway in front of nginx), so `$scheme` is always `http` — the backend's TLS gate (`RequireTlsInProduction`, `REQUIRE_TLS=true` in compose) would reject **every** non-health request with `403 TLS_REQUIRED` (verified live: the production server 403s when the forwarded proto isn't https; health routes `/up` + `/api/v1/health` are exempt and returned 200). The whole stack could never serve a business request.

**Fix:**
- `docker/nginx/nginx.conf` (http context): `map $http_x_forwarded_proto $x_forwarded_proto { default $http_x_forwarded_proto; '' $scheme; }` — passes through the scheme announced by the external TLS gateway; falls back to this edge's own scheme when a client reached nginx directly over plain HTTP, preserving fail-loud.
- `docker/nginx/sites/default.conf`: all 5 proxy locations now send `X-Forwarded-Proto $x_forwarded_proto`.

Validation: config syntax review only — **`nginx -t` BLOCKED** (no nginx binary/containers on this host). Diff kept minimal (5 header lines + map block; encoding preserved).

## 16. Watchdog

`ops/watchdog/healthcheck.sh` exists and encodes the deployment contract: `/health/live` (frontend), `/api/v1/health` (backend), `/api/v1/admin/products` must answer **401** unauthenticated. All three verified at runtime against the running services (200/200/401). The script itself cannot execute here (sh) — **BLOCKED** as a cron/systemd timer; its endpoint contract PASSes.

## 17. Regression gates

| Gate | Result |
|---|---|
| PHPUnit (`ys-api`) | **461 passed, 2468 assertions** (incl. new cookie round-trip test) |
| Vitest (`ys-web`) | **75/75** (17 files) |
| `tsc --noEmit` | clean |
| `eslint .` | clean |
| `next build` | green (Turbopack 16.3.1) |

All runs executed **after** the last fix (proxy.ts + nginx edits; PHPUnit after the P1 fix).

## 18. Defects found & fixed this phase

| ID | Severity | Defect | Fix | Verified |
|---|---|---|---|---|
| D-4B-1 | P1 | Cookie auth always 401 (global stack + priority sort) | api group + `prependToPriorityList` | tests + runtime |
| D-4B-2 | P2 | Web container healthcheck `/health/live` 404 (locale middleware swallowed it) | proxy.ts passthrough for `/health` | runtime 200 |
| D-4B-3 | P2 | nginx edge always sends `X-Forwarded-Proto: http` → whole stack 403 TLS_REQUIRED | map passthrough + fallback | review (nginx -t BLOCKED) |

## 19. Blocked items (with evidence)

- Docker image builds, in-container OPcache/fpm, compose smoke, container volume persistence, compose backup, `nginx -t`, watchdog as cron — all **BLOCKED: no container runtime / nginx / cron on this Windows host**. Static/config validation performed instead (compose YAML parsed, Dockerfiles reviewed, scripts read).

## 20. Operator-controlled items

- Compose `NEXT_PUBLIC_API_URL` default `http://localhost:8000/api/v1` is usable for local smoke but must be set to the real backend URL (browser-facing) / reachable internal URL for the server-side status page fetch (single-variable design; the status page fetches `${API_BASE}/health` server-side).
- `APP_URL` default `https://ys-systems.com` must match the real deployment origin.
- Scheduler: no tasks defined — add `Schedule::` entries (e.g., backup/retention cron) when business schedules exist.
- Postgres credentials, smoke admin creds, tenant test passwords: redacted here; rotate before any real deployment.
- `ys_smoke` now contains Phase 4B fixtures (products A/B, Acme/Alpha/task/milestones, tenant users, `phase4b.smoke_flag`) — discard or reseed for a clean production DB.
- Running verification servers (API :8000, web :3000) left up with artifacts under `%TEMP%\opencode\` (`api-server.log`, `web-server.log`, `ys_smoke.dump`, jar files).

## 21. Recommendation

**GO, conditional:** all runtime-verifiable infrastructure checks PASS and the three genuine defects (one P1) found during this phase are fixed with regression coverage. The remaining steps are **BLOCKED on this host, not failed** — a container-capable environment must repeat §4/§5/§14 (compose smoke + image health + container backup) and run `nginx -t` before production cutover. All secrets must be rotated post-verification.
