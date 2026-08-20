# Sprint 12 — Core Completion & Production Hardening

Audit-first hardening pass over the fully shipped YS Systems platform
(backend + public site + admin). No feature work, no UI redesign: only
real defects get fixed, every fix ships with a regression test, and the
whole suite must stay green.

Status: **in progress** (Phase A — backend core audit; fixes F-1, F-2 shipped).

---

## Session summary

Baseline before any change: `php artisan test` = 188 passed / 677 assertions
green; Pint clean.

After this session: **194 passed / 692 assertions**, Pint clean.

---

## Findings

### F-1 — Unbounded client-controlled pagination (medium, fixed)

`per_page` was taken straight from the query string on **every** paginated
endpoint (projects, tasks, customers, contact requests, audit logs, media,
docs, users, FAQs, static pages, careers, products, releases, roadmap,
services, updates, public updates). A single authenticated — or public —
request could force pagination of an arbitrarily large page.

The Ui never sends `per_page` (verified in `ys-web` — the shared list hook
only ever sends search params), and the aFixed job-list endpoint already
clamped to 100 as the in-repo precedent.

**Fix:** `Controller::perPage(Request, int $default)` helper added in
`ys-api/app/Http/Controllers/Controller.php` — reads the parameter, clamps to
`[1, 100]`, keeps the previous default. Applied to all 18 paginated call
sites (17 controllers edited; `FailedJobController` already clamped).

**Regression tests:** `tests/Feature/Admin/PaginationLimitTest.php` (6 tests)
covers the cap on projects, customers, tasks, contact requests and the
public updates endpoint (150-row seed proves the 100-row page split), plus
a "normal value preserved" case.

### F-2 — `convertCustomer` was not atomic (medium, fixed)

`ContactRequestController::convertCustomer()` created the `customers` row
and then updated the `contact_requests` link in two separate statements. A
failure between the two (connection loss, DB error) would leave an orphaned
customer with no back-link to the request that created it.

**Fix** — both writes now run inside a single `DB::transaction()`. The
existing unique-index race protection (23505 handling) is preserved outside
the transaction, and the fail-open behavior is unchanged.

**Coverage:** existing `ContactRequestCustomerTest` (8 tests) still green —
including the duplicate-email refusal and the case-insensitive checks.

---

## Audit trail (no change needed — findings only)

These areas were read through end-to-end and *deliberately left untouched*;
each is listed so the evidence of the decision is reproducible:

- **Authorization:** every admin route sits behind `view_*`/`manage_*`
  permission gates, fail-closed on missing permission; public endpoints
  expose only whitelisted, `is_public` settings and `public()` scopes only.
- **Consistency:** `LifecycleService` is the single reconciliation point for
  `completed_at` across Project/Task/Milestone; all four call sites are
  correct.
- **Identity integrity:** contact-request → customer linking is explicit,
  canonicalized on write, and protected by a unique index + race-safe
  catch; cross-customer project-link is rejected.
- **Mass assignment:** no `$request->all()` passes into any model — every
  write goes through validated arrays; `Model::preventSilentlyDiscardingAttributes`
  is on in non-production.
- **Rich-text sanitation:** the two public render sites that use
  `dangerouslySetInnerHTML` (product `long_desc` once, docs article content)
  are sanitized on write (`HtmlSanitizerService` / Purifier `cms`) and a
  second time on render in the frontend. Static pages / FAQ answers are
  stored as JSON/text and rendered as React text — no HTML render surface,
  so no write-side sanitizer is required there.
- **Brute force:** `throttle:auth` (5/min/IP), `throttle:contact` (3/hour/IP),
  `throttle:search` (60/min/IP), and a 120/min read budget for the remaining
  public surface.
- **Auth tokens:** cookie `ys_admin_token` is `HttpOnly` + `SameSite=Strict`
  (+ `Secure` in production) and expires with the Sanctum token.

---

## Remaining audit surface (next)

1. `SubscriptionController` write path + `CustomerIdentityTest` boundaries
   (subscription ↔ customer linkage, renewal legs).
2. `- PublicSearchDriver` query-construction edges (wildcard handling,
   per-locale `tsvector` columns exist?).
3. `DashboardController` SQL — already indexed? verify covering indexes on
   the agg queries.
4. Frontend build drift vs `docs/` claims (TypeScript workflows not run
   yet in this workspace).
5. Runtime-only verification still pending (this workspace has no Docker):
   run the provided `scripts/` on the staging server, execute a real
   backup/restore, verify nginx routing, run the watchdog once.

---

## Verification

- `php artisan test` — 194 passed, 692 assertions
- `vendor/bin/pint --test` — clean (after auto-fixing a trailing blank line
  in the new test)

## Files changed

| File | Change |
|---|---|
| `ys-api/app/Http/Controllers/Controller.php` | new `perPage()` clamp helper |
| 17 admin/public controllers | `paginate($this->perPage($request, N))` |
| `ys-api/app/Http/Controllers/Admin/ContactRequestController.php` | atomic convert |
| `ys-api/tests/Feature/Admin/PaginationLimitTest.php` | 6 regression tests |

---

## Phase B — Subscription Write-Path & Dashboard Query Integrity

### Audit checklist (current domain, verified from the repository)

- **Writable fields:** `customer_id`, `product_id`, `plan_name`, `price`,
  `currency`, `billing_cycle`, `starts_at`, `ends_at`, `status`,
  `is_manual_entry` (action-forced), `created_by` (action-forced).
  `UpdateSubscriptionRequest` deliberately keeps `customer_id`/`product_id`
  non-editable — reassignment is a data-integrity red flag, cancel + re-create.
- **Statuses:** closed enum `active | expired | cancelled`; no lifecycle
  transition rules exist in the domain (no impossible-transition matrix) —
  none invented.
- **Monetary fields:** `price` decimal(10,2); currency char(3) free-form
  (no whitelist exists — kept as-is to preserve the existing vocabulary).
- **Relationships:** subscription belongsTo customer (cascade) + product
  (restrict). No project reference exists in this domain — no
  cross-customer project checks apply.
- **Permissions:** every create/update/read requires `manage_subscriptions`
  (FormRequest `authorize()`), plus `canAccessProduct($product_id)` for
  product-scoped admins (fail-closed — zero rows = zero access).
- **Audits:** `subscription.created` (model change log) and
  `subscription.updated` (diff log) exist.
- **Uniqueness:** none required by domain design — one customer may hold
  multiple rows per product (different plans/cycles). No business key
  unique constraint is justified, so none was added.
- **Dashboard aggregates:** none exist (verified backend `DashboardController`
  + frontend dashboard page). Per phase mandate, no subscription metrics
  were invented or added.
- **Existing indexes:** `(product_id, status)`, `(status, ends_at)`,
  `customer_id` — match every actual query pattern (product-scoped list,
  expiring-soon, per-customer lookups). The only unindexed pattern is
  `ORDER BY starts_at DESC` on small tables; no index added.

### Defects found and fixed

**B-1 — Money converted to float in the API response (fixed).**
`SubscriptionResource` emitted `price` as `(float) $this->price` and
`monthly_equivalent` as `round(monthlyEquivalent(), 2)`. Both are now plain
decimal strings. `Subscription::monthlyEquivalent()` was rewritten with
integer cents arithmetic (half-up rounding, no `float` anywhere) and now
returns `"X.YZ"` strings; the resource passes them through untouched.

**B-2 — Schema-precision enforcement for money (fixed).** `price` was
validated as `numeric min:0` only, so `99.999` would be silently rounded
to the DB's decimal(10,2). Create and update rules now require
`decimal:0,2`. (`100.00 / 3 = 33.33` behavior unchanged.)

**B-3 — Update allowed `ends_at` before `starts_at` (fixed).**
`UpdateSubscriptionRequest` now validates `ends_at` against the effective
start date — the submitted `starts_at` when present, otherwise the row's
stored value (Laravel's `after:starts_at` can only compare request input,
so a closure rule was added).

**B-4 — `admin_product_access` inserts broken (pre-existing bug found and
fixed).** The pivot has its own UUID primary key, but `User::products()`
used Laravel's stock Pivot, which never emits `id` — every `attach()/sync()`
violated the NOT NULL constraint. This silently broke granting product
access through both the admin UserController sync endpoint and any
direct pivot usage (the backfill migration worked only because it writes
raw SQL with explicit UUIDs). Fixed by introducing
`AdminProductAccess` (Pivot + HasUuids) and wiring it via `->using()`.

**B-5 — Frontend cross-currency money aggregation (fixed).**
`ys-web/app/admin/subscriptions/page.tsx` summed `monthly_equivalent`
across all currencies into one "~$X" figure and called `.toFixed()` on
floats. Now: per-currency integer-cents totals rendered through the
existing `formatMoney()` formatter (`≈ USD 1,250.00 · EGP 3,000.00/mo`);
rows display `formatMoney(price, currency)`; `SubscriptionForm` sends
`price` as its string value instead of `parseFloat()`.

### Files changed (Phase B)

| File | Change |
|---|---|
| `ys-api/app/Domains/Billing/Models/Subscription.php` | `monthlyEquivalent(): string` — cents-math, no floats |
| `ys-api/app/Http/Resources/Admin/SubscriptionResource.php` | price/monthly_equivalent serialized as strings |
| `ys-api/app/Http/Requests/Admin/Billing/CreateSubscriptionRequest.php` | `price` gets `decimal:0,2` |
| `ys-api/app/Http/Requests/Admin/Billing/UpdateSubscriptionRequest.php` | `price` `decimal:0,2`; `ends_at` vs effective start |
| `ys-api/app/Domains/Auth/Models/AdminProductAccess.php` | **new** pivot model with `HasUuids` |
| `ys-api/app/Domains/Auth/Models/User.php` | `products()` uses the UUID pivot |
| `ys-api/database/factories/SubscriptionFactory.php` | **new** factory (tests only) |
| `ys-api/tests/Feature/Admin/SubscriptionTest.php` | **new** — 16 regression tests |
| `ys-api/tests/Feature/Admin/AdminProductAccessTest.php` | **new** — 2 regression tests |
| `ys-web/app/admin/subscriptions/page.tsx` | string money, per-currency totals, `formatMoney` |
| `ys-web/components/admin/SubscriptionForm.tsx` | sends `price` as string, no `parseFloat` |

### Migrations / indexes

None. No schema or index changes were justified — the existing index set
covers every actual query pattern; the money fix is pure representation.

### Verification (Phase B)

- `php artisan test` — **212 passed, 767 assertions** (was 194/692; +18 tests)
- `vendor/bin/pint --test` — clean
- `npm run type-check` — clean
- `npm run lint` — 0 errors (6 pre-existing warnings in untouched files)
- `npm run build` — succeeds (85 pages). The `ECONNREFUSED` lines during
  static generation are the known API-offline prerender fetch warnings
  (backend not running in this workspace) — not build failures.

### Known limitations / runtime checks pending

- Docker/runtime verification remains impossible in this workspace: real
  backup/restore, nginx routing, watchdog execution, and a live
  load-restore of the admin panel were not run.
- Seeded roles do not grant `manage_subscriptions` (only Super Admin `*`
  does). This is pre-existing seed data, probably intentional (financial
  records); flagged, **not changed** — roles are deployment data.
- The MRR line on the subscriptions page remains page-scoped and derived
  client-side (integer cents only) — no backend MRR aggregate exists and
  none was invented.
- `deleted` via API stays blocked (422) with the original message; that
  intentionally prevents destroying financial history.
- Service `monthlyEquivalent()` for 0.01 yearly yields "0.00" — rounding
  of a sub-cent value; documented behavior of integer half-up rounding.

---

## Phase C — Production Readiness & Runtime Verification Preparation

### Architecture as verified in the repository

- **docker-compose.yml** (single stack, defaults to `production`):
  frontend (Node 20 runner, standalone, build-time inlined API URL),
  backend (php:8.4-fpm-alpine + embedded nginx on :8000, FastCGI to
  php-fpm :9000), database (postgres:16-alpine), redis, edge nginx
  (plain HTTP on :80 — TLS is expected on an external gateway, HSTS
  deliberately omitted), queue-worker (`queue:work --sleep=3 --tries=3
  --max-time=3600`), scheduler (`schedule:work` — no schedules exist
  yet, K-34), one-shot backup service, mailhog (dev/staging profile),
  grafana 11.4.0 (production profile, `GRAFANA_PASSWORD:?`).
- Ports bind to 127.0.0.1 (frontend, backend, database, redis, mailhog,
  grafana); edge nginx publishes `${NGINX_PORT:-80}:80` unbound (edge
  role). No 443 anywhere.
- Backend container nginx: serves `/storage/` directly (public disk
  design, 1y immutable cache), `client_max_body_size 100M`, `.php`
  only through the front controller — no `.env`/config exposure paths exist.
- All env inventories cross-checked (`config/*.php` grep + compose +
  Dockerfiles + workflows + `ops/*` + `.env.example` pair).

### Defects found and fixed

**C-1 — `APP_URL` had two conflicting definitions (fixed).**
root `.env.example` declared `APP_URL=http://localhost` (Application
section) and later `APP_URL=https://ys-systems.com` (Frontend section)
for the SAME variable with different roles; docker-compose backend
defaulted to `http://localhost` while the frontend build consumed
`https://ys-systems.com`. One environment, two values, contradictory
defaults for the same key. Now: a single `APP_URL` in the Application
section (`https://ys-systems.com`), one comment explaining both roles
(backend absolute URLs + inlined `NEXT_PUBLIC_APP_URL`), and compose
backend + queue-worker use the same `${APP_URL:-https://ys-systems.com}`
default as the frontend build arg.

**C-2 — backend-tests CI job could not run on a fresh pipeline
(fixed).** The GitHub postgres service creates DB `ys_test` with user
`ys_user`/`secret`, but the job copies `.env.example` (DB_USERNAME=
postgres, blank password) and the suite migrates `ys_api` + tests
`ys_api_test` — both absent on the service. First CI run would fail at
`php artisan migrate` with "database does not exist". Now creates
`ys_api` and `ys_api_test` (absence-checked, via PDO — pdo_pgsql is a
declared extension) and aligns `.env` credentials to the service.

**C-3 — backend-static CI job was a failure-proof no-op (fixed).**
`php artisan lint` (command does not exist), `vendor/bin/phpstan`
(not in composer.json), and `|| echo "Static analysis placeholder"`
made the job always green without checking anything. Replaced with
`vendor/bin/pint --test` — the actual tooling installed, and the gate
matches the locally-verified pint run.

**C-4 — frontend-tests CI job was a failure-proof no-op (fixed).**
`npm test` fails because ys-web has no `test` script (no jest/vitest
dependency), and `|| echo "Tests placeholder"` swallowed the failure.
Job now runs the real gates that exist: `npm run lint` + `npm run
type-check` (build already guaranteed by the frontend-build job).

**C-5 — root `.gitignore` did not ignore top-level `.env` (fixed).**
Only `.env.local`/`.env.production` were ignored; docker compose reads
a root `.env` whose contents are credentials (DB_PASSWORD, MAIL_PASSWORD…).
Added `.env`.

**C-6 — `config/session.php` SameSite comment was factually wrong
(fixed).** It claimed "'strict' is required for cookie-based SPA auth"
because API and panel are different origins — SameSite governs sites,
not origins, and `strict` actually *blocks* cookies on cross-site
requests. Comment now states the real rule: within the docker stack
the edge nginx serves API + panel on one site, so `strict` is safe;
a future frontend on a different registrable domain requires
`SameSite=None` + Secure + (optional) `SESSION_DOMAIN`.

**C-7 — dead env var removed from `.env.example` (fixed).**
`PASSWORD_HASH_DRIVER=argon2id` is read nowhere (Laravel 11+ has no
`config/hashing.php`; hash driver config does not exist) — grep
confirmed zero usage outside the example file. Removed. `BCRYPT_ROUNDS
=12` retained.

### Verified as already correct (no change)

- **Secrets:** no secret values in any repo file; `.env.example` files
  hold placeholders only; workflow secrets referenced via `${{ secrets.* }}`;
  backups/ gitignored; `APP_KEY:?` / `DB_PASSWORD:?` / `GRAFANA_PASSWORD:?`
  fail-fast interpolation on every container that needs them;
  `MAIL_ADMIN_ADDRESS` defaults blank + jobs log a warning and skip.
- **THE-ENV attr:** compose passes `FRONTEND_URL`, `SESSION_SECURE_COOKIE`,
  `APP_URL`, full mail block to backend; queue-worker receives mail +
  APP_URL + DB/redis (no SESSION/CACHE — not needed by worker jobs).
- **Cookie/CORS:** `config/cors.php` allowlists `FRONTEND_URL` with
  `supports_credentials=true`; Sanctum stateful set derives subset from
  `SANCTUM_STATEFUL_DOMAINS` and falls back to the FRONTEND_URL host
  (+ localhost); cookie host-only (no `SESSION_DOMAIN` → fine for
  same-site hosting). Cross-track: no duplication issue.
- **Health:** Dockerfile healthchecks (`/health/live` frontend, `/up`
  backend) + watchdog probes the edge-published endpoints
  (`/health/live`, `/api/v1/health`, auth gate expects 401) — all
  truthful signals, none invented.
- **Backups:** one-shot `backup` service with profiles (dev/staging/prod),
  `pg_dump -Fc`, tmp-file + atomic mv, `pg_restore --list` verification,
  retention 7 default, `umask 077`, never overwrites. NOTE for
  operators: with profiles set, invoke must include the profile:
  `docker compose --profile production run --rm backup`.
- **CI/CD pipeline shape is sound** (lint → static → tests → build →
  security scan; release: images → migrate BEFORE switch → up →
  verification 401/419 gate; docker prune is image-scoped, tagged
  images exempt → rollback target preserved).

### Runtime verification matrix — NOT RUN (Docker unavailable)

| Check | Verification |
|---|---|
| Container boot + healthchecks | ❌ not run (no Docker) |
| `docker compose config` parse + env interpolation | ❌ not run — static review only |
| pg_dump backup + restore round-trip | ❌ not run |
| Edge nginx reverse proxy + /storage proxying | ❌ not run |
| Watchdog cron execution | ❌ not run |
| queue:work drain + failed_jobs | ❌ not run |
| Grafana boot + GF_SECURITY_ADMIN_PASSWORD rule | ❌ not run |
| Live cookie auth cross-origin | ❌ not run |
| CI workflow execution (fresh checkout, GH-hosted) | ❌ not run |
| `mysql` assumed drivers (pdo_mysql listed for PHPUnit only) | no-op |

### Files changed (Phase C)

| File | Change |
|---|---|
| `.env.example` | single `APP_URL` with dual-role comment (C-1) |
| `docker-compose.yml` | unified `${APP_URL:-…}` defaults (C-1) |
| `.github/workflows/ci.yml` | DB bootstrap (C-2); pint gate (C-3); real frontend gates (C-4) |
| `.gitignore` | `.env` ignored (C-5) |
| `ys-api/config/session.php` | SameSite comment corrected (C-6) |
| `ys-api/.env.example` | removed dead `PASSWORD_HASH_DRIVER` (C-7) |
| `docs/sprint-12-report.md` | this section |

### Verification (Phase C)

- `php artisan test` — 212 passed, 767 assertions (unchanged, config-only
  edits; suite green).
- `vendor/bin/pint --test` — clean.
- No app-code or schema touched in this phase; workflow/compose/env
  changes are static-reviewed only (cannot be executed here).

### Remaining risks / operator notes (no change made)

- **Driver defaults in prod:** compose does not pass
  `SESSION_DRIVER`/`CACHE_STORE`/`QUEUE_CONNECTION`; Laravel defaults
  apply: file sessions on the `backend_storage` volume (fine, single
  backend), file cache, and the **database** queue (`jobs` table) —
  Redis is provisioned but currently unused at runtime. Works and is
  durable; documented here deliberately.
- **Scheduler container** gets DB/Redis env but no MAIL_*/APP_URL/
  FRONTEND_URL — harmless today because **no scheduled commands exist**
  (remember K-34: the feature is intentionally deferred). When schedules
  are added, extend the env block.
- **`composer.lock` is gitignored** in ys-api — reproducibility
  note; acceptable for now, keep in mind when the repo is pushed.
- **Vercel/Neon checklist (not committed):** the platform is
  docker-compose-first. Moving frontend to Vercel requires: a real
  backend URL with TLS (see `session.php` SameSite note), Neon must
  support the same `jobs`/`cache` table used in the DB-backed queue,
  media uploads via `public/storage` require object storage or a
  static host, and `APP_URL`/`FRONTEND_URL`/`SANCTUM_STATEFUL_DOMAINS`
  must be re-pointed. No credentials or URLs exist for this yet.
- **`phpunit.xml` hardcodes a test APP_KEY** — local-only convenience,
  fine.
- .dockerignore/ backend image copy: `.env`/tests/phpunit excluded from
  the image; source + composer.lock included (lock uses for `composer
  install --no-dev` in prod target).

---

## Phase C — Documentation Closure

### Documentation audited (this pass)

- `docs/deployment.md` — container table, Dockerfiles, nginx routing,
  CI/release sections, environments, first-deployment checklist,
  storage section.
- `docs/configuration.md` — root/.env.example tables, backend env-key
  list, frontend next.config behavior, runtime-vs-build-time section.
- `docs/backup-and-recovery.md` — every compose invocation, cron line,
  restore runbook, verification checklist.
- `docs/monitoring.md` — backup alert row + run command.
- `docs/backend.md`, `docs/authentication.md`, `ys-api/SETUP.md` —
  password-hashing claims.
- `.env.example` (root) — backup invocation comment.
- READMEs (root, ys-api) — scanned; no stale C-1–C-7 references found
  (the discovery-phase `docs/README.md` Quick Facts counts predate
  Sprint 12 and were untouched).

### Stale references corrected

| Doc | Correction |
|---|---|
| `docs/configuration.md` | `APP_URL` default now `https://ys-systems.com` with the unified dual-role meaning (C-1); `NGINX_SSL_PORT / 443` row removed (no 443 exists anywhere); `GRAFANA_PASSWORD` row: no default — fail-fast `:?` (was "admin"); `PASSWORD_HASH_DRIVER` removed from the env-key list (C-7); §6 runtime-vs-build-time rewritten: values reach the build via compose `build.args`/repo vars, runtime env is `NODE_ENV` only |
| `docs/deployment.md` | §4 CI table updated to the real gates (pint --test C-3; lint+type-check C-4; backend-test DB bootstrap C-2; lint row no longer claims 17 errors); §1 backup row + §8 item 9 invocation now `docker compose --profile production run --rm backup`; §6 gains the **compose-profile/backup operator note**; new §10 records the **Vercel + Neon future-topology consideration** (TLS requirement, APP_URL/FRONTEND_URL/SANCTUM_STATEFUL_DOMAINS rules incl. SameSite constraint, DB-backed queue/cache on Neon, public/media object-storage requirement, `SESSION_SECURE_COOKIE=true` note) — explicitly NOT current architecture, no provider/URL invented |
| `docs/backup-and-recovery.md` | Every `docker compose … backup` invocation now profile-aware (`--profile production` / staging / development), incl. the cron line and the §9 checklist; fix: `docker compose exec -T db` → `database` (pre-existing service-name typo that would have broken the documented recover path); added the profile operator note: no Laravel scheduled backup task, host cron is intentional, K-34 remains deferred |
| `docs/monitoring.md` | A-05 restore command + signal table re-run command now profile-aware |
| `docs/backend.md`, `docs/authentication.md`, `ys-api/SETUP.md` | "Argon2id via PASSWORD_HASH_DRIVER" claims replaced with the verified truth: bcrypt (Laravel default driver; `PASSWORD_HASH_DRIVER` was read by nothing and was removed in C-7; `BCRYPT_ROUNDS` applies) |
| `.env.example` (root) | backup comment now carries the `--profile production` invocation |

### Compose profile / backup training note (recorded in deployment.md §6 and backup-and-recovery.md §1)

- The stack uses Docker Compose **profiles** — `mailhog` (development/staging),
  `monitoring`/Grafana (production) and `backup` (all three) exist only when
  the matching profile is active; services without an active profile cannot
  be started. Correct production backup invocation:
  `docker compose --profile production run --rm backup` (staging/dev: the
  matching profile).
- Backup scheduling is **host-side crontab only** — no Laravel scheduler
  task for backups, and none should be created.
- **K-34 remains deferred:** no Laravel scheduled commands exist
  (`routes/console.php` absent, zero `schedule()` calls); the `scheduler`
  container is idle by design.

### Vercel + Neon — recorded as deployment consideration only

Full section in `docs/deployment.md` §10: frontend on Vercel needs a real
HTTPS backend URL (TLS terminates on the external gateway); `APP_URL` →
real application URL (single variable, C-1); `FRONTEND_URL` → Vercel
frontend origin; `SANCTUM_STATEFUL_DOMAINS` must match the actual frontend
domain under the current SameSite rules (different registrable domain would
require `SameSite=None` + Secure and only `SESSION_DOMAIN` when both share
a host); the **database-backed queue** (`jobs` table) and DB/file
cache/session defaults must remain functional on a hosted Postgres (no
Redis requirement); **public media storage** is backend `public/storage`
(Docker volume) and needs object storage/static hosting once the backend
leaves the current topology (`config/filesystems.php` S3 wiring exists but
is NOT provisioned; no provider chosen). Explicitly: **no storage provider,
domain, credential, or exact production URL invented; nothing implemented.**

### Configuration correction (this pass)

- `.env.example` (root) — one comment line updated (backup invocation);
  no code, config, schema, or YAML changed in this pass. No YAML files were
  modified, so no YAML re-validation applied.

### Verification (Phase C closure)

- `php artisan test` — **212 passed (767 assertions)** — re-run green.
- `vendor/bin/pint --test` — clean (backend untouched this pass).
- `npm run type-check` — clean (no frontend files changed).
- `npm run lint` — 0 errors (6 pre-existing warnings, untouched files).
- `npm run build` — succeeds (unchanged from Phase B verification).
- No Docker/runtime execution possible in this workspace — see matrix
  below.

### Runtime checks still pending (NOT RUN — no Docker engine)

Full Phase C matrix above ("Phase C — Runtime verification matrix — NOT
RUN") remains pending: `docker compose config`, container boot + healthchecks,
pg_dump/restore round-trip (incl. first on-host `--profile production
run --rm backup`), edge-nginx routing, watchdog cron loop, queue drain,
scheduler idle-start, Grafana boot with fail-fast password, live cookie
auth through the ingress, CI workflow execution on GitHub-hosted runners,
and Vercel/Neon — nothing claimed as executed.

### Verdict — Phase C

Phase C (infrastructure/config audit C-1–C-7 + documentation closure) is
CLOSED from the repository side. Runtime verification remains
explicitly pending first server/Docker access, as recorded above.
Sprint 12 ends here; per the stop rule no further phase is started.