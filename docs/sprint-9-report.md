# Sprint 9 Report — List Hardening + Production Configuration Review

**Status:** ✅ **COMPLETE**
**Date:** 2026-08-08
**Phases:** D — Admin list hardening (pagination, legacy statuses, docs scoping) · F — Production configuration review · G — Documentation + final verification

---

## Phase D — Admin list hardening

**Goal:** every admin list the API paginates must paginate in the UI, reset to page 1 on filter change, and show true totals.

- **`Pagination` component (new)** + `useAdminList` `{ withMeta: true }` overload (`{ items, meta }` — current/last page, per page, total). Default shape unchanged for the ~20 other callers.
- Wired into **contact-requests, customers, projects, subscriptions** — `page` param, filter/search resets to page 1, pager under the table when `last_page > 1`.
- **Backend meta gap:** `contact_requests` + `subscriptions` index responses omitted `per_page` — added.
- **Legacy statuses eliminated:** one-shot migration `2026_08_08_000016_normalize_contact_request_legacy_statuses` re-writes `read`/`replied` → `reviewing`. Before this, the `Reviewing` filter silently missed every legacy row (raw-column `where`); `normalizeStatus()` stays as render-time safety net.
- **Public docs leak fixed:** `GET /public/docs?product_id=` eager-loaded tree *children* without product scope — child nodes of other products' docs rendered on the wrong product's page. Children now product-scoped like roots.
- **Build blocker fixed (found during verification):** `ColorPicker` "derive state during render" guard compared nullable `value` to a `''`-initialized buffer — `null !== ''` every render → setState → infinite loop → `next build` crash on `/admin/products/new` (and live page crash). Fixed by normalizing both sides.

**Verification:** PHPUnit **178 tests / 636 assertions green** · Pint clean · `tsc --noEmit` clean · eslint clean on touched files · full `next build` passes (was failing before the ColorPicker fix).

---

## Phase F — Production Configuration Review

**Constraint honored:** no deployment redesign, no new infrastructure, no pagination work here, ESLint not re-opened; only genuine production/config defects fixed; no Docker engine locally → container runtime documented for first-deployment verification.

### Fixed defects

| # | Where | Defect | Fix |
|---|---|---|---|
| F1 | `docker-compose.yml` | `APP_KEY` never passed to backend / queue-worker / scheduler → Laravel cannot sign session cookies in containers (cookie auth dead on arrival) | `APP_KEY=${APP_KEY:?…}` on all three; documented in root `.env.example` |
| F2 | `docker-compose.yml` | `FRONTEND_URL` never passed → `config/cors.php` fell back to `http://localhost:3000` → deployed browser CORS-blocked on every API call | backend gets `FRONTEND_URL` + `SESSION_SECURE_COOKIE` |
| F3 | `ys-web/Dockerfile` | `npm ci --only=production` — Next build requires devDependencies (`typescript`, tailwind, postcss) → image build fails | deps stage now runs full `npm ci` |
| F4 | `.env` wiring | `SESSION_DRIVER`/`CACHE_STORE`/`QUEUE_CONNECTION`/`APP_VERSION` declared everywhere but **silently ignored** (no config files read them); effective value file/file/database regardless of env | shipped `config/session.php`, `config/cache.php`, `config/queue.php`, `config/version.php` — env-driven, defaults preserved exactly (verified via `config:show` + 178 tests) |
| F5 | `docker-compose.yml` | Dead `443` publish — edge nginx has no TLS vhost, so the mapping published a silent connection-refused port; HSTS header advertised HTTPS that cannot exist | 443 publish removed, HSTS line dropped, TLS termination documented as external gateway |
| F6 | `.github/workflows/release.yml` | Host-wide `docker system prune -f` removes **every** stopped container and unused image on the host — other projects' containers and previous release tags (rollback targets) | scoped `docker image prune -f` (tagged images exempt) |
| F7 | `docker-compose.yml` | `grafana/grafana:latest` — untracked image drift in the production profile | pinned to `grafana/grafana:11.4.0` |
| F8 | build-time env chain | `NEXT_PUBLIC_APP_URL` (canonicals/sitemap/JSON-LD) not passed as build arg anywhere → every image (incl. staging) emitted prod-domain canonicals | build arg in compose + release.yml; defaults documented |
| F9 | `ys-api/.dockerignore` | Stray debris lines from a bad paste (`replied`, `cls`, `id`, test-assertion fragments) acting as ignore patterns | removed |
| F10 | `docker-compose.yml` / `.env.example` | Mojibake section headers, duplicate `APP_URL` | cleaned |
| F11 | `/api/v1/health` | `app.version` config key never wired to the `APP_VERSION` env (no `config/app.php`) — health always reported `1.0.0` | `config/version.php` + health route reads `version.app` |

### Reviewed — no change needed (documented)

- `entrypoint.sh` — php-fpm daemon + nginx foreground; command passthrough correct.
- In-image backend nginx — `try_files` front-controller, `TryFiles` on `/storage/` with 1y cache, FastCGI to 9000; correct.
- Edge nginx — `/api/` without trailing slash (K-20 preserved), `/storage/` proxy, `/` websocket upgrade; correct.
- Secrets — `DB_PASSWORD`/`GRAFANA_PASSWORD` fail-fast (`:?`); loopback-only host bindings for DB/Redis/backends; `StrictHostKeyChecking` tradeoff documented; no secrets in repo (compose has none; `.dockerignore` excludes `.env`).
- Storage — private-only disk by default, `/storage/` served statically from volume-mounted public disk; correct as shipped.
- Health endpoints — `/up` (Laravel), `/api/v1/health` (DB + cache, `config(version.app)`), frontend `/health/live` (zero-dependency); all three used by real gates.
- `NEXT_PUBLIC_*` contract — build-time inlining correct (K-21); single-image-for-all-envs constraint documented with the new `NEXT_PUBLIC_APP_URL` build arg.

### First-deployment verification (mandated by "no Docker runtime here")

Full checklist added to `docs/deployment.md` §8 — host `.env` contents, build-time URL inlining proof, runtime config driver equality, cookie auth over real domain, TLS gateway, storage volume persistence, queue-worker consumption, scoped prune keeping rollback tag.

---

## Phase G — Documentation + final verification

- `docs/deployment.md` updated: container table (new requires, 443/TLS note, pinned Grafana), Dockerfiles §2 (npm ci + runtime config wiring), release pipeline §5 (new build arg, scoped prune), caveats, new §8 deployment checklist.
- `docs/sprint-9-phase-d-report.md` — Phase D detail (written immediately after D).

| Final check | Result |
|---|---|
| PHPUnit | ✅ **178 tests / 636 assertions — all green** (after all Phase D + F changes) |
| `php -l` on all touched PHP | ✅ |
| Pint | ✅ clean on new/changed PHP files |
| `tsc --noEmit` | ✅ clean |
| `eslint` (touched files) | ✅ clean |
| `next build` | ✅ clean (post-ColorPicker fix) |
| Compose + workflow YAML | ✅ parses |
| `docker compose`/Docker runtime | ❌ not available in this workspace — deferred to §8 checklist |

## Note for the next sprint

- Background: single build for both staging/production images — if separate domains, either build per env (image tag per env) or accept the constraint; documented, not wired.