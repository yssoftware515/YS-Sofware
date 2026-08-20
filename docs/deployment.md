# Deployment

**Verification:** ✅ verified from files · ⚠️ inferred · ❓ unknown

---

## 1. Container stack (`docker-compose.yml`, ✅ verified)

| Service | Image/Build | Exposed | Healthcheck | Notes |
|---|---|---|---|---|
| frontend | build ys-web (target `${DOCKER_TARGET:-runner}`) | 127.0.0.1:3000 | wget `/health/live` (Next route, zero-dependency) | image `ys-systems/frontend`; `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_APP_URL` are **build args** (inlined at build time, K-21) |
| backend | build ys-api | 127.0.0.1:8000 | curl `/up` (Laravel health, via in-image nginx) | image `ys-systems/backend`; runs nginx :8000 → php-fpm :9000 (HTTP layer, K-20); volume `backend_storage:/app/storage`; **requires `APP_KEY`** (cookie signing) + `FRONTEND_URL` (CORS/cookie auth origin) |
| database | postgres:16-alpine | 127.0.0.1:5432 | pg_isready | volume `postgres_data`; loopback-only so it is never exposed publicly |
| nginx | nginx:alpine | 80 (public) | nginx -t | proxies `/`, `/api/`, `/storage/`; the only publicly reachable service. **443 is not published** — this nginx terminates no TLS; TLS is expected on an external gateway in front of it (HSTS header intentionally absent) |
| queue-worker | build ys-api (same image) | — | — | `php artisan queue:work --sleep=3 --tries=3 --max-time=3600` (entrypoint execs the command); shares `backend_storage:/app/storage` (Phase 4A, P9) |
| scheduler | build ys-api (same image) | — | — | `php artisan schedule:work` (⚠️ no tasks defined) |
| **backup** (Sprint 11) | postgres:16-alpine (one-shot) | — | — | `docker compose --profile production run --rm backup` → `ops/backup/backup.sh`: `pg_dump -Fc -Z9` → `pg_restore --list` verify → atomic publish → retention prune. Profile-controlled (development/staging/production). Requires only the database to be healthy. See [backup-and-recovery.md](backup-and-recovery.md) |
| mailhog | mailhog/mailhog | 127.0.0.1:8025/1025 | — | profile: development, staging |
| monitoring | grafana/grafana:11.4.0 (pinned) | 127.0.0.1:3001 | — | profile: production; `GF_SECURITY_ADMIN_PASSWORD` is **fail-fast** (`:?`) — no default `admin` |

All host bindings except nginx are `127.0.0.1` — PostgreSQL, backend, frontend, mailhog and Grafana are never reachable from outside the host. Only nginx (80) is public. No Redis is deployed (Phase 4A, P1-01).

## 2. Dockerfiles (✅ verified)

- `ys-api/Dockerfile` — multi-stage (`deps` → `runner`). Runner installs `nginx` + `curl` + **OPcache** (`zz-opcache.ini`, Phase 4A P2-07: 128MB, `validate_timestamps=0` for the immutable image, no JIT), serves HTTP on :8000 in front of php-fpm (:9000), wires the `public/storage` symlink, removes runtime caches, runs as `appuser`. `entrypoint.sh` starts php-fpm (daemon) + nginx (foreground); any passed command (e.g. `php artisan migrate --force`, queue/scheduler workers) is exec'd directly instead.
- `ys-web/Dockerfile` — multi-stage (`deps` → `builder` → `runner`); Next standalone output; `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_APP_URL` build args inlined in `builder`. The `deps` stage runs a **full `npm ci`** — `next build` needs devDependencies (typescript, tailwind, postcss); `--only=production` would break the build.
- `.dockerignore` present in both `ys-api/` and `ys-web/` (excludes `.env`, git, node_modules, caches; stray debris patterns removed from the backend one).
- **Runtime config files**: `config/session.php`, `config/cache.php`, `config/queue.php`, `config/version.php` were shipped (Sprint 9) — effective drivers are file/file/database. Defaults preserve that behavior. The shipped `.env.example` and compose now match those defaults explicitly and contain no Redis surface (Phase 4A, P1-01).

## 3. Nginx routing (✅ `docker/nginx/sites/default.conf` + backend image nginx)

Request path: **Client → nginx (public :80) → { → frontend :3000 | → backend :8000 → php-fpm :9000 } → Laravel → PostgreSQL/storage (DB/file-backed; no Redis)**

| Path | Target | Behavior |
|---|---|---|
| `/` | frontend:3000 | SPA; websocket upgrade headers |
| `/api/` | backend:8000 | `proxy_pass http://backend` (**no trailing slash** → full URI preserved, `/api/v1/...` stays `/api/v1/...`; backend routes are registered under the `api/v1` prefix) |
| `/sanctum/` | backend:8000 | required for the stateful XSRF handshake: `GET /sanctum/csrf-cookie` must reach Laravel (default `proxy_pass http://backend` without trailing slash preserves the path) |
| `/storage/` | backend:8000/storage/ | preserved prefix → served statically from `public/storage` symlink (uploaded files); cache headers |
| `/health/live` | frontend (via `/`) | Next route, used by the frontend container healthcheck and external probes |
| `/api/v1/health` | backend (via `/api/`) | open route, reports DB + cache — this is the real backend readiness endpoint |
| `/up` | backend internal only | Laravel 11/12 health route; used by the *backend container* healthcheck (curl localhost:8000/up) |

⚠️ **Changed (Sprint 1.1, K-20):** previously `/api/` stripped the prefix (`proxy_pass http://backend/`), the old `/health/` block pointed at a non-existent backend route and shadowed `/health/live`, and a static-asset regex location had no `proxy_pass` (shadowing every proxied request with a known extension → 404). All removed. The backend image previously had **no HTTP server at all** (`php-fpm` EXPOSE 9000 only) — now nginx inside the image listens on 8000 and FastCGI's to php-fpm 9000.

Cache policy: Next.js already emits `Cache-Control: public, max-age=31536000, immutable` for `/_next/static/*` and user-uploaded `/storage/*` get `expires 1y` from the backend nginx. No edge-location cache layer.

### 3.1 Sanctum stateful authentication (browser flow)

The admin frontend authenticates with the **stateful** Sanctum flow (no bearer token in JS — the token rides an HttpOnly cookie):

1. **CSRF handshake** — the client calls `GET /sanctum/csrf-cookie` (route: `/sanctum/` → backend; sets the `XSRF-TOKEN` cookie; 204/200, unauthenticated).
2. **Login** — `POST /api/v1/auth/login` with `credentials: 'include'` (and the CSRF header below). Success sets the HttpOnly `ys_admin_token` cookie.
3. **Authenticated writes** — every state-changing request (`POST/PUT/PATCH/DELETE`) must also echo the CSRF token in the `X-XSRF-TOKEN` request header, **URL-decoded** (the cookie is URL-encoded; the header must carry the decoded value). Requests without a valid CSRF header are rejected (419) — a plain `GET /api/v1/auth/me` reads the session cookie only.
4. **Logout** — `POST /api/v1/auth/logout` (stateful, same CSRF rules; destroys the session token).

This contract is implemented by `ys-web/lib/csrf.ts` and covered end-to-end by `ys-api/tests/Feature/Auth/StatefulCsrfFlowTest.php` (handshake → login → write → logout → post-logout 401). The frontend must always send `credentials: 'include'` (or `withCredentials`) so the HttpOnly cookie is attached, and the edge nginx must never rewrite or strip `X-XSRF-TOKEN` or the cookie headers.

## 4. CI pipeline (`.github/workflows/ci.yml`, ✅ verified)

| Job | Status |
|---|---|
| frontend-lint | ✅ real (`npm run lint` — 0 errors, 6 pre-existing warnings in untouched files, Sprint 12) |
| backend-static | ✅ real (`vendor/bin/pint --test` — replaced the dead `php artisan lint \|\| phpstan \|\| echo` chain, Sprint 12 C-3) |
| frontend-tests | ✅ real gates (`npm test` — vitest 75+ unit tests across 17 files — plus `npm run lint` and `npm run type-check`) |
| backend-tests | ✅ real (Postgres service → DB bootstrap creates `ys_api` + `ys_api_test` → migrate → `php artisan test`, Sprint 12 C-2) |
| frontend-build | ✅ real |
| security-scan | ✅ real (npm audit `\|\| true`, Trivy HIGH/CRITICAL → SARIF) |

## 5. Release pipeline (`.github/workflows/release.yml`, ✅ verified)

1. `docker-build` — buildx, GHCR login, build/push `frontend` (with `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_APP_URL` build args from repo vars; default localhost/prod-domain fallbacks) and `backend`, tagged `<version>` + `latest`. When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set it is inlined as a build arg for the Turnstile login gate.
2. `deploy` — SSH to `DEPLOY_HOST`, `cd /opt/ys-platform`, `docker compose pull`, `docker compose run --rm backend php artisan migrate --force` (**before** `up`, on the new image), `docker compose up -d --remove-orphans`, `prune`.
3. `verify` — requires ingress to actually answer, and requires the ingress to be reachable over HTTPS:
   - `curl https://…/health/live` (frontend) must return 200.
   - `curl https://…/api/v1/health` (backend through nginx — real readiness gate) must return 200.
   - `curl https://…/api/v1/admin/products` must return 401/419 (auth layer reachable, not 502/404).
   - Plain-HTTP probes of the same endpoints may return **{403, 301, 308}** (TLS gate or redirect) — the HTTPS probes are authoritative; a 403/301/308 on HTTP is not a failure.
4. `rollback-ready` — `if: failure()`; prints a warning only (⚠️ **not automatic rollback**).

⚠️ Deploy requires `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_URL` secrets. **`DEPLOY_KNOWN_HOSTS` is also required** — the workflow pins the deploy host's SSH key fingerprint for a fail-closed connection (no `StrictHostKeyChecking=no` anywhere); without it the deploy step fails closed. `DEPLOY_URL` must be reachable over HTTPS and must not include trailing path. Also set repo variable `NEXT_PUBLIC_API_URL` to the public API base, e.g. `https://example.com/api/v1` — otherwise the browser will call `localhost:8000/api/v1` (build-time default) and break in production. Set `NEXT_PUBLIC_APP_URL` to the site's canonical origin (defaults to `https://ys-systems.com`).

## 6. Environments

| Environment | Profile | Notes |
|---|---|---|
| development | `docker compose --profile development up -d` | + mailhog |
| staging | `docker compose --profile staging up -d` | + mailhog |
| production | `docker compose --profile production up -d` | + grafana (requires `GRAFANA_PASSWORD` set) |

Actual deploy targets exist only as GitHub environments (`staging`/`production`); real host paths come from secrets (`DEPLOY_HOST`, `DEPLOY_URL`).

### Operator note — compose profiles & backup scheduling

- The stack is **profile-driven**: `mailhog` (development/staging), `monitoring`/Grafana (production) and the **backup service** (development/staging/production) only exist when the matching profile is active. Services without an active profile cannot be started — that is why the production backup run must pass the profile explicitly:
  `docker compose --profile production run --rm backup` (and `--profile staging`/`--profile development` on those hosts).
- Backup **scheduling is intentionally host-side** (crontab on the server, see backup-and-recovery.md §4). Do **not** create a Laravel scheduler task for backups.
- **K-34 stays deferred:** no Laravel scheduled commands exist (`routes/console.php` absent, no `schedule()` calls), so the `scheduler` container is idle by design; `php artisan schedule:work` is wired for when real schedules are added.

## 7. Deploy flow caveats ⚠️

- Fresh host: `docker compose run --rm backend php artisan migrate --force` requires the database up — on a truly fresh host run `docker compose up -d database` first, then migrate, then the rest (documented, not wired — see K-22/sprint report).
- `docker compose pull` assumes images are already published to GHCR (first release must build+push, or the pull step fails).
- **Container runtime verification not reproducible in this workspace** — no Docker engine available locally; static config review + unit/integration tests only. The request path is verified by config tracing (see §3) and the release pipeline health gate above.

## 8. First-deployment verification checklist (Sprint 9)

No Docker engine is available in this workspace, so the container path was reviewed statically — **every item below must be exercised on the real host at first deployment** (Sprint 9 Phase F):

1. **Host `.env`** — must contain `APP_KEY` (generate once: `php artisan key:generate`, 32-byte base64), `DB_PASSWORD`, `GRAFANA_PASSWORD` (production profile), `FRONTEND_URL` (the exact public frontend origin — CORS + Sanctum stateful domain are derived from it), `SESSION_SECURE_COOKIE` (set `true` when TLS terminates on the external gateway).
2. **Image builds** — `ys-web` build must succeed with the full `npm ci` (deps stage) and confirm `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_APP_URL` are inlined (K-21): the built page's canonical and API base must not contain `localhost`.
3. **Backend env wiring** — after `compose up`: `docker compose exec backend php artisan about` → `session.driver`, `cache.default`, `queue.default` must equal what the host `.env` declares (previously the env vars were silently ignored; regression check).
4. **Cookie auth (stateful flow)** — from the real domain: `GET /sanctum/csrf-cookie` (handshake), login with `credentials: 'include'` + `X-XSRF-TOKEN` echo, then `/api/v1/auth/me`; confirm the session cookie survives, authenticated writes carry the CSRF header, and the 401/419 gates work through the ingress. With `SESSION_SECURE_COOKIE=true` this only works over HTTPS.
5. **Ingress TLS** — external gateway terminates TLS and forwards to nginx :80 (`X-Forwarded-Proto` already passed); `/health/live`, `/api/v1/health`, and an auth-gated 401/419 check all answer.
6. **Storage** — upload a media file; file lands on the `backend_storage` volume; `/storage/…` serves it with the 1y cache headers; page after container restart still serves it.
7. **Queue path** — scheduler container up (no tasks yet); a job (e.g. email dispatch) is consumed by the queue-worker from the `jobs` table (database driver by default) and lands in the configured mail channel.
8. **Prune scope** — `docker image prune -f` on deploy keeps the previous release tag pullable (rollback path).
9. **Database backup** — `docker compose --profile production run --rm backup` exits 0; a `.dump` exists in `./backups`; `pg_restore --list` reads it; second run keeps exactly `BACKUP_RETENTION` dumps (Sprint 11; full checklist in backup-and-recovery.md §9).
10. **Failed-job observability** — create a failing job (or wait for one) and check `GET /api/v1/admin/ops/failed-jobs` (auth `view_audit_logs`) lists it without exposing `payload`.

## 9. Storage
- `backend_storage` volume mounted at `/app/storage` in backend (also would-be candidates for nginx read-only removed in 1.1: `storage/` is served through backend php, not directly from nginx).
- Symlink `public/storage -> /app/storage/app/public` created at image build; volume replaces `/app/storage` contents at runtime, symlink still resolves.
covered by visitors; served via `/storage/` with the 1y cache headers). The default disk stays private (`local`, serve=false); any non-site upload keeps the cryptotext/opt-in posture (S-21). `/storage/{path}` routes are NOT registered (confirmed by clearing stale cache).

## 10. Future deployment topology: Vercel + Neon (consideration, NOT current architecture)

The platform is designed around the **Docker Compose topology above** — that is what is implemented and verified (Sprint 12 Phase C). A future split (frontend → Vercel, database → Neon/managed Postgres) is recorded **as a deployment consideration only**; no part of this section is implemented or provisioned, and no domain, provider, credential or exact production URL is invented or implied:

- **Frontend on Vercel calls the API over a real HTTPS backend URL.** TLS must terminate on the external gateway in front of the edge nginx (the edge nginx itself never terminates TLS — no 443 vhost exists).
- `APP_URL` (root `.env`) must point to the real application URL — it feeds backend absolute URLs (emails, storage) **and** is inlined into the frontend build as `NEXT_PUBLIC_APP_URL` (single variable, phase C-1).
- `FRONTEND_URL` must point to the real Vercel frontend origin — the CORS allowlist (`config/cors.php`) and the Sanctum stateful-domain source (`config/sanctum.php`) are derived from it.
- `SANCTUM_STATEFUL_DOMAINS` must match the actual frontend domain per the current cookie/SameSite rules: cookie auth only crosses **same-site** requests today (`SameSite=strict`, host-only cookie). A Vercel frontend on a **different registrable domain** than the API would need `SameSite=None` + Secure (plus `SESSION_DOMAIN` only when both share one host) — see the `config/session.php` header comment.
- **Database-backed queue/cache must remain supported on Neon:** the queue default is the **database** driver (`jobs` table); cache/session defaults are file-backed. A hosted Postgres (permissions to create `jobs`/`cache` tables) is sufficient. No Redis is used or required by the shipped deployment (Phase 4A, P1-01).
- **Public media storage** is currently the backend `public/storage` (Docker `backend_storage` volume, served with 1y cache headers through nginx). Moving the backend off the Docker volume topology requires object storage or static hosting for `public/storage` content. AWS/S3 wiring exists in `config/filesystems.php` but is **not provisioned and no provider is chosen here**.
- Set `SESSION_SECURE_COOKIE=true` in any HTTPS topology — the external gateway does not rewrite cookies.
- **Nothing in this section was implemented in Phase C** — it is a readiness record so a future split is deliberate, not accidental.