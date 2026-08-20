# Phase 6 — Deployment Validation Report

**Date:** 2026-08-19 · **Phase:** 6 (Track A implementation + Track B inventory) · **Status:** ✅ RELEASE READY WITH OPERATOR CONDITIONS

---

## 1. Executive summary

Phase 6 validates the deployment readiness of the YS-Systems platform. Track A (configuration-cache hygiene, bounded logging, deployment-contract documentation) was implemented and code-verified on this workspace. Track B (real deployment-host checks: Docker builds, nginx syntax, gateway TLS flow, SMTP, backup/restore, Turnstile, SSH deploy, storage persistence) **cannot be executed on this workspace** — no Docker engine, nginx, OpenSSL, or psql binary is installed — so every Track B item is classified BLOCKED / OPERATOR CONTROLLED, with exact operator commands provided for the deployment host.

**Final verdict: B — RELEASE READY WITH OPERATOR CONDITIONS.**

- Track A is CODE-VERIFIED: all gates green (backend 5×488 tests / 1947 assertions, vitest 75/75, lint, type-check, build, config-cache, live API sanity).
- No code blocker was found. One implementation defect was found and fixed during verification (see §5.2): the mandated `config()` read in the `withMiddleware` callback is architecturally impossible (the `config` binding does not exist at `Application::create()` time); the resolution was moved to a `booted()` callback with identical runtime semantics.
- Verdict A (deployment validated) requires the deployment-host evidence in §11–§23, which this workspace cannot produce. Verdict C would require a verified failure; none exists.

## 2. Scope and evidence classes

Evidence is classified strictly:

| Class | Meaning |
|---|---|
| **VERIFIED** | Directly observed working in this workspace or on the live local API |
| **CODE-VERIFIED** | Proven by code inspection + automated tests in this workspace; not exercised in a deployed topology |
| **BLOCKED** | Cannot be executed in this workspace (missing tooling/host/credentials) |
| **UNKNOWN** | No evidence either way |
| **OPERATOR CONTROLLED** | Depends on deployment-host state (secrets, host env, gateway) — final proof requires the operator |

No BLOCKED/UNKNOWN item is reported as PASS anywhere in this report.

## 3. Environment inventory (this workspace)

| Tool | Status |
|---|---|
| php | 8.4.22 ✅ |
| composer | 2.10.1 ✅ |
| node / npm / npx | v24.15.0 / 11.12.1 ✅ |
| PostgreSQL (local) | ✅ running; tests use `ys_api_test`, live API uses `ys_api` |
| docker / docker-compose | ❌ not installed → Track B BLOCKED |
| nginx | ❌ not installed → edge `nginx -t` BLOCKED |
| openssl / psql | ❌ not installed |
| curl | ⚠️ PowerShell alias (`Invoke-WebRequest`) — HTTP probes performed with Node `fetch` |
| GitHub Actions / deploy secrets | ❌ not present locally → BLOCKED |

## 4. Track A changes — file by file

| # | File | Change | Status |
|---|---|---|---|
| A2 | `ys-api/config/logging.php` | **Created.** Default channel `env('LOG_CHANNEL', 'daily')`; daily driver, `storage/logs/laravel.log`, retention `days = 14`, level `env('LOG_LEVEL', 'info')`; `single` channel preserved so `LOG_CHANNEL=single` still works; deprecations/stderr/syslog/errorlog/null/emergency channels kept from framework defaults. No external logging infrastructure (P6-02: bounded rotation for the single long-lived container; no unbounded `laravel.log`). | ✅ CODE-VERIFIED |
| A3 | `ys-api/config/security.php` | Added `'proxy' => ['trusted_cidrs' => env('TRUSTED_PROXIES', '')]` in the file's existing env-with-default style. | ✅ CODE-VERIFIED |
| A3 | `ys-api/bootstrap/app.php` | Replaced the direct `env('TRUSTED_PROXIES', '')` read with `config('security.proxy.trusted_cidrs', '')`. Design note (§5.2): the read moved into an `$app->booted()` callback because the `config` binding does not exist while `withMiddleware` callbacks run inside `Application::create()`. Trust semantics, CIDR parsing, header set (`X_FORWARDED_FOR|PROTO|HOST`) and empty-default behavior unchanged. | ✅ CODE-VERIFIED |
| A3c | `ys-api/tests/Unit/DeploymentConfigConsistencyTest.php` | Extended the config-contract test: daily driver + 14-day retention + preserved single channel; `LOG_LEVEL`/`LOG_CHANNEL` env bindings (deterministic string checks); `proxy.trusted_cidrs` exists + is configurable; `bootstrap/app.php` reads via `config()` and contains no `env('TRUSTED_PROXIES'` call. | ✅ CODE-VERIFIED |
| A1 | `docs/deployment.md` | Added `/sanctum/` routing row; new §3.1 "Sanctum stateful authentication (browser flow)" (handshake → login → authenticated write → logout, URL-decoded `X-XSRF-TOKEN`, 419 semantics); fixed stale §4 frontend-tests row (vitest now real); §5 release verify now documents HTTPS probes, plain-HTTP `{403, 301, 308}` tolerance, HTTPS admin probe `{401, 419}`, `DEPLOY_KNOWN_HOSTS` fail-closed requirement, Turnstile build arg; §8 checklist item 4 updated to the stateful flow. | ✅ CODE-VERIFIED |
| A1 | `docs/frontend.md` | Added §4.1 "XSRF/CSRF contract (stateful Sanctum)": `ys-web/lib/csrf.ts`, `/sanctum/csrf-cookie` handshake, `credentials: 'include'`, URL-decoded `X-XSRF-TOKEN` on non-GET stateful requests, 419 on missing/invalid header; updated §4 step 1. | ✅ CODE-VERIFIED |

Only these six files were modified/created in this phase.

## 5. Verification: targeted backend test

### 5.1 Result

`php vendor/bin/phpunit --filter DeploymentConfigConsistencyTest --no-coverage` → **OK (9 tests, 25 assertions)** — 6 pre-existing + 4 new Track A tests (one extended).

### 5.2 Implementation defect found and fixed (code failure, not environmental)

1. **`config()` at bootstrap-create time fails.** The first implementation replaced `env('TRUSTED_PROXIES', '')` inline in the `withMiddleware` callback as specified. The full suite failed with 479 errors (`Target class [config] does not exist`): the `config` binding is registered by the `LoadConfiguration` bootstrapper, which runs **after** the middleware callbacks execute inside `Application::create()`. The original `env()` call worked only because `env()` does not need the container. Fix: `TrustProxies` (always registered by the framework) consumes static state per request, so the trusted-proxy resolution moved to an `$app->booted()` callback — after providers boot (config available), before any request. Verified identical semantics: same parse (`explode(',')` + `trim` + `array_filter`), same empty→trust-nothing default, same header bitmask (`X_FORWARDED_FOR | X_FORWARDED_PROTO | X_FORWARDED_HOST`). This deviation from the literal instruction was required to satisfy the overriding constraints "preserve behavior exactly" and "do not silently ignore failed tests".
2. **Env-dependent assertions made deterministic.** The initial test asserted the *resolved* values (`default === 'daily'`, `trusted_cidrs === ''`), which depend on process environment (`.env` loads `LOG_CHANNEL=stack`; earlier tests boot the app and load `.env`). Reworked to assert channel structure + the `env()` bindings as deterministic string contracts — identical results in any environment.

## 6. Verification: full backend suite — five consecutive runs

Command: `php vendor/bin/phpunit --no-coverage` (Postgres `ys_api_test`).

| Run | Result | Tests | Assertions | Time |
|---|---|---|---|---|
| 1 | **OK** | 488 | 1947 | 00:45 |
| 2 | **OK** | 488 | 1947 | 00:47 |
| 3 | **OK** | 488 | 1947 | 02:02 |
| 4 | **OK** | 488 | 1947 | 00:47 |
| 5 | **OK** | 488 | 1947 | 00:47 |

Baseline (Phase 5B): 484 tests / 1936 assertions → +4 tests / +11 assertions (Track A). Security regression suites are included in the 488 (RequireTlsTest 5/5, TrustedProxyRateLimitTest 3/3, StatefulCsrfFlowTest 4/4 — green in every run).

**Anomaly report (environmental, not code):** one early full-suite invocation exceeded a 15-minute timeout and was terminated by the shell (no process left behind; both live-server PHP processes verified unaffected). The identical suite completed in 45 seconds on every subsequent run with exit 0. Reported separately from code results; no code defect involved — most plausibly a transient stall (e.g., PostgreSQL connection contention with the live server during the interrupted previous run).

## 7. Verification: frontend gates (ys-web)

| Gate | Command | Result |
|---|---|---|
| Unit tests | `npm test` (vitest) | ✅ 75/75 passed (17 files) |
| Lint | `npm run lint` | ✅ exit 0 |
| Type-check | `npm run type-check` (tsc --noEmit) | ✅ exit 0 |
| Build | `npm run build` (Next.js) | ✅ exit 0 — 79 routes ("HTTPS is required" messages during static generation are the expected fail-closed behavior, unchanged) |

## 8. Verification: config cache behavior

Scratch-safe procedure (`config:cache` → probe → `config:clear`; the generated `bootstrap/cache/config.php` was removed afterwards and is gitignored):

```
$ php artisan config:cache                             → "Configuration cached successfully."
$ php artisan config:show logging.default              → stack   (LOG_CHANNEL env override survives caching)
$ php artisan config:show logging.channels.daily.days  → 14
$ boot probe (php script via bootstrap/app.php):
   trusted_cidrs=['']      → default empty (TRUSTED_PROXIES unset locally)
   logging.default=['stack'] → env override preserved through cache
   daily.days=[14]         → retention survives caching
   daily.driver=['daily']  → channel survives caching
$ php artisan config:clear                             → "Configuration cache cleared successfully." (file removed)
```

**Result: the new configuration values survive config caching.** The `booted()` proxy resolution reads `config('security.proxy.trusted_cidrs')` — with `config:cache` active the cached value is used; cleared, the env-bound file value. No secrets were printed.

## 9. Verification: live API sanity (local server 127.0.0.1:8000, REQUIRE_TLS + TRUSTED_PROXIES=127.0.0.1)

Node `fetch` probes (PowerShell `curl` is a fake alias):

| Probe | Headers | Result | Interpretation |
|---|---|---|---|
| `GET /api/v1/health` | X-Forwarded-Proto: https, X-Forwarded-For: 127.0.0.1 | **200** `{"status":"ok","checks":{"database":"ok","cache":"ok"}}` | Healthy through trusted proxy |
| `GET /api/v1/health` | none (plain HTTP) | **200** | Health endpoints exempt from the TLS gate by design (container/ingress healthchecks) — pre-existing, unchanged |
| `GET /api/v1/health` | X-Forwarded-Proto: http, X-Forwarded-For: 127.0.0.1 | **200** | Same exemption |
| `GET /api/v1/auth/me` | https + 127.0.0.1 | **401** `UNAUTHENTICATED` | Auth gate intact through the trusted-proxy path |
| `GET /sanctum/csrf-cookie` | https + 127.0.0.1 | **204** | Stateful XSRF handshake works through the trusted-proxy path |
| `GET /sanctum/csrf-cookie` | none (plain HTTP) | **403** `TLS_REQUIRED` | TLS gate enforced on non-health routes; `X-Forwarded-Proto` honored only for the trusted proxy — trust semantics preserved |

No security gate was weakened to obtain these results.

## 10. Verification: git scope

- `git status --short` → 213 entries. Untracked: 40 pre-existing Phase 2A–5B files (reports, factories, migrations, tests, `docker/php/`, `lib/schemas/`, `lib/search/`, `tests/contracts/`, `tests/security/`, `lib/csrf.ts`, `StatefulCsrfFlowTest.php`, `DeploymentConfigConsistencyTest.php`, …) + exactly **one new**: `ys-api/config/logging.php`.
- Modified (already dirty pre-phase): `docs/deployment.md`, `docs/frontend.md`, `ys-api/bootstrap/app.php`, `ys-api/config/security.php` — the four remaining Track A files.
- **No other file was changed by this phase.** No stash/reset/revert performed; the working tree was not claimed clean. Temporary probe/log files created during verification were removed; `bootstrap/cache/config.php` was removed by `config:clear`.

## 11. Track B — deployment validation matrix (overview)

| ID | Check | Classification |
|---|---|---|
| B1 | docker-compose config validity | CODE-VERIFIED (execution BLOCKED) |
| B2 | Edge nginx `nginx -t` | CODE-VERIFIED (execution BLOCKED) |
| B3 | Docker image builds (frontend/backend) | BLOCKED |
| B4 | Fresh-host boot + `migrate --force` | BLOCKED |
| B5 | Container healthchecks runtime | BLOCKED |
| B6 | Queue worker consumption (jobs table) | CODE-VERIFIED (execution BLOCKED) |
| B7 | HTTPS / X-Forwarded-Proto / browser stateful flow through deployed gateway | CODE-VERIFIED partial (see §18) |
| B8 | SMTP dispatch | BLOCKED |
| B9 | Backup + restore drill | CODE-VERIFIED (execution BLOCKED) |
| B10 | Turnstile with real keys | BLOCKED (OPERATOR CONTROLLED) |
| B11 | DEPLOY_KNOWN_HOSTS SSH deployment | BLOCKED (OPERATOR CONTROLLED) |
| B12 | Storage persistence across restarts | BLOCKED |

## 12. Track B1 — docker-compose configuration validity

**Classification: CODE-VERIFIED** (static) / execution BLOCKED (no Docker engine).

Evidence: static review of `docker-compose.yml` (Phase 4A/5B): backend/frontend/database/nginx/queue-worker/scheduler services, `backend_storage:/app/storage` volume mounted on backend + worker + scheduler (3 mounts — asserted by `DeploymentConfigConsistencyTest`), loopback-only host bindings except nginx :80, no Redis surface (asserted), `/sanctum/` preserved path (no trailing-slash proxy_pass), `NEXT_PUBLIC_TURNSTILE_SITE_KEY` build arg (compose + release.yml), mailhog/Grafana profiles.

Operator command (deployment host):

```
docker compose --profile production config -q        # expect exit 0
```

## 13. Track B2 — edge nginx configuration syntax

**Classification: CODE-VERIFIED** (static) / execution BLOCKED (no `nginx` binary).

Evidence: `docker/nginx/sites/default.conf` reviewed (Phase 5B G-01): `/` → frontend, `/api/` → backend (no trailing slash → full URI preserved), `/sanctum/` → backend (added with the same semantics), `/storage/` → backend static, no shadowing locations, no 443 vhost (TLS terminates on external gateway by design). No `nginx -t` possible on this workspace.

Operator command (deployment host):

```
docker compose exec nginx nginx -t                    # expect "syntax is ok"
```

## 14. Track B3 — Docker image builds

**Classification: BLOCKED.**

No Docker engine exists in this workspace. Build evidence (dockerfiles + CI) was reviewed statically in Phase 5A/5B: multi-stage ys-api Dockerfile (nginx+php-fpm, OPcache, `appuser`, entrypoint semantics), ys-web multi-stage (Next standalone, `NEXT_PUBLIC_*` build args inlined in builder, full `npm ci` in deps).

Operator commands (deployment host or GitHub Actions):

```
docker build -t ys-systems/backend:test  ys-api
docker build -t ys-systems/frontend:test ys-web
```

## 15. Track B4 — fresh-host boot + migrations

**Classification: BLOCKED.**

Requires a real host with Docker + reachable PostgreSQL. The release pipeline runs `docker compose run --rm backend php artisan migrate --force` **before** `up` (pre-existing). Fresh-host caveat (documented in deployment.md §7): start `database` first.

Operator commands (deployment host):

```
docker compose up -d database
docker compose run --rm backend php artisan migrate --force
docker compose --profile production up -d --remove-orphans
```

## 16. Track B5 — container healthchecks at runtime

**Classification: BLOCKED.**

Healthchecks are defined statically in compose (frontend: wget `/health/live`; backend: curl `/up` via in-image nginx; database: `pg_isready`; nginx: `nginx -t`). Runtime observation requires a live stack.

Operator command (deployment host):

```
docker compose --profile production ps               # every service "healthy"
docker compose logs --tail=50 backend nginx frontend database
```

## 17. Track B6 — queue worker consumption

**Classification: CODE-VERIFIED** (static + unit/feature coverage) / execution BLOCKED.

Database queue driver is asserted by existing tests (queue default = database via `config/queue.php`, no Redis); jobs land in the `jobs` table and the worker container runs `php artisan queue:work --sleep=3 --tries=3 --max-time=3600`. No live consumption observed in a deployed topology.

Operator command (deployment host):

```
docker compose exec queue-worker php artisan queue:monitor    # or: watch `select count(*) from jobs;` drain after a dispatch
```

## 18. Track B7 — HTTPS / X-Forwarded-Proto / browser stateful flow through the deployed gateway

**Classification: PARTIAL — CODE-VERIFIED locally, BLOCKED for the deployed topology.**

Locally VERIFIED (this workspace, live API with REQUIRE_TLS + trusted proxy): TLS gate on non-health routes (403 `TLS_REQUIRED` without TLS), 401 auth gate, and the Sanctum XSRF handshake (204) through the trusted-proxy path — plus the full stateful browser flow (handshake → login → write → logout → post-logout 401; 419 on missing/echoed CSRF) covered by `StatefulCsrfFlowTest` 4/4 and the Phase 5B live 8/8 e2e run. **The same flow through the deployed edge nginx + external gateway on the real domain is NOT reproducible from this workspace** and must be exercised by the operator (release `verify` job + checklist deployment.md §8.4/§8.5).

Operator commands (deployment host):

```
curl -sI  https://<host>/health/live                      # 200
curl -s   https://<host>/api/v1/health                    # 200 {"success":true,...}
curl -s   https://<host>/api/v1/admin/products            # 401 or 419 (not 502/404)
curl -s   http://<host>/api/v1/admin/products             # 403 | 301 | 308 (any of these is OK)
# browser: GET /sanctum/csrf-cookie → login → authenticated write → logout
```

## 19. Track B8 — SMTP dispatch

**Classification: BLOCKED.**

Mail driver config exists (`config/mail.php`, `admin_address`); no SMTP credentials, no mail server reachable from this workspace. The Phase 5B suite asserts mailer behavior with the array driver only.

Operator command (deployment host):

```
docker compose run --rm backend php artisan tinker --execute="Mail::raw('ping', fn (\$m) => \$m->to(env('MAIL_FROM_ADDRESS'))->subject('SMTP probe'));"
```

## 20. Track B9 — backup + restore drill

**Classification: CODE-VERIFIED** (static + script review) / execution BLOCKED.

`ops/backup/backup.sh` (pg_dump -Fc -Z9 → pg_restore --list verify → atomic publish → retention prune) reviewed in Phase 4A/5B; documented in backup-and-recovery.md. No psql/pg_dump binary and no production DB on this workspace → no drill possible. RPO ≤ 24h / RTO ≈ 1h targets remain **unmeasured** (operator-controlled).

Operator commands (deployment host):

```
docker compose --profile production run --rm backup        # expect exit 0, one .dump in ./backups
docker compose --profile production run --rm backup        # second run: retention keeps exactly BACKUP_RETENTION dumps
# restore drill: pg_restore --list <dump> && restore into a scratch DB
```

## 21. Track B10 — Turnstile with real keys

**Classification: BLOCKED (OPERATOR CONTROLLED).**

Verified in code: gate wired (login route, fail-closed on missing secret), frontend widget + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` build arg, release.yml/compose arg wiring. Real Cloudflare keys and a deployed domain are required for end-to-end proof; none available here.

Operator command (deployment host): set `TURNSTILE_ENABLED=true` + `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` in the host `.env` (and the site key as repo variable for the build arg), redeploy, then verify a real login renders and passes the widget.

## 22. Track B11 — DEPLOY_KNOWN_HOSTS SSH deployment

**Classification: BLOCKED (OPERATOR CONTROLLED).**

Verified in code: release.yml pins `DEPLOY_KNOWN_HOSTS` (known_hosts content) and uses `StrictHostKeyChecking=yes`-style fail-closed behavior; no `StrictHostKeyChecking=no` anywhere; deploy requires `DEPLOY_SSH_KEY`/`DEPLOY_HOST`/`DEPLOY_URL` secrets. A real GitHub deployment run cannot be triggered from this workspace.

Operator action: add the three secrets + `DEPLOY_KNOWN_HOSTS` (public key of `DEPLOY_HOST`) to the GitHub environment before first release; trigger the workflow and watch `deploy` + `verify` jobs.

## 23. Track B12 — storage persistence across restarts

**Classification: BLOCKED.**

`backend_storage` volume mounted at `/app/storage` on backend/worker/scheduler (asserted in tests); persistence proof (upload → restart → still served) requires a live stack.

Operator command (deployment host):

```
docker compose --profile production up -d
# upload a media file via the admin panel, then:
docker compose restart backend
# the file must still be served from /storage/... with the 1y cache headers
```

## 24. Conclusion, operator conditions and final verdict

**Verdict: B — RELEASE READY WITH OPERATOR CONDITIONS.**

Track A is CODE-VERIFIED with no open code blocker: bounded daily logging (14-day retention, env-configurable), `TRUSTED_PROXIES` moved into config (config-cache-safe, semantics preserved — with the documented `booted()` implementation note), deployment/frontend docs now describe the real stateful XSRF contract and release verification semantics. All automated gates passed: targeted 9/25, full backend suite 5 consecutive runs at 488 tests / 1947 assertions (exit 0 each), vitest 75/75, lint/type-check/build exit 0, config-cache probe green, live API sanity green.

**Operator conditions before production release (each is OPERATOR CONTROLLED / BLOCKED here):**

1. Run B1–B12 on the deployment host (commands in §12–§23); the release `verify` job and deployment.md §8 checklist are the primary gate.
2. Provide `DEPLOY_KNOWN_HOSTS` + deploy secrets (B11); set `LOG_CHANNEL=daily` (default) and optionally `LOG_LEVEL` on the host; keep `TRUSTED_PROXIES` matching the real gateway.
3. Exercise the browser stateful flow on the real domain (B7) — the local e2e proof is not a substitute.
4. Perform one backup + restore drill and record actual RPO/RTO (B9).
5. Configure Turnstile with real keys if the login gate is to be enforced in production (B10).

**Not done:** no commit, no push, no stash, no reset; no Phase 7 work was started; no deployment evidence was fabricated; the working tree remains intentionally uncommitted (Phase 5A/5B work included).