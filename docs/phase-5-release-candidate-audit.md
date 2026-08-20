# Phase 5 — Release Candidate Audit

- **Date:** 2026-08-18
- **Auditor:** Lead Production Engineer (automated audit session)
- **Audited tree:** `G:\YS_System\YS_System.software` — working tree (last commit `1d4b9ef` 2026-08-17; all Phase 2A–4B work uncommitted, as instructed)
- **Method:** READ-ONLY. Current code is the source of truth. Every conclusion backed by file:line evidence or live runtime evidence. No file modified except this report. No commit, no push.

---

## 1. Executive Summary

The tree is **close** to release but **not yet a Release Candidate**: one genuine **P1 data-isolation defect** remains in the contact-request conversion endpoint (`convertCustomer` bypasses the tenant-accessibility check every sibling method enforces). Two further P2 defects (dead idle-timeout config key masked by a test that asserts the wrong key; unscoped audit-log listing for product-scoped admins) and one P2 test-quality defect (timing-flaky rate-limit test, observed failing once in three runs) must also be resolved before production.

All Phase 3A/4/4B mandatory items re-verified against current code and, where applicable, live runtime: **VERIFIED FIXED** — no regressions found in the previously fixed areas. The Phase 4B fixes (cookie auth, `/health/live`, nginx `X-Forwarded-Proto`) remain correct in the current tree.

**Final verdict: C — NOT RELEASE READY** (one P1 remains). Docker/nginx runtime verification remains operator-controlled (no container runtime on this host) and is **not** the reason for the verdict.

## 2. Scope & Method

- Areas A–U audited (auth/session, RBAC, tenant isolation, API contracts, validation/mass assignment, CSRF/CORS, headers/CSP, error handling, rate limiting, DB integrity, transactions, queue, cache/session/queue config, storage/media, logging, health, frontend runtime, performance, deployment, test quality, docs).
- Mandatory re-verification of Phase 3A (INT-001…005), Phase 4 (15 items), Phase 4B (5 items) against **current** files/tests.
- Regression scan of the working tree (188 changed/untracked entries) for debug code, secrets, bypasses, dead code, stale config.
- Gates re-executed on the current tree: PHPUnit (3 runs), Vitest, `tsc --noEmit`, `eslint .` (Next production build was re-run in Phase 4B against the identical tree — no `ys-web` change since).
- Three independent deep-dive passes (test quality + performance; security; Phase 3A/4 re-verification) plus direct verification of every claimed finding by the auditor.

## 3. Current Tree / Release Candidate State

| Gate | Result (current tree) |
|---|---|
| PHPUnit | **461 passed, 2468 assertions** — 2 of 3 runs; 1 run had a flaky failure (see F-004) |
| Vitest | 75/75 (17 files) |
| TypeScript | clean |
| ESLint | clean |
| Next.js production build | green (Phase 4B, tree unchanged since) |
| Runtime smoke | API :8000 + Web :3000 serving; cookie auth, tenant A=200/B=403, health endpoints verified live |

No secrets in tracked files (`.env*` gitignored); no `dd/dump/var_dump/TODO/FIXME/HACK` in application code; no test-only bypasses; no console debugging left in production paths.

## 4. Previous Phase Verification

| Phase 3A item | Verdict (current code) | Evidence |
|---|---|---|
| INT-001 Menus | VERIFIED FIXED | `Admin/MenuController.php:31-151`, `Public/MenuController.php:16-44`, `SafeUrl` rule, `MenuTest.php` |
| INT-002 Homepage sections | VERIFIED FIXED | `HomepageSectionController` CRUD + TYPES const, factory, `HomepageSectionTest` |
| INT-003 FAQ status | VERIFIED FIXED | `FaqController` status Rule::in, `CreateFaqAction` default published, `FaqStatusTest` |
| INT-004 Permissions | VERIFIED FIXED | `User::hasPermission`/`Role::grantsSuperAdmin` (`User.php:81-95`, `Role.php:35-38`), `RoleController` guards, `RoleAccessTest` (10 cases) |
| INT-005 Search | VERIFIED FIXED | `PostgresSearchDriver.php` LIMIT pushdown + real COUNT (`:133,:137,:166,:170,:195,:199,:225,:229`) |

| Phase 4 item | Verdict | Evidence |
|---|---|---|
| Redis removal / cache abstraction | VERIFIED FIXED (runtime); **P3 residue: `predis/predis` still in composer.json require (F-005)** | No redis driver configured; file/database stores; `DeploymentConfigConsistencyTest` |
| FeatureFlagService fallback | VERIFIED FIXED | `FeatureFlagService.php:47-60,121-129,154-166`; `FeatureFlagCacheTest` incl. DB fallback |
| Documentation product_id scoping | VERIFIED FIXED | `DocumentationController.php:42-45,66-68,84-86,115-117,137-140,178-181,197-199,210-212,250-252` |
| Milestone transaction | VERIFIED FIXED | `ReorderMilestonesAction.php:36-63` + `:34`; `MilestoneTest.php:220,245` rollback tests |
| Audit log index/cache | VERIFIED FIXED | `2026_08_18_000001_*.php:17` created_at index; `AuditLogController` paginate 25 |
| OPcache configuration | VERIFIED FIXED | `docker/php/opcache.ini` (enable=1, validate_timestamps=0, 128M); `Dockerfile:43` |
| Status version fix | VERIFIED FIXED | `status/page.tsx` — real `/health` data only; no `vundefined` anywhere |
| client.ts revalidate | VERIFIED FIXED | `client.ts:33` default 60s; search/contact/admin `revalidate: 0` |
| settings / audit-log error handling | VERIFIED FIXED | `admin/settings/page.tsx:44-48,103-120`; `admin/audit-logs/page.tsx:19-21,31,65-72` |
| production-safe .env.example | VERIFIED FIXED w/ doc gaps (F-006) | No real secrets; `APP_DEBUG=false`; `SESSION_IDLE_TIMEOUT_HOURS`; `AUTH_COOKIE_*` |

| Phase 4B item | Verdict | Evidence |
|---|---|---|
| Cookie authentication | VERIFIED FIXED | `bootstrap/app.php:36-59` (api group + priority pin); `CookieToBearer.php` passthrough; runtime: cookie-only `/auth/me` 200; `AuthTest::test_cookie_authenticated_request_round_trip` |
| `/health/live` | VERIFIED FIXED | `proxy.ts` `/health` passthrough; `app/health/live/route.ts`; runtime 200 `{"status":"ok"}` |
| nginx forwarded-proto | VERIFIED FIXED (inspection) | `nginx.conf` map + 5× `$x_forwarded_proto` in `default.conf`; `nginx -t` still operator-required |
| Contact CSRF + queue flow | VERIFIED FIXED | runtime: XSRF POST → `SendContactRequestNotificationJob` DONE; `ContactTest` honeypot + validation |
| Tenant A/B access | VERIFIED FIXED | runtime: A=200 (customer/project/task), B=403 direct + empty lists; `B2BProductScopingTest` |

## 5. Regression Audit

- **Working tree scan:** 188 entries — all accounted for as Phase 2A–4B deliverables (docs, tests, remediation). No unrelated-file tampering found.
- **Debug/dead code:** no `dd/dump/var_dump/print_r/ray/console.log` in production paths (console.error only in labeled catch handlers). No TODO/FIXME/HACK (only `STATUS_TODO` constants and phone placeholders).
- **Secrets:** none in tracked files; `.env` files ignored; `.env.example` uses placeholders only.
- **Test bypasses:** none (`APP_ENV=testing` checks absent from app code).
- **Stale config:** `composer.json` still requires `predis/predis` (F-005); `bootstrap/cache/services.php` (git-ignored, generated) contains Redis service bindings — irrelevant at image build (Dockerfile deletes the cache).
- **Duplicated logic:** none found across domains; actions/services are single-purpose.

## 6. Security Gate

### 6.1 Authentication & Sessions — PASS
- `LoginAction`: Turnstile fail-closed before user lookup, dummy-bcrypt timing equalizer, per-IP + per-email limiters (SHA-256 keys), escalating lockout tiers (`LoginAction.php:152-186`); tests: `LoginEscalationTest`, `TurnstileLoginTest`, `AccountEnumerationTest`.
- Tokens: 8h/30d TTLs; logout revokes; idle timeout enforced (`EnforceIdleSessionTimeout`) — **config key defect F-002**.
- Cookie: HttpOnly, SameSite=Lax, Secure defaults to production (`AuthController.php:229`), CHIPS-partitionable; token never in response body.
- Session: encrypted (`SESSION_ENCRYPT=true`), file driver, strict same-site.

### 6.2 Authorization / RBAC — PASS
- Closed `Permission` enum; `Gate::before` super-admin; permission-subset rule on role create/update; `'*'` not assignable/removable; slug immutable; super-admin account protected (`UserController.php:121,133,147-161`); `syncProducts` subset rule (`:205-211`); tests: `UserPrivilegeEscalationTest` (11), `RoleAccessTest` (10), `PermissionCoverageTest`.

### 6.3 Tenant Isolation — **FAIL (F-001)**
- Customers/projects/tasks/milestones/subscriptions/docs/feature-flags scoped consistently (accessibleBy/isAccessibleBy/canAccessProduct) — **except `ContactRequestController::convertCustomer` (F-001)**.
- Runtime evidence holds: Tenant A sees own chain; Tenant B 403 on direct access; search cannot bypass scope (`ProductScopedContentSearchTest`).

### 6.4 CSRF/XSRF/CORS — PASS (config), coverage gap (F-009a)
- Stateful detection via Sanctum; XSRF token required on cookie-authenticated mutations (runtime-verified); CORS: single explicit `FRONTEND_URL` origin, `supports_credentials`, no wildcards; SameSite=Lax neutralizes cross-site state changes.
- **No automated negative tests** for CORS/CSRF (F-009a).

### 6.5 Mass Assignment — PASS
- Exhaustive check: every model has explicit `$fillable`; no `$request->all()` reaches create/update; DTO/validator whitelists; `service_ids` explicit sync. **Negative extra-field tests missing** (F-009b).

### 6.6 IDOR/BOLA — FAIL (F-001); all other object-bound routes checked
- `convertCustomer` is the only route-model-bound mutation without an accessibility assertion.

### 6.7 Rate Limiting — PASS (implementation), F-004 (flaky test)
- `throttle:auth` (captcha-aware), per-user `throttle:admin` (`AppServiceProvider.php:109-130`), per-IP public/search/contact/forgot, per-email contact 2/h, escalating lockout, edge nginx zones (GAP-04).

### 6.8 Headers/CSP — PASS
- API `SecurityHeaders`: CSP `script-src 'self'`, HSTS prod-only, no `X-Powered-By`/`Server`, X-Frame-Options DENY, X-Content-Type-Options nosniff.
- Web `proxy.ts`: nonce-based CSP + `strict-dynamic`, no `unsafe-inline` in script-src; nonce consumed by `app/layout.tsx:54-59`; `next.config.ts` image remotePatterns restricted to `/storage/**`.
- Runtime-verified headers on both services.

### 6.9 Error Handling — PASS
- Unified JSON error shape (`bootstrap/app.php:92-142`); generic production 500; `APP_DEBUG=false` default; no stack/credential leakage; 429 preserved; `FailedJobController` truncates exceptions, never returns payload.

### 6.10 Queue / Jobs — PASS
- Jobs carry IDs only (`SendAdminUserCreatedJob`, `SendContactRequestNotificationJob`), `ShouldBeUnique`, `afterCommit` at dispatch, guard clauses. **afterCommit/unique/retry behavior untested** (F-009e).

### 6.11 File/Media — PASS
- Server-side MIME detection, 10MB cap, blocked extensions + double-extension check, UUID filenames, full SVG sanitization (`LIBXML_NONET`, DOCTYPE rejection, attribute/element blocklist); delete-blocked-while-referenced.

### 6.12 Public Surface — PASS
- All public controllers filter published/active/public; docs child-node product scoping enforced (`Public/DocumentationController.php:26`); contact honeypot; search scoped by product + published state.

## 7. Authentication & Session Gate

Covered in §6.1. Additional evidence: `AuthCookieTest` (Unit, defensive branch), `IdleSessionTimeoutTest` (7), `LoginTimingOracleTest` (2), `RequireTlsTest` (5), `TrustedProxyRateLimitTest` (3). Missing: bearer+cookie coexistence test (F-009c), CSRF-negative tests (F-009a).

## 8. Authorization & Tenant Isolation Gate

Covered in §6.2/§6.3. Missing negative test: documentation **article** cross-product 403 (F-009g); audit-log RLS enforcement test (F-009f).

## 9. API Contract Gate

- Public contracts pinned by `HealthContractTest` (health shape), `FaqContractTest` (bilingual admin contract), frontend zod-schema boundary tests (`admin-faq/customer/project`, `api-client`, `admin-error-surfaces`, `admin-menu-items`, `search-state`) — behavior-level assertions, no implementation coupling (one justified SQL-internals test: `SearchLimitPushdownTest`).
- Missing: `/up` contract test (F-009d) — the deployment healthcheck path has zero automated coverage.

## 10. Data Integrity & Transaction Gate

- Milestone reorder: `DB::transaction` re-stamp + rollback tests (forced mid-operation failure, audit rollback) — the only transaction coverage.
- Contact conversion: single transaction create+link, unique-index final authority on races (`ContactRequestController.php:153-189`) — good.
- Unique constraints and FKs present; `audit_logs` RLS migration exists but owner-bypass caveat is operator-verified only (F-008).

## 11. Queue/Cache/Storage Gate

- Queue: database connection, `jobs`/`failed_jobs` tables, worker runtime-verified (2 job classes processed, 0 failed). No retry/delete UI (by design).
- Cache: file store; FeatureFlagService degradation runtime-verified; array store in tests.
- Sessions: file driver, encrypted.
- Storage: named volume on backend/worker/scheduler; runtime writes confirmed; backup primitive verified (`pg_dump -Fc -Z9` → `pg_restore --list`); container backup operator-required.

## 12. Frontend Runtime Gate

- Standalone production server verified in Phase 4B (locale redirects, 404 handling, security headers, JS chunks + static assets, admin login page, status page with live health data, no `vundefined`).
- Public pages: parallel fetches (`Promise.allSettled`), Next fetch dedupe; contact page has a mild 2-step sequential fetch (F-011 — INFO).
- Admin: TanStack Query dedupe, `staleTime: 30s`, loading/error states present (`products/page.tsx:75-80` etc.).
- 401/403 surfaces: login redirect on admin routes (proxy.ts); API 401 → client rejection before schema validation (contract test).

## 13. Performance Gate

- **F-010a (P3):** Dashboard ≈ 30–35 SQL statements per load (`DashboardService.php`); only the audit count is cached; scoped admins repeat `products()->pluck()` per count block. Bounded lists, eager loading present, no N+1.
- **F-010b (P3):** Unbounded public lists: products index, docs tree, roadmap, timeline (`->get()` without limit/pagination); updates is the only paginated public list. Cheap at current catalog scale.
- **F-010c (P3):** Missing indexes on tenant-anchor FKs (`customers.product_id`, `contact_requests.customer_id`) and filter columns (`timeline_entries.product_id`, `updates(product_id, published_at)`, `projects.expected_completion_date`).
- Search: LIMIT pushdown + real COUNT + GIN vectors — good. Admin data never stale-cached (revalidate: 0) — good.

## 14. Error Handling Gate

- Backend: unified shape; production-generic 500s; validation `VALIDATION_ERROR`; rate limit `RATE_LIMIT_EXCEEDED`; 404s; no leakage.
- Frontend: settings/audit-log/FAQ load+save errors surfaced (not silent); public pages degrade with labeled messages ("Status check unavailable", etc.); `admin/error.tsx` boundary with `console.error`.
- Missing UX polish (INFO): some admin pages render generic "Loading..." text; no localized error copy for all admin surfaces — acceptable.

## 15. Deployment Configuration Gate

- `APP_ENV/APP_DEBUG` production-safe defaults; `REQUIRE_TLS` defaults ON in production (`security.php:170-172`); TRUSTED_PROXIES 172.16.0.0/12 (compose); stateful domains; CORS single origin; cookie Secure defaults to production.
- **F-002** idle-timeout env knob dead (config key mismatch).
- **F-006 (P3):** `.env.example` omits `SESSION_SECURE_COOKIE` / `REQUIRE_TLS` / `TRUSTED_PROXIES` (defaults are safe — documentation gap).
- **F-012 (OPERATOR-CONTROLLED):** the external TLS gateway must forward `X-Forwarded-Proto: https` to the nginx edge (the Phase 4B nginx map depends on it; deployment.md does not state this explicitly).
- Docker/nginx/backup runtime verification: **operator-required** (no container runtime on this host) — see §21.

## 16. Observability & Operations Gate

- Audit log: indexed created_at, paginated, action/user/date filters; RLS migration (operator-verified ownership caveat F-008); failed-jobs observability endpoint (no payload/exception leakage).
- Health: `/up` + `/api/v1/health` (db+cache), TLS-gate exempt, no version fingerprint; watchdog script encodes the exact contract (frontend `/health/live`, backend health, 401 auth gate).
- Mail: log mailer (no external dependency); `MAIL_ADMIN_ADDRESS` documented contract with fail-loud warning.

## 17. Test Quality Gate

**Strengths:** 461 PHP tests + 75 web tests; tenant isolation is the strongest area (B2BProductScopingTest 23 cases incl. negative 403s); escalation/RBAC deep; cookie round-trip pinned; health shape pinned; behavior-level assertions dominant.

**Defects:**
- **F-004 (P2):** `AdminThrottleTest::test_admin_endpoint_rate_limited_after_300_requests` — 300 heavy dashboard requests must finish inside the 60s rate-limit window; **observed failing once in three runs** (176.69s run); the test asserts the limiter, not robust behavior. Fix (post-audit): pre-seed/clear the limiter key or use a lightweight endpoint / injectable clock.
- **F-002 related (P2):** `IdleSessionTimeoutTest::test_timeout_is_configurable_via_env` sets the **same wrong config key** the middleware reads — the test pins the bug, not the behavior.
- **F-009 (P3, coverage gaps):** (a) CSRF/XSRF/CORS negative tests; (b) mass-assignment extra-field negative tests; (c) bearer+cookie coexistence; (d) `/up` contract; (e) queue afterCommit/unique/retry; (f) audit-log RLS enforcement; (g) docs-article cross-product 403; (h) search injection probe; (i) audit-logs filter params. None of these are behavior defects — all are missing regression nets.
- Test isolation: `phpunit.xml` uses `ys_api_test` (pgsql), array cache, sync queue, array mail, pinned APP_KEY — sound.

## 18. Documentation Gate

- `docs/deployment.md` accurately describes the compose topology (nginx :80 public, TLS on external gateway, no Redis, storage volume, backup profile, OPcache ini, healthcheck contracts).
- **F-012:** the gateway→nginx `X-Forwarded-Proto: https` requirement is implied, not stated — an operator following the docs could deploy behind a gateway that doesn't announce the scheme and see total 403s (fail-loud, but confusing).
- **F-006:** `.env.example` omits three security knobs (defaults safe).
- No other doc could mislead deployment/operation.

## 19. New Findings

| ID | Sev | Conf | File:line | Current behavior | Impact | Recommendation | Blocking |
|---|---|---|---|---|---|---|---|
| F-001 | **P1** | high | `ys-api/app/Http/Controllers/Admin/ContactRequestController.php:137-216` | `convertCustomer()` authorizes two permissions but never calls `assertRequestAccessible`; every sibling (`linkCustomer`, `unlinkCustomer`, `linkProject`, `unlinkProject`) does | Product-scoped admin (e.g. Support) can read a foreign tenant's **linked** request PII (email/phone/message/ip, plus the linked customer's product_id), create a **global** customer from it, and mutate the foreign row (`handled_by/handled_at/customer_id`); breach path requires knowing the UUID + mismatched email, but the boundary violation is code-certain | Add `$this->assertRequestAccessible($contactRequest)` after the `authorize()` calls (one line, matches all siblings); add negative test (scoped admin converting foreign linked request → 403) | **YES** |
| F-002 | **P2** | high | `ys-api/app/Http/Middleware/EnforceIdleSessionTimeout.php:33` | Reads `config('security.session_idle_timeout_hours', 2)`; the real key is `security.session.idle_timeout_hours` (`config/security.php:126`) — the `SESSION_IDLE_TIMEOUT_HOURS` env knob is dead; idle timeout pinned to 2h; `IdleSessionTimeoutTest.php` (`config(['security.session_idle_timeout_hours' => 5])`) asserts the same wrong key | Operational control (VULN-14 contract) silently broken; a deployment raising the knob would be ignored | Fix key to `security.session.idle_timeout_hours`; fix the test to use the real key | **YES (P1-adjacent P2)** |
| F-003 | **P2** | high | `ys-api/app/Http/Controllers/Admin/AuditLogController.php:15-38` | `index()` returns all tenants' audit logs (user emails via eager load + `old_values/new_values` JSON) to any `view_audit_logs` holder; Admin role (seeded) is product-scopable | Cross-tenant operational metadata leakage (e.g. other tenants' subscription price changes, customer emails) | Restrict `view_audit_logs` to super_admin, or add product scoping (requires product_id column) — business decision | **YES** |
| F-004 | **P2** | high (observed) | `ys-api/tests/Feature/Admin/AdminThrottleTest.php:24-36` | 300 sequential heavy dashboard calls must complete inside the 60s limiter window; **observed failing once in three runs** (176.69s; the 301st request hit a fresh window → 200) | Flaky CI; a red build without a defect; masks genuine limiter regressions | Re-run locally confirmed green; make the test clock/limit deterministic (clear/seed limiter key, or use a lightweight endpoint) | **YES (release hygiene)** |
| F-005 | P3 | high | `ys-api/composer.json:12` | `predis/predis ^2.3` still in `require`; no redis driver active (file/database everywhere) | Dead dependency: supply-chain scan noise; one env change away from an unverified store | Remove from require (or move to suggest); drop redis blocks from `config/cache.php`/`config/queue.php` | No |
| F-006 | P3 | high | `ys-api/.env.example` | `SESSION_SECURE_COOKIE`, `REQUIRE_TLS`, `TRUSTED_PROXIES` absent (defaults are safe: TLS gate on in production, cookie Secure defaults to production, `AuthController.php:229`) | Operators may not know the knobs exist | Document the three knobs in `.env.example` | No |
| F-007 | P3 | med | `ContactRequestController.php:60,88,127,239,282,317` + `ContactRequest` model (no `$hidden`) | `projects` payloads expose `quoted_value/currency` to `manage_contact_requests` holders without `view_financials` (inconsistent with `CustomerController`); raw index serializes `ip_address/user_agent/spam_score` | Narrow role-metadata exposure | Gate financial fields; add an explicit ContactRequest resource | No |
| F-008 | P3 | med | `2025_01_01_000012_audit_logs_row_level_security.php:16-26,62` | Migration documents that `FORCE ROW LEVEL SECURITY` doesn't apply to the table owner; migrations run as the app user in compose/release | Append-only protection inert unless ownership transferred in production | Operator: transfer table owner to a non-app role in production (verify with `\dp audit_logs`) | No (operator) |
| F-009 | P3 | high | see §17 | Nine missing negative/contract tests (CSRF/CORS, mass-assignment extra fields, bearer+cookie coexistence, `/up`, queue semantics, RLS, docs-article 403, search injection, audit filters) | Regression nets absent for security-critical surfaces; behavior itself verified clean | Add in post-release hardening (see §24) | No |
| F-010 | P3 | med | `DashboardService.php`; public controllers; migrations | Dashboard ~30-35 SQL/load; unbounded public lists (products/docs/roadmap/timeline); missing indexes on tenant-anchor FKs and filter columns | Cost scales with catalog/tenant growth | Index the tenant-anchor FKs; paginate public lists; cache/merge dashboard counts for scoped admins | No |
| F-011 | INFO | high | `app/[locale]/(public)/contact/page.tsx:37-44` | Two sequential server fetches (service then settings; settings deduped against layout) | Minor latency on one page | Parallelize or rely on layout dedupe | No |
| F-012 | OPERATOR | high | `docs/deployment.md`, `docker/nginx/sites/default.conf` | External gateway must send `X-Forwarded-Proto: https` (Phase 4B map passes it through; fallback = this edge's scheme → fail-loud 403) | Misconfigured gateway → total 403s (fail-loud, not silent) | Document the requirement; include in §21 checklist | No (operator) |

## 20. Verified Fixed Findings

All prior findings listed in §4 re-verified as **VERIFIED FIXED** — no regressions in: cookie auth (runtime + test), `/health/live` (runtime 200), nginx proto map, contact CSRF+queue (runtime), tenant A/B (runtime), menus/homepage/FAQ-status/permissions/search, cache abstraction/feature-flag fallback, docs scoping, milestone transaction + rollback, audit index, OPcache, status page, client.ts revalidate, settings/audit error handling, env-example safety (with F-006 doc note).

## 21. Operator-Controlled Verification

Docker is unavailable on this host — **nothing below is claimed as verified**. Execute on a Docker-capable host before go-live:

```bash
# 1. Compose file validity + variable resolution
docker compose config --quiet

# 2. Build all images (backend, frontend, nginx, database)
docker compose build --parallel

# 3. Bring the stack up (postgres first, then app)
docker compose up -d database
docker compose up -d

# 4. Health checks (each service's own HEALTHCHECK)
docker compose ps                     # all services: healthy (frontend /health/live, backend /up)

# 5. TLS-forwarding contract (gateway → nginx must send X-Forwarded-Proto: https)
curl -s -o /dev/null -w '%{http_code}\n' -H 'X-Forwarded-Proto: https' http://localhost/api/v1/health   # expect 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost/api/v1/health                                  # expect 403 TLS_REQUIRED (fail-loud)

# 6. Cookie auth through the edge
curl -s -c /tmp/j -b /tmp/j -H 'Origin: http://localhost' http://localhost/sanctum/csrf-cookie
# then login; then cookie-only /api/v1/auth/me → 200

# 7. nginx config inside the container
docker compose exec nginx nginx -t

# 8. Queue worker + scheduler
docker compose logs queue-worker | tail -50     # job processing visible
docker compose exec scheduler php artisan schedule:list

# 9. Database connectivity + migrations
docker compose exec backend php artisan migrate:status
docker compose exec database pg_isready -U "$DB_USERNAME" -d "$DB_DATABASE"

# 10. Storage persistence
docker compose exec backend sh -c 'echo persist > /app/storage/framework/probe'; docker compose restart backend; docker compose exec backend cat /app/storage/framework/probe

# 11. Backup primitive
docker compose --profile production run --rm backup

# 12. Audit-log RLS ownership (F-008)
docker compose exec database psql -U "$DB_USERNAME" -d "$DB_DATABASE" -c '\dp audit_logs'   # table owner ≠ app user

# 13. Watchdog as cron/systemd on the host
YS_WATCHDOG_BASE_URL=http://localhost ops/watchdog/healthcheck.sh   # exit 0
```

## 22. Release Checklist

Before freeze, must be resolved: **F-001 (P1)**, **F-002 (P2)**, **F-003 (P2)**, **F-004 (P2 test)**. Then re-run: PHPUnit (expect 461+, no flake), Vitest 75, tsc, eslint, `next build`, repeat the §21 operator checklist, set `FRONTEND_URL/API_URL/APP_URL` + `MAIL_ADMIN_ADDRESS` + real secrets, verify audit-log ownership, rotate all smoke credentials.

## 23. Final Release Decision

**C — NOT RELEASE READY.**

Reason: **F-001** is a genuine tenant data-isolation defect (P1) — the only object-mutating contact-request endpoint missing the accessibility assertion every sibling enforces. F-002/F-003 are P2 security-adjacent defects that must also be resolved before production. Docker/nginx runtime verification (operator checklist) is required but is **not** the reason for this verdict. Per instructions, a genuine isolation defect is not downgraded to reach a release verdict.

## 24. Recommended Post-Release Backlog

1. F-009 test-coverage additions (CSRF/CORS negatives, mass-assignment negatives, bearer+cookie coexistence, `/up` contract, queue semantics, RLS enforcement, docs-article 403, search injection probe, audit filters).
2. F-010 performance: indexes on tenant-anchor FKs; paginate unbounded public lists; dashboard query/cache optimization for scoped admins.
3. F-005 dependency cleanup (predis), F-006 env-example documentation, F-007 ContactRequest resource with explicit fields + `view_financials` gate.
4. F-011 contact page fetch parallelization.
5. F-008 audit-log ownership automation (documented runbook or migration-time owner transfer).
6. Add scheduled-task definitions to the scheduler when business schedules exist (currently zero tasks by design).

---

*Audit complete. Stopped for Lead Engineer review — no fixes applied, no commit, no push, no Phase 6.*
