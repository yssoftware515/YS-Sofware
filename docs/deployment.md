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

## 5. Vercel deployment (approved production platform)

Vercel is the only approved production hosting platform. Render, Railway, VPS, and other providers are **not** used. `render.yaml` has been deleted.

### 5.1 Architecture

| Component | Platform | Notes |
|---|---|---|
| Frontend | Vercel (Next.js 16, native) | `ys-web/` directory, auto-detected by Vercel |
| Backend | Vercel Functions (Container Runtime, Beta) | `ys-api/Dockerfile.vercel` (FrankenPHP + Caddy) |
| Database | Neon (Lakebase Postgres) ✅ provisioned | `DATABASE_URL` → direct endpoint, `sslmode=require` — see §5.9 |
| Queue | Vercel Daemons + database jobs table | `php artisan queue:work` as a daemon; `QUEUE_CONNECTION=database` |
| Scheduler | Vercel Cron → authenticated HTTP endpoint | `php artisan schedule:run` via cron-triggered route |
| Storage | Ephemeral container FS | Uploads use external object store (Vercel Blob / S3) |
| TLS | Vercel-managed | `SESSION_SECURE_COOKIE=true`, `REQUIRE_TLS=true` |

### 5.2 Project structure for Vercel

```
vercel.json              # Service definitions + rewrites (project root)
ys-api/Dockerfile.vercel # Backend container (FrankenPHP + Caddy)
ys-api/Caddyfile         # Caddy config: listens on $PORT, PHP server
ys-web/                  # Next.js 16 (Vercel-native, no Dockerfile needed)
```

### 5.3 Routing (`vercel.json`)

| Path | Destination |
|---|---|
| `/api/:path*` | Backend service (container) |
| `/sanctum/:path*` | Backend service (container) |
| `/(.*)` | Frontend service (Next.js) |

### 5.4 Backend container (`Dockerfile.vercel`)

Based on the official [Vercel Laravel with Docker guide](https://vercel.com/kb/guide/laravel-php-with-docker):

- **Runtime:** `dunglas/frankenphp:1-php8.4-bookworm` (PHP + Caddy)
- **Extensions:** `pdo_pgsql`, `zip`, `opcache`, `mbstring`
- **Port:** Listens on `$PORT` (Vercel injects, defaults to 80)
- **No startup migrations:** Migrations run as a separate CI/release step (multiple instances must not run migrations concurrently)
- **No build-time config caching:** `APP_KEY`, `DB_*` etc. are resolved at runtime from Vercel env vars
- **Logs:** `LOG_CHANNEL=stderr` (Vercel captures stdout/stderr)
- **User:** `www-data` (non-root)
- **File system:** Ephemeral — uploads must go to external object storage

### 5.5 Queue & Scheduler

**Queue:** Laravel's database queue driver (`QUEUE_CONNECTION=database`) writes jobs to the `jobs` table in PostgreSQL. A **Vercel Daemon** runs `php artisan queue:work` continuously as a container-backed background process. Daemons run in production only (Beta; not in preview deployments).

**Scheduler:** No persistent scheduler process on Vercel Functions. Use **Vercel Cron** to call an authenticated HTTP endpoint (e.g. `POST /api/v1/schedule/run`) which executes `php artisan schedule:run`. The endpoint must be protected by auth middleware.

### 5.6 Environment variables (Vercel dashboard)

Set these in the Vercel project settings → Environment Variables:

**Backend (all environments):**
- `APP_KEY` — `php artisan key:generate --show` output (stable per environment)
- `APP_ENV=production`, `APP_DEBUG=false`
- `DATABASE_URL` — the Neon **direct** endpoint (see §5.9). Laravel reads it automatically; it overrides every `DB_*` value.
- `LOG_CHANNEL=stderr`
- `TRUSTED_PROXIES=REMOTE_ADDR` — **required on Vercel**. `private_ranges` only trusts RFC 1918/4193 addresses, and Vercel's edge is on a *public* IP, so that value trusts nobody: `X-Forwarded-Proto` is ignored, `$request->secure()` is false, and the VULN-09 TLS gate answers **every** API request with `403 TLS_REQUIRED`. The frontend swallows that error and renders empty pages. `REMOTE_ADDR` trusts exactly the peer that opened the connection — on Vercel that is always Vercel's own proxy, because the container is not reachable from the internet directly — and Vercel documents that it overwrites `X-Forwarded-For` with the real client IP, so trusting the peer opens no spoofing hole.
- `SANCTUM_STATEFUL_DOMAINS` — frontend domain(s), comma-separated
- `SESSION_SECURE_COOKIE=true`, `REQUIRE_TLS=true`
- `CACHE_STORE=database`, `SESSION_DRIVER=database` — **required on Vercel**. The container filesystem is ephemeral and Vercel runs several instances, so a file-backed cache/session lives on one instance's disk and dies with it: the CSRF handshake breaks (the XSRF token is derived from the session) and a cached response can differ per instance. The `cache`, `cache_locks` and `sessions` tables already exist in the schema, so both stores work against Neon without any extra migration. Docker Compose keeps `file` for both — there the volume persists them and the file store is faster.
- `MAIL_*` — SMTP credentials

**Frontend (build-time):**
- `NEXT_PUBLIC_API_URL` — `https://<backend-domain>.vercel.app/api/v1`
- `NEXT_PUBLIC_APP_URL` — `https://<frontend-domain>.vercel.app`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key

### 5.7 Known limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| Container FS is ephemeral | Uploads lost on instance recycle | External object store (Vercel Blob / S3) |
| Cache/session are file-based | Not shared across instances | Use database/Redis for shared state if needed |
| Daemons: production only | No background workers in preview | Accept preview limitation; test queue via HTTP |
| No `schedule:work` process | Scheduled tasks need Cron + HTTP endpoint | Vercel Cron → authenticated route |
| Neon region latency | ~360 ms/query from an un-pooled European connection | Keep compute close to the app region; Neon autoscaling absorbs bursts |

### 5.8 Deployment steps

1. Push code to GitHub
2. Import repository in Vercel dashboard
3. Vercel detects `vercel.json` with services → deploys frontend (Next.js) + backend (container)
4. Set environment variables in Vercel project settings
5. Run `php artisan migrate --force` via a one-off deployment step or CI
6. Configure Vercel Daemon for queue worker
7. Configure Vercel Cron for scheduler
8. Verify `/api/v1/health` and `/health/live` respond

- **K-34 stays deferred:** no Laravel scheduled commands exist (`routes/console.php` absent, no `schedule()` calls), so the `scheduler` container is idle by design; `php artisan schedule:work` is wired for when real schedules are added.

### 5.9 Neon database (Lakebase Postgres) ✅ provisioned

Neon is the production database: project `ys-software` (`twilight-firefly-29528763`), branch `production` (`br-proud-pond-b9uc2jwb`), region `aws-eu-central-1`, Postgres 18.

| Item | Value |
|---|---|
| Direct endpoint | `ep-shy-paper-b9vez1a1.c-7.eu-central-1.aws.neon.tech:5432` |
| Pooled endpoint | `ep-shy-paper-b9vez1a1-pooler.c-7.eu-central-1.aws.neon.tech:5432` |
| Database / role | `neondb` / `neondb_owner` |
| SSL | `sslmode=require`, `channel_binding=require` |
| Compute | 0.25–2 CU, autoscaling; `max_connections = 901` |

**⚠ The pooled (`-pooler`) endpoint must NOT be used by this application.** It was measured directly: any transaction containing two or more statements fails with `SQLSTATE 25P02 — current transaction is aborted` (0 of 15 multi-statement transactions succeeded on the pooled endpoint versus 15 of 15 on the direct endpoint). Two things in the app depend on multi-statement transactions:

- The database queue pops a job with `SELECT … FOR UPDATE SKIP LOCKED` inside a transaction.
- `DB::transaction()` is used by the contact-request → customer conversion and the milestone reorder paths.

Therefore `DATABASE_URL` points at the **direct** endpoint. With `max_connections = 901` there is ample headroom for Vercel to run hundreds of concurrent function instances.

**The pooled endpoint is retained for reference** as `DATABASE_URL_POOLED` (in `ys-api/.env`, and in the Neon-generated `.env.local`). It becomes usable again only if the application's transaction usage is reworked so that no request ever issues two statements in one transaction.

**Files:**

| File | Role |
|---|---|
| `neon/neon.ts` | Neon infrastructure-as-code — declares the Postgres service and the per-branch policy. `auth: false` because the application manages its own authentication (Laravel Sanctum). |
| `neon/package.json` | Declares the `@neon/config` dependency the CLI needs to evaluate `neon.ts`. |
| `neon/.neon` | Local link file (org / project / branch). Git-ignored. |
| `.env.local` | Neon-generated environment variables (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, branch metadata). Git-ignored. |
| `ys-api/.env` | The values the backend actually reads at runtime. Git-ignored. |

**⚠ The Neon tooling lives in `neon/`, never at the repository root.** A `package.json` at the repository root changes how Vercel installs dependencies for the frontend service: the root install prunes the `@vercel/turbopack-next` shim that Vercel injects for Turbopack's `next/font/google` loader, and the Next.js build then fails with *"Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'"*. Keeping the Neon config in its own directory leaves the repository root exactly as it was before the Neon work, so the frontend build behaves as it did on the first successful deployment.

**Migrations** must run against the **direct** endpoint (`DATABASE_URL_UNPOOLED`) — the same string as `DATABASE_URL` — because schema migrations hold a transaction open across many statements.

**⚠ The test suite must never target Neon.** `ys-api/phpunit.xml` clears `DATABASE_URL` explicitly. Laravel's `ConfigurationUrlParser` lets `DATABASE_URL` override every `DB_*` value, so without that line the suite would run `RefreshDatabase` against the production database and wipe it. With the variable cleared, the suite uses the local `ys_api_test` database (same as CI).

**Useful commands** (run from the `neon/` directory):

```bash
cd neon
neon config status          # live branch configuration
neon config plan            # dry-run diff of neon.ts against the branch
neon deploy                 # apply neon.ts and re-pull env vars
neon branches list          # list branches
```


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

## 10. Deployment topology notes (provider-agnostic)

The platform is designed around the **Docker Compose topology above** (§1) — that is what is implemented and verified (Sprint 12 Phase C). The backend connects to PostgreSQL via the generic Laravel `pgsql` driver (`config/database.php`, `DATABASE_URL` supported); the host `.env` / compose `envVars` supply `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` at deploy time. The production deployment target is **Vercel** (§5) with **Neon** as the database provider (§5.9) — the Docker Compose stack remains the local development and test environment.

- **Database:** any PostgreSQL 16+ instance (self-hosted Docker `postgres:16-alpine` in compose, or a managed PostgreSQL from any provider) works — the connection parameters are environment-injected. No provider-specific settings are hard-coded. Neon is the provisioned production instance (§5.9); its one real constraint is that the **pooled** endpoint cannot carry this app's multi-statement transactions, so `DATABASE_URL` uses the direct endpoint.
- **Cache/queue:** default drivers are `file` (cache) and `database` (queue, `jobs` table). No Redis is used or required (Phase 4A, P1-01; `predis/predis` was removed from `composer.json` in Group H).
- **Frontend:** build-time args `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` are inlined at `next build`.
- **Media storage:** `public/storage` via the Docker `backend_storage` volume, served through the backend nginx with 1y cache headers. `config/filesystems.php` retains AWS/S3 wiring but **no provider is provisioned** — on Vercel the container filesystem is ephemeral, so uploads need Vercel Blob or S3.
- **TLS:** terminated by an external gateway in front of the edge nginx (`X-Forwarded-Proto` is passed). The edge nginx itself never terminates TLS (no 443 vhost). Set `SESSION_SECURE_COOKIE=true` when TLS terminates externally.
- **Nothing in this section references a live production environment** — real host paths, secrets (`DEPLOY_HOST`, `DEPLOY_URL`, `APP_KEY`, `DB_PASSWORD`, …) come from GitHub environment secrets and are not present in the repository. The Neon connection string likewise lives only in git-ignored files (`.env.local`, `ys-api/.env`), never in the repository.
