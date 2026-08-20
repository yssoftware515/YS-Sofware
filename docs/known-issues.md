# Known Issues

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown
Every item below was confirmed by reading code (no speculation).

**Sprint 1 status legend:** `+` = RESOLVED (FIXED) · `~` = PARTIALLY resolved (remove entry when fully closed)
**Phase 7 status classes:** RESOLVED (fixed by Phases 1–7) · OPERATOR CONTROLLED (requires deployment/ops action) · BLOCKED (no capability on this host) · DEFERRED (accepted by design, documented)

---

## 1. Frontend ↔ Backend integration breaks (✅ verified)

| # | Issue | Frontend | Backend reality | Impact | Status |
|---|---|---|---|---|---|
| K-01 | `/admin/sessions` page | `app/admin/sessions/page.tsx` calls `GET /admin/sessions` | ❌ no route | Page shows error/empty | + RESOLVED (Phases 2A/3: dead page removed from the frontend tree — no caller remains) |
| K-02 | `/admin/login-history` page | calls `GET /admin/login-history` | ❌ no route | Page shows error/empty | + RESOLVED (dead page removed — no caller remains) |
| K-03 | `/admin/api-tokens` page | `POST /admin/api-tokens` | ❌ no route | Token creation fails | + RESOLVED (dead page removed — no caller remains) |
| K-04 | `/admin/notifications` page | `GET /admin/notifications`, `POST /admin/notifications/read-all` | ❌ no routes | Page shows error/empty | + RESOLVED (dead page removed — no caller remains) |
| K-05 | Dashboard widget `faq` | `GET /admin/faq` | ❌ route is `/admin/faqs` | Widget count always 0 (silent 404) | + fixed (apiPath) |
| K-06 | Dashboard widget `homepage` | `GET /admin/homepage` | ❌ route is `/admin/homepage-sections` | Widget count always 0 (silent 404) | + fixed (apiPath) |
| K-07 | Widget permission `manage_releases` | `modules/core/widgets.ts` | ❌ not in `Permission` enum (releases use `manage_products`) | Release widget invisible for roles that have manage_products but the fake string doesn't match → widget gated incorrectly | + fixed (widget+nav use `manage_products`) |

## 2. Permission inconsistencies (✅ verified)

| # | Issue | Detail |
|---|---|---|
| K-08 | `manage_admins` unused in seeded roles; `view_admin_activity` **removed** (had zero enforcement); `view_financials` **wired** (dashboard, customer value-by-currency, project payload) | ✅ grep + tests |
| K-09 | `view_products` gate exists but no route uses it (only ProductPolicy viewAny/view) | harmless |
| K-10 | Admin `role` read permission | `RoleController@index` requires `manage_users`; create/update/delete require `manage_admins` — frontend nav may mislabel (❓ verify UI) |

## 3. Documentation vs code mismatches (✅ verified)

| # | Doc (old) | Reality |
|---|---|---|
| K-11 | README/SETUP admin password `Change-This-Password-Immediately!` | Seeder uses `YS515&Yahya` | + RESOLVED: `AdminUserSeeder` is env-driven via `config/admin.php` and fails closed on a blank `ADMIN_PASSWORD`; no credential literal remains in source (pinned by `tests/Unit/AdminSeederContractTest.php` + `tests/Feature/Admin/AdminUserSeederTest.php`) |
| K-12 | README "12 migrations" | 22 migrations |
| K-13 | SETUP health response shows `checks: {database, redis}` | Actual: `{database, cache}` |
| K-14 | docs claim `/health/live`, `/health/ready`, `/health/startup`, `/health/deep` | Only `/api/v1/health` + `/up` exist |
| K-15 | docs claim automatic rollback | `release.yml` rollback-ready only prints a warning |
| K-16 | `ys-web/SETUP.md` claims next-intl | Not installed; custom i18n |
| K-17 | Old docs claim JWT | Sanctum opaque tokens |
| K-18 | Old docs claim MFA, sessions, single-session mode | MFA: not implemented. Single-session IS enforced at login (`tokens()->delete()` revokes all previous tokens). No sessions/login-history tracking table exists — the dead admin pages that called these endpoints (sessions, login-history, api-tokens, notifications) were removed from the frontend |

## 4. Deployment issues (✅ verified from files)

| # | Issue | Detail |
|---|---|---|
| K-19 | CI health verify targets non-existent endpoints | `release.yml` verified `/health/ready` + `/health/live` — backend has neither → deploy job fails after successful deploy | + fixed (Sprint 1: ingress `/`; Sprint 1.1: real `/health/live` + `/api/v1/health` + auth 401 gate) |
| K-20 | Broken backend deployment chain (verified Sprint 1 closeout, fixed Sprint 1.1) | Root causes: (1) backend image was `php-fpm` only — **no HTTP server on 8000**; (2) edge nginx `location /api/ { proxy_pass http://backend/; }` stripped the `/api/` prefix (`/api/v1/health` → `/v1/health` → 404); (3) `/health/` block proxied to a backend that has no such route; (4) static-asset regex location had no `proxy_pass` and shadowed every proxied request with a known extension (frontend assets, `/storage/*` → 404); (5) stale git-tracked `bootstrap/cache/routes-v7.php` baked phantom routes (`storage.local`) into images | + resolved (Sprint 1.1): in-image nginx on 8000 → php-fpm 9000; `proxy_pass http://backend` without trailing slash; `/health/` and static regex removed; caches untracked + `.dockerignore` + `rm` in image; healthcheck `/up` now reachable |
| K-21 | NEXT_PUBLIC_* are build-time | compose runtime env vars do not affect a prebuilt image (Next.js inlines at build) | + resolved (Sprint 1.1): build arg `NEXT_PUBLIC_API_URL` in `ys-web/Dockerfile` + compose `build.args` + `release.yml` build-args; docs per-env |
| K-22 | No migration step in deploy | SSH deploy runs compose up only; `php artisan migrate --force` not present (❓ run manually?) | + fixed (release.yml now runs `migrate --force` before `up -d`) |
| K-23 | CI backend static analysis is a placeholder | `php artisan lint || phpstan || echo` — phpstan not installed → always placeholder | + RESOLVED (Sprint 12 C-3: real `vendor/bin/pint --test` gate) |
| K-24 | CI frontend tests are a placeholder | `npm test` doesn't exist → `|| echo "Tests placeholder"` always runs; npm audit `|| true` (fail-open) | + RESOLVED (Sprint 12 C-4 lint gate + real backend tests; Phase 5B G-03: real `npm test` — vitest 75/75) |

### NEW (Sprint 1 findings)
| # | Issue | Status | Detail |
|---|---|---|---|
| K-36 | Frontend Docker build was broken | + RESOLVED (Sprint 1, B4) | `next.config.ts` lacked `output: 'standalone'` but the production `Dockerfile` copies `.next/standalone` → build fails at COPY |
| K-14c | Frontend + backend container healthchecks hit non-existent routes | + RESOLVED (Sprint 1, B5) | frontend `wget /health/live` (no route), backend `curl /health/live` (only `/up` exists) — both fixed |

### NEW (Phase 6/7 findings)
| # | Issue | Status | Detail |
|---|---|---|---|
| K-37 | Shipped `LOG_CHANNEL=stack` bypassed the Phase 6 daily rotation (P6-02) | + **RESOLVED (K-37 fix, release config):** `ys-api/.env.example` `LOG_CHANNEL=stack` → `daily` | Before: shipped template resolved to framework `stack` → `single` → unbounded `storage/logs/laravel.log` at `LOG_LEVEL`. After: template ships `LOG_CHANNEL=daily`; effective runtime default = `daily` (14-day retention, `daily_driver=daily`) — verified via `config:show`, `config('logging.channels.daily.days')` = 14, `Log::getDefaultDriver()` = `daily`, and `DeploymentConfigConsistencyTest` 9/25 green. No env/compose/workflow/Dockerfile source sets `LOG_CHANNEL=stack` anymore |
| K-38 | `TRUSTED_PROXIES` / `REQUIRE_TLS` absent from `ys-api/.env.example` | OPERATOR CONTROLLED (documented in docs/deployment.md; safe defaults in `config/security.php`) | operators must set both in the production env; the example file lacks them, risking silent misconfiguration |

## 5. Code-level defects / oddities (✅ verified)

| # | Issue | Detail |
|---|---|---|
| K-25 | Stray 0-byte files in ys-api root | `replied`, `cls`, `id`, `assertDatabaseHas('contact_requests'`, `assertStatus(200)` — shell artifacts, committed | + RESOLVED (Phase 7 verified: absent from working tree) |
| K-26 | Stray brace-named directory | `app/Domains/Search/{Contracts,Drivers,DTOs}` (empty) | still present as of Phase 7 — cosmetic, DEFERRED |
| K-27 | `SettingsSeeder_ADDITIONS.php` was not a seeder | merge-fragment with parse error; `DatabaseSeeder` never called it; it also blocked full-repo Pint | + resolved (Sprint 1.1): file deleted (its own docblock says "NOT a standalone file"; dead artifact); `content`-group settings were never seeded and remain a future feature |
| K-28 | `i18n/messages/*.json` dead | unused by code (custom i18n) |
| K-29 | Duplicated nav definitions | `lib/admin/navigation.ts` ≈ `modules/core/navigation.ts` (drift risk) | + resolved: legacy `lib/admin/navigation.ts` deleted — `modules/core/navigation.ts` is the single source |
| K-30 | `manage_users` on RoleController index vs `manage_admins` elsewhere | two permissions for one resource area | + RESOLVED (Final Engineering Gate): navigation now exposes Roles & Permissions to `manage_users` readers (matching the backend read gate); mutation controls on the page and all backend writes stay gated by `manage_admins`. Pinned by `tests/Feature/Admin/RoleAccessTest.php` (6 tests) |
| K-31 | `MAIL_ADMIN_ADDRESS` missing from `.env.example` | fell back to hardcoded `cantactys@gmail.com` | + RESOLVED: env documented in both `.env.examples` + pass-through (compose backend/queue-worker); hardcoded fallback removed — job logs a warning and skips when unset |
| K-32 | Dashboard "System Status" widget is static | hardcoded "All systems operational" — no health check wiring |
| K-33 | Public `/status` page static | no live metrics |
| K-34 | Scheduler service idle | `schedule:work` runs but no tasks defined (no routes/console.php) |
| K-35 | `storage/app/media` dir vs disk root `storage/app/private` | media uploads go to default disk root + `/media`; directory layout differs from repo dir listing (❓ minor) |

## 6. Open questions requiring owner input (❓)

1. ~~Intended scope of `lib/platform` framework (dormant vs. future core)?~~ → **Answered (Phase 2A, ARCH-006):** kept minimal; 79 dormant files removed, remaining framework is documented in frontend.md §9 and unit-tested.
2. ~~Are sessions/login-history/api-tokens/notifications planned backend features?~~ → **Answered:** not planned — the dead admin pages were removed (K-01..K-04 RESOLVED).
3. Production deployment environment details (hosts, TLS, migrations policy)? → **OPERATOR CONTROLLED** (Track B checklist in phase-6 report §12–§23).
4. ~~Should `health` endpoints follow the old docs' `/health/live` etc., or the current `/api/v1/health`?~~ → **Answered:** the current `/api/v1/health` + `/up` are the contract (K-14 RESOLVED); CI/deploy targets them.
5. Should the `status` page reflect real health metrics? → **DEFERRED** (K-33: static by design, no live metrics).

| K-36 | eslint baseline: 16 pre-existing errors in files untouched by Sprint 7 (Header, SearchModal, ColorPicker, CookieConsent, GlobalSearch, ProductsSection, PermissionGate, PlatformProvider, useModule, roles page, not-found) | react-hooks v6 rules strictness � one-line-per-file chore, correctness unaffected |
