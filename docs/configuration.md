# Configuration

**Verification:** ✅ verified from files · ⚠️ inferred · ❓ unknown

---

## 1. Root (.env.example + docker-compose.yml) — ✅ verified

| Variable | Default | Purpose |
|---|---|---|
| `APP_ENV` | production | backend env |
| `APP_DEBUG` | false | backend debug |
| `APP_VERSION` | 1.0.0 | docker image tag suffix |
| `APP_URL` | https://ys-systems.com | canonical app URL — backend absolute URLs (emails, storage) **and**, inlined at build time, the frontend `NEXT_PUBLIC_APP_URL` (canonical tags, JSON-LD, sitemap). One value per environment (C-1). |
| `FRONTEND_PORT` | 3000 | frontend host port |
| `NODE_ENV` | production | frontend mode |
| `API_URL` | http://localhost:8000 | **note:** root uses API_URL (no /api/v1); the frontend's own env uses NEXT_PUBLIC_API_URL with /api/v1 |
| `BACKEND_PORT` | 8000 | backend host port |
| `DB_*` | pgsql / database / 5432 / ys_platform / ys_app / (app password) | database config — app connects as least-privilege `ys_app`, never the superuser (VULN-08) |
| `DB_SUPERUSER(_PASSWORD)` | postgres / (required) | cluster superuser — migrations/bootstrap/ops only (VULN-08) |
| `MAIL_*` | mailhog / 1025 | mail (dev) |
| `NGINX_PORT` | 80 | nginx — the only public port; **no 443** (no TLS vhost exists; TLS terminates on an external gateway, see deployment.md) |
| `GRAFANA_PORT` | 3001 | grafana host port |
| `GRAFANA_PASSWORD` | (none — required) | production profile only; compose fails fast (`:?`) when unset — no default 'admin' credential |
| `DOCKER_TARGET` | runner | Docker multi-stage target |

## 2. Backend env keys (✅ from `ys-api/.env.example`)

`APP_NAME, APP_ENV, APP_KEY, APP_DEBUG, APP_TIMEZONE, APP_URL, APP_LOCALE, APP_FALLBACK_LOCALE, APP_FAKER_LOCALE, LOG_CHANNEL, LOG_STACK, LOG_DEPRECATIONS_CHANNEL, LOG_LEVEL, DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD, CACHE_STORE, SESSION_DRIVER, SESSION_LIFETIME, SESSION_ENCRYPT, SESSION_SAME_SITE, QUEUE_CONNECTION, MAIL_MAILER, MAIL_FROM_ADDRESS, MAIL_FROM_NAME, MAIL_ADMIN_ADDRESS, FRONTEND_URL, SANCTUM_STATEFUL_DOMAINS, BCRYPT_ROUNDS, FILESYSTEM_DISK, MEDIA_MAX_FILE_SIZE, RATE_LIMIT_PUBLIC_API, RATE_LIMIT_AUTH_ATTEMPTS, RATE_LIMIT_CONTACT`

> **No Redis keys**: the stack is deliberately DB/file-backed (Phase 4A, P1-01) — `CACHE_STORE=file`, `SESSION_DRIVER=file`, `QUEUE_CONNECTION=database` are the shipped model; there is no REDIS_* surface in `.env.example` or compose. The `predis/predis` dependency and the framework's redis store definitions remain as dormant, optional future capability only.

✅ `MAIL_ADMIN_ADDRESS` is documented in both `.env.examples` and passed through compose (backend + queue-worker). `config/mail.php` no longer falls back to a hardcoded address — `SendContactRequestNotificationJob` logs a warning and skips when it is unset (K-31 resolved).

## 3. Backend config files (✅ verified)

| File | Key settings |
|---|---|
| `config/security.php` | **rate_limits** (env-overridable): public_api 120, auth_attempts 5, auth_attempts_captcha 10, auth_per_email 10, contact 3, contact_email 2, search 60, forgot 5, forgot_per_email 3, admin_throttle 300. **auth_lockout** (VULN-15 escalation, env `AUTH_LOCKOUT_ESCALATION_HOURS`=24): tiers 5 failures→60s, 10→300s, ∞→1800s. **captcha.turnstile** (GAP-01): enabled = env `TURNSTILE_ENABLED` (default false), keys `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`; fail-closed when enabled without secret. **uploads**: max_file_size env `MEDIA_MAX_FILE_SIZE`=10240 KB; allowed MIME jpeg/png/webp/gif/svg+xml/pdf; blocked extensions php*/phtml, exe, sh, bat, cmd, com, js, ts, html, htm, py, rb, pl. **session**: admin_token_ttl_hours 8, admin_token_remember_days 30, idle_timeout_hours = env `SESSION_IDLE_TIMEOUT_HOURS` (default 2, VULN-14 sliding). **cookies**: `ys_admin_token` (env `AUTH_COOKIE_NAME`), domain env `AUTH_COOKIE_DOMAIN` (default host-only), secure env `AUTH_COOKIE_SECURE`, partitioned env `AUTH_COOKIE_PARTITIONED`=false (set true in production). **proxy.trusted_cidrs** = env `TRUSTED_PROXIES` (default `''` = no trusted proxy; consumed in `bootstrap/app.php` booted() → TrustProxies, P6-03). **tls.require_tls** = env `REQUIRE_TLS` (default: on in production; health probes exempt) |
| `config/logging.php` | Phase 6 (P6-02): `default` = env `LOG_CHANNEL` (default `daily`); `daily` channel → `storage/logs/laravel.log`, level env `LOG_LEVEL` (default info), retention **14 days**; `single` (same path, unbounded), `stderr`, `syslog`, `errorlog`, `null`, `emergency` channels. ✅ K-37 RESOLVED: `ys-api/.env.example` ships `LOG_CHANNEL=daily` (was `stack`), so the effective runtime default is `daily` with 14-day retention (verified: `config('logging.default')` = daily, `daily.days` = 14, `Log::getDefaultDriver()` = daily). Framework base config still merges its own channels into `logging.channels`, so `stack`/`slack`/`papertrail` exist regardless of this file, but nothing sets `LOG_CHANNEL=stack` anymore. |
| `config/sanctum.php` | `stateful` = localhost domains + FRONTEND_URL host; `expiration` null; `token_prefix` `ys_admin_` |
| `config/cors.php` | paths `api/*`, methods `*`, origins = FRONTEND_URL (default localhost:3000), headers `*`, supports_credentials true |
| `config/purifier.php` | `cms` profile (allow-list for admin rich text) |
| `config/mail.php` | full mailer config (default `MAIL_MAILER`=log local / smtp in compose; mailers smtp/log/array/failover; `from` = MAIL_FROM_*) + `admin_address` (env `MAIL_ADMIN_ADDRESS`, REQUIRED — no hardcoded fallback) |

> ⚠️ Implemented but **absent from `ys-api/.env.example`** (documented in docs/deployment.md only): `TRUSTED_PROXIES` and `REQUIRE_TLS` (both have safe production defaults in `config/security.php`). `SESSION_IDLE_TIMEOUT_HOURS` and the `TURNSTILE_*` keys **are** present in the example file.

## 4. Frontend env keys (✅ from `ys-web/.env.example`)

| Variable | Default | Used by |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | http://localhost:8000/api/v1 | API client, next.config CSP + image remote patterns |
| `NEXT_PUBLIC_APP_URL` | (set per env) | canonical/JSON-LD absolute URLs |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | — | Google site verification meta |
| `NEXT_PUBLIC_BING_VERIFICATION` | — | Bing site verification meta |
| `NEXT_PUBLIC_YANDEX_VERIFICATION` | — | Yandex site verification meta |
| `NEXT_PUBLIC_INDEXNOW_KEY` | — | IndexNow protocol key |
| `NEXT_PUBLIC_BUILD_NUMBER` | — | build traceability (set by CI) |

## 5. Frontend build-time behavior (✅ `next.config.ts`)

- CSP header derived from `NEXT_PUBLIC_API_URL` origin (`connect-src`, `img-src`).
- `images.remotePatterns` = API origin `/storage/**`.
- `compress: true`, `poweredByHeader: false`, image formats avif/webp.
- Security headers on all routes: X-DNS-Prefetch-Control, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy, CSP.

## 6. Runtime vs build-time env (✅)

- `NEXT_PUBLIC_*` vars are inlined at build time (Next.js convention). Values reach the build via the compose `build.args` for `NEXT_PUBLIC_API_URL` (root var `API_URL`) and `NEXT_PUBLIC_APP_URL` (root var `APP_URL`, C-1), and via the release workflow repo vars. The frontend container receives only `NODE_ENV` at runtime — the inlined values cannot be changed after the image is built.
- ⚠️ Consequence: one image = one baked API/canonical URL. CI builds images per tag/event; if one image were ever deployed to multiple environments, the URLs would be stale. The build must stay per-environment.

## 7. Scheduler (⚠️)

Docker runs `php artisan schedule:work`, but there are **no scheduled tasks** defined (`routes/console.php` absent, no `schedule()` calls found). The scheduler service is effectively idle.

## 8. Missing/undefined config (❓)

- `config/filesystems.php` — default Laravel (local). S3 not wired. ❓
- No Horizon config (SETUP.md mentions Horizon as production queue; not installed — composer.json has no horizon). ✅ verified absence.
- No Telescope. ✅
- No backup/restore config, no monitoring datasources provisioning. ✅
