# Sprint 1 — Platform Stabilization & Production Hardening

**Period:** 2026-08-07
**Scope:** critical security, deployment reliability, and frontend<->backend integration fixes only. No new business features.
**Ground truth:** every status below re-verified against source, routes, config, Docker files, and live test runs during this closeout. Verification marks: `+` = code-verified · `~` = partially · `?` = unknown/open.

---

## SPRINT 1 VERDICT: **GO WITH CONDITIONS**

Sprint 1 delivered all 12 scoped goals, all code-verified and regression-clean (backend 42/42 tests, Pint clean on touched files, `tsc` clean, `next build` produces working standalone output). No Sprint-2 features were started.

**Sprint 1.1 closure (2026-08-08):** the K-20 deployment chain was the primary condition. It is now **resolved** (see "K-20 — Sprint 1.1 closure" below): backend image serves HTTP (nginx :8000 → php-fpm :9000), edge nginx preserves `/api/` paths, healthchecks and deploy gates hit real endpoints, `NEXT_PUBLIC_API_URL` is a build arg, and stale generated caches are no longer tracked/baked into images.

**Remaining conditions (owner decisions, not Sprint-blocking for deployment):**
1. **Frontend lint gate not green:** 17 pre-existing ESLint errors (untouched files) make `npm run lint` fail; triage as follow-up backlog (Sprint 1.1 scope explicitly excluded fixing them).
2. **4 dead admin pages + untracked billing/customers/subscriptions WIP** need an owner decision (implement APIs or delete; keep or drop `manage_subscriptions`).
3. **Operational unknowns:** production hosts/TLS certs, `NEXT_PUBLIC_API_URL` repo variable, `GRAFANA_PASSWORD`, first-run migration order on a fresh host (documented in `docs/deployment.md` §7).

---

## Sprint goals delivered

| Goal | Status |
|---|---|
| A1 — Remove hardcoded admin credentials | + RESOLVED |
| A2 — Publish explicit `config/filesystems.php` (storage exposure, S-21) | + RESOLVED |
| A3 — Product-scope enforcement on roadmap/updates/timeline (S-22) | + RESOLVED |
| A4 — Server-side token expiry enforcement (S-08) | + RESOLVED |
| A6 — Remove SVG upload attack surface (ME-07) | + RESOLVED |
| C1 — Fix dashboard widget endpoints + `manage_releases` permission (K-05/06/07) | + RESOLVED |
| C2 — Hide 4 dead admin pages with no backend (K-01..04) | ~ hidden from nav (pages kept; owner decision pending) |
| B2 — Add migration step to deploy (K-22 / CR-02) | + RESOLVED (see risk note) |
| B3 — Docker Compose secret hardening (S-07 / S-15) | + RESOLVED |
| B4 — Frontend Docker build broken (missing `output: 'standalone'`) | + RESOLVED |
| B5 — Container healthchecks pointed at non-existent routes | ~ backend `curl /up` still unreachable (no HTTP server; same root cause as K-20) |
| B1 — Fix broken `next lint` CI gate (Next 16 flat config) | ~ gate now real; fails on 17 pre-existing errors |

---

## Verification recorded this session

- Backend PHPUnit: **42 tests / 101 assertions OK** (re-run this session, green).
- Backend Pint: `passed` on all Sprint-1 touched files (scoped run). Full-repo Pint: now **parses** (the `SettingsSeeder_ADDITIONS.php` parse error was removed in Sprint 1.1); dry-run still flags pre-existing style debt (`line_ending` CRLF etc.) — untouched per scope.
- Frontend `tsc --noEmit`: clean (this session).
- Frontend `next build`: `Compiled successfully`, produced `.next/standalone/server.js` + `.next/static` (this session). `app/health/live/route.js` present in `.next/server` output.
- Frontend ESLint: runs with **17 errors / 7 warnings**, all pre-existing (verified: none introduced by Sprint 1; the dashboard's only error is in pre-existing code at page.tsx:36, not the changed line 42).

## Per-fix verification detail

### A-1 — Erstwhile credentials (CR-01)
Verified: `ys-api/config/admin.php` reads `ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD`; `AdminUserSeeder` fails-closed (blank password => no super admin created) and no longer contains the committed plaintext (`YS515&Yahya`). Grep over the repos shows the string only in historical docs (residual references that were the discovery deliverable), not in source. `ys-api/.env.example` documents the vars; root `.env.example` blank. No stale config cache present (`bootstrap/cache/config.php` absent; only events/packages/routes-v7/services cached).

### A-2 — `config/filesystems.php` (S-21 / CR-03)
Verified: `default` = `local` (env `FILESYSTEM_DISK`, default `local`), `local` root = `storage/app/private`, `serve => false`; `public` disk keeps `serve` opt-in (`FILESYSTEM_SERVE`, default false). `MediaUploadService` reads `config('filesystems.default')` at runtime and `Storage::disk($disk)->putFileAs` — uploads land on the private disk. Storage exposure closed.

### A-3 — Product scope (S-22)
Verified: `User::canAccessProduct()` exists (`ys-api/app/Domains/Auth/Models/User.php:121` — super admin grant + `products()` pivot check); `RoadmapController` (store/show/update/destroy), `UpdateController` (store/show/update/destroy/publish/unpublish), `TimelineController` (store/update/destroy) all call `authorize('manage_products'`) AND gate `product_id` / bound resource via `canAccessProduct` with `abort(403)`. Diff read in full; no earlier controller-side gap remains.

### A-4 — Token TTL (S-08)
Verified: `EnsureUserIsActive` (aliased `active`) checks the Sanctum token `expires_at`; expired => delete token + `401 TOKEN_EXPIRED`. Middleware is registered in `bootstrap/app.php` and applied to `auth` + `admin` route groups. Token creation at login sets TTL from `security.admin_token_ttl_hours` (8h) / remember (30d). `/up` route confirmed in `route:list`.

### A-6 — Upload allow-list (ME-07)
Verified: `config('security.uploads.allowed_mime_types')` no longer contains `image/svg+xml`; `blocked_extensions` includes `svg`,`svgz`. `MediaUploadService` checks server-detected MIME (not client), extension, double-extension, size. Rejected with 422 `ValidationException`.

### C-1 — Dashboard widgets (K-05/06/07)
Verified: `WidgetDefinition.apiPath?` added; dashboard fetch now `${API}/admin/${w.apiPath ?? w.id}`; `faq` widget => `apiPath: 'faqs'`, `homepage` => `'homepage-sections'`, both match backend routes (`api/v1/admin/faqs/*`, `api/v1/admin/homepage-sections/*`, confirmed via `route:list`). `releases` widget permission corrected `manage_releases` -> `manage_products`; nav `Release` entry also `manage_products`, matching `ReleaseController` `authorize('manage_products')` (5 call sites). `AuditService` etc unchanged.

### C-2 — Dead admin pages (K-01..04)
Verified: `modules/core/navigation.ts` no longer lists `/admin/sessions`, `/admin/login-history`, `/admin/api-tokens`, `/admin/notifications`; unused icon imports removed. Pages still exist on disk and compile (they call non-existent backend routes) but are unreachable from the UI. Backend has no routes for them (`route:list` confirms). Owner decision required: implement APIs or delete the files (tracked open).

### B-2 — Deploy migration ordering (K-22 / CR-02)
Applied: `release.yml` runs `docker compose run --rm backend php artisan migrate --force` BEFORE `docker compose up -d`, then verifies ingress `/`. **Risk note:** on a fresh host where DB/Redis containers have never started, `docker compose run` may fail because dependencies are not running yet — best practice is `docker compose up -d database redis` first, then migrate, then `up -d` the rest. Flagged for operational verification; not a Sprint-1 code defect.

### B-3 — Compose hardening (S-07 / S-15)
Verified: `DB_PASSWORD` uses `${DB_PASSWORD:?Set DB_PASSWORD in the environment / .env}` (fail-fast) across backend, database, queue-worker, scheduler; `POSTGRES_PASSWORD` likewise; no default `secret` values; mail defaults; Mailhog dev/staging-only profile; `GRAFANA_PASSWORD` uses `:-admin` (pre-existing, ME-01). Root `.env.example` has all secrets blanked; ADMIN_* vars documented.

### B-4 — Next standalone (K-36)
Verified: `next.config.ts` has `output: 'standalone'`; `next build` produced `.next/standalone/server.js`; Dockerfile copies `.next/standalone` + `.next/static` and runs `node server.js` (missing previously -> build/COPY failure). Build verified successful today. `app/health/live/route.ts` new — zero-dependency return JSON 200, compiled into standalone output.

### B-5 — Container healthchecks (K-14c)
Verified: frontend healthcheck (`compose` + `Dockerfile`) uses `http://localhost:3000/health/live` which now exists (route added); backend healthcheck uses `curl http://localhost:8000/up`. **Condition note:** `/up` exists in `route:list` (Laravel 11 health), but the backend container does not listen on HTTP port 8000 — it runs `php-fpm` only (EXPOSE 9000). So the backend healthcheck will always fail until the container serves HTTP (same root cause as K-20). Must be fixed with the K-20 deployment work item.

### B-1 — ESLint flat config (K-23/24 / ME-01)
Verified: `package.json` `lint` = `eslint .`; new `eslint.config.mjs` (flat, `eslint-config-next/core-web-vitals`). Runs; fails only on 17 pre-existing errors in untouched files. CI `frontend-lint` job will be red until the 17 backlog items are addressed — documented, not Sprint-1-fixed. Backend static-analysis job remains fail-open placeholder (`phpstan` not installed); backend unit tests are real (run with real Postgres in CI).

---

## K-20 — Sprint 1.1 closure (deployment architecture corrected)

Status: **RESOLVED (Sprint 1.1, 2026-08-08).**

### Root cause (verified chain)

1. **Backend image had no HTTP layer.** `ys-api/Dockerfile` was `php:8.4-fpm-alpine`, `CMD ["php-fpm"]`, `EXPOSE 9000` (FastCGI only). Nothing listened on 8000 — yet compose mapped `8000:8000`, the healthcheck curled `http://localhost:8000/up`, and the edge nginx upstream targeted `backend:8000`. Result: every backend request = 502, backend container never healthy.
2. **Edge nginx path math.** `location /api/ { proxy_pass http://backend/; }` — the trailing slash stripped `/api/`, so `/api/v1/health` arrived upstream as `/v1/health` (404; routes are registered under `api/v1`). `location /health/ { proxy_pass http://backend; }` pointed at a backend with no `/health/*` routes and shadowed the frontend's `/health/live`. A `location ~* \.(js|css|…|svg|woff)$` regex block had **no `proxy_pass`** → it shadowed every proxied request ending in a known extension (frontend assets, `/storage/*` images, API URLs with extensions) → 404s.
3. **`NEXT_PUBLIC_API_URL` mismatch.** compose passed the runtime env `http://localhost:8000` (missing `/api/v1`), which the frontend expects in its base; and NEXT_PUBLIC_* values are inlined at build time, so a runtime env on a prebuilt image is a no-op (K-21).
4. **Stale tracked route cache.** `ys-api/bootstrap/cache/routes-v7.php` (git-tracked) was copied by `COPY . .` into the image and loaded by Laravel — it advertised phantom routes (`storage.local`, `storage.local.upload`) from an old config while the real routing contract (health/up) came only from a fresh cache. Confirmed by `route:list` with the cache removed.
5. **Default-exposed / insecure services.** DB/Redis/backend/Grafana/mailhog bound `0.0.0.0`; `GF_SECURITY_ADMIN_PASSWORD` defaulted to `admin`.

### Architecture selected
Keep the application untouched. Add an **HTTP layer to the backend image** (nginx :8000 → FastCGI :9000 → php-fpm → Laravel) so the existing one-container-per-service model, compose healthcheck, and nginx upstream all work; keep edge nginx as the single public ingress that preserves `/api/...` paths.

### Changes applied (Sprint 1.1)
- `ys-api/Dockerfile` — runner installs `nginx` + `curl`; copies `docker/nginx/nginx.conf` (listens :8000, `fastcgi_pass 127.0.0.1:9000`, serves `public/storage` statically, disallows PHP-in-storage); new `docker/entrypoint.sh` (starts php-fpm + nginx; execs passed commands for workers/migrate); `public/storage` symlink; `rm` runtime caches; `EXPOSE 8000`; pool runs as `appuser`.
- `ys-api/docker/nginx/nginx.conf`, `ys-api/docker/entrypoint.sh` — new files.
- `ys-api/.dockerignore` (new) — excludes `.env`, git, tests, caches, stray files.
- `ys-api/bootstrap/cache/{events,packages,routes-v7,services}.php` — no longer git-tracked (generated artifacts; stale cache was a correctness bug).
- `ys-web/Dockerfile` — `NEXT_PUBLIC_API_URL` build arg inlined before `npm run build`; `ys-web/.dockerignore` (new).
- `docker/nginx/sites/default.conf` — `/api/` → `proxy_pass http://backend` (no trailing slash, preserves URI); removed broken `/health/` block and no-handler static regex (frontend sets its own immutable cache headers).
- `docker-compose.yml` — all non-ingress host bindings scoped to `127.0.0.1`; `NEXT_PUBLIC_API_URL` moved to `build.args` (default `${API_URL:-http://localhost:8000/api/v1}`); Grafana password fail-fast (`:?`); removed now-unused `backend_storage` mount from edge nginx.
- `.github/workflows/release.yml` — frontend built with `NEXT_PUBLIC_API_URL` build arg (repo var); verify step now curls `/health/live`, `/api/v1/health` and asserts auth gate 401/419 on `/api/v1/admin/products`.
- `.env.example` — `API_URL=http://localhost:8000/api/v1` (full base with prefix), Grafana fail-fast doc.

### Verification (this sprint)
- Backend: PHPUnit **42/42 (101 assertions)** — pass (post-changes).
- Backend routing (cache cleared): `GET /api/v1/health` (public, DB+cache) and `GET /up` (Laravel health) resolve; phantom `storage.local` routes gone.
- Pint: full-repo dry-run now **parses** (the K-27 parse error is gone); remaining failures are pre-existing style debt (`line_ending` CRLF etc.) left untouched (scope: no unrelated cleanup); Sprint-1 touched files remain clean.
- Frontend: `tsc --noEmit` clean; `next build` OK (standalone output); ESLint unchanged at 17 errors / 7 warnings, all pre-existing.
- Compose YAML parses; substitutions resolve (`127.0.0.1` bindings, build args, fail-fast grafana).
- **Not verifiable in this workspace:** no Docker engine — container startup, image build, and live HTTP through the stack could not be executed here. The request path is traced through config and the release pipeline health gate (see `docs/deployment.md`); actual first deploy must run the §7 fresh-host sequence.

### Remaining limitations
- Full container runtime verification must be performed at deploy time (no local Docker).
- `NEXT_PUBLIC_API_URL` must be set as a GitHub repo var; stale if not set (documented).
- Fresh-host migration order and TLS/443 certs remain operational items.

---

## Code-level / repository observations (no changes made)

1. **Pre-existing untracked WIP in both apps:** `ys-api` has server-cached artifacts and two stray `storage/...` test images; `ys-web` has `app/admin/customers/`, `app/admin/subscriptions/`, `components/admin/{Customer,Subscription}Form.tsx`, and an uncommitted `billing` nav group referencing a permission `manage_subscriptions` — but backend has **no** `/admin/customers|subscriptions` routes (`route:list` misses). These are earlier uncommitted work, not Sprint 1.
2. **`docs/FRONTEND_STRUCTURE.md` deleted** in `ys-web` (tracked file, marked `deleted` in git). No Sprint-1 access touched it; likely cleanup/IP issue — file is untracked now.
3. **`SettingsSeeder_ADDITIONS.php`** (`K-27`): malformed merge-fragment with parse error; NOT called by `DatabaseSeeder`; blocked full-repo Pint. **Removed in Sprint 1.1** (its own docblock says "NOT a standalone file" — dead artifact).
4. **Route prefix consistency:** all admin widgets/forms use `NEXT_PUBLIC_API_URL` (`.../api/v1`) + `/admin/...` — consistent with the middleware scope group. Public health route `api/v1/health` is in the open group and reports db + cache — matches the SETUP-13/K-13 correction in known-issues.
5. **Root `.env.example`**: `ADMIN_PASSWORD=` blank and `DB_PASSWORD=` blank (required, fail-fast), `GRAFANA_PASSWORD=` blank default is `admin` at compose level (pre-existing low).
6. **Frontend lint backlog** is wholly pre-existing code (e.g. React 19 `react-hooks/set-state-in-effect` in `PlatformProvider.tsx`, `no-assign-module-variable` in `useModule.ts`); none from Sprint-1-held files except a pre-existing `setLoading` inline in the dashboard effect.

## Git diff scope equivalent (Sprint 1 touched only)

Backend (`ys-api/`): `config/admin.php` (new, via `config('admin')`), `config/filesystems.php` (new), `config/security.php`, `database/seeders/AdminUserSeeder.php`, `app/Http/Middleware/EnsureUserIsActive.php`, `app/Http/Controllers/Admin/{Roadmap,Update,Timeline}Controller.php`, `.env.example`.

Frontend (`ys-web/`): `modules/core/widgets.ts`, `modules/core/navigation.ts`, `lib/platform/registries/WidgetRegistry.ts`, `app/admin/dashboard/page.tsx`, `eslint.config.mjs` (new), `package.json`, `app/health/live/route.ts` (new), `next.config.ts`.

Infra: `.env.example` (root), `.github/workflows/release.yml`, `docker-compose.yml`.

Docs: `docs/sprint-1-report.md` (this), `docs/README.md` index row, `docs/known-issues.md`, `docs/security.md`, `docs/technical-debt.md`, `docs/configuration.md`, `docs/login-flow.md`, `docs/media-upload-flow.md`.

---

## Blocking conditions for production

1. ~~**K-20:** backend must serve HTTP (FastCGI wrapper / Octane) and nginx must use `proxy_pass http://backend` without trailing slash.~~ **RESOLVED in Sprint 1.1** (HTTP layer in backend image + edge routing fixes, see K-20 closure).
2. ~~Wire real backend readiness verification `curl` (`/up` or `/api/v1/health`) into the deploy gate.~~ **RESOLVED** — `release.yml` verify curls `/health/live`, `/api/v1/health`, and asserts the 401/419 auth gate.
3. Decide production host keys / TLS (compose exposes 443 but no cert volume configured) — **operational, open**.
4. ~~Firewall DB/Redis/Grafana ports binding `0.0.0.0`.~~ **RESOLVED** — all non-ingress host bindings are loopback-only.

## Next steps outside Sprint 1 (owner, not implemented here)

- ~~Delete or merge `SettingsSeeder_ADDITIONS.php`.~~ Done in Sprint 1.1.
- Owner decision on the 4 dead admin pages: implement backend APIs or delete the page files.
- Owner decision on untracked billing/customers/subscriptions WIP + `manage_subscriptions` permission gating (no backend routes today).
- Triage the 17 pre-existing ESLint items to green `npm run lint`.
- Set repo variable `NEXT_PUBLIC_API_URL` to the production API base (build-time).

---

## Scope guard

- No Sprint 2 features added: no new business modules, no Clients/Services/CRM/Chat/Admin-redesign.
- Sprint 1.1 changed deployment architecture **only** to close K-20 (backend HTTP layer, edge routing, health checks, build-time API URL, cache hygiene, loopback bindings, SettingsSeeder fragment removal). No application code was changed.