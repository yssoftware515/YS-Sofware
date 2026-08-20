# Phase 4A — Production Hardening Remediation Report

**Scope:** remediate all Phase 4 findings + hardening; re-verify every finding against the current tree; full regression gates; living-doc alignment.
**Date:** 2026-08-18
**Result:** All open items fixed or explicitly deferred. Backend **460 tests / 2466 assertions** green; frontend **75 tests** green; `tsc`, `eslint`, `next build` clean. Docker image build verification **pending** (no Docker on this host).

---

## 1. Executive summary

Every OPEN finding from Phase 4 was re-verified against the current tree and remediated:

- **P1-01 (High)** — the Redis landmine is eliminated by decision, not workaround: the production model is **DB/file-backed** (cache=file, session=file, queue=database). The only `Redis::` consumer (`FeatureFlagService`) now goes through the Laravel Cache abstraction with a graceful DB fallback; Redis was removed from `docker-compose.yml` and `.env.example`; a consistency test suite now guards the no-Redis deployment contract.
- **INT-009 (High)** — tenant write escape closed in the domain layer (`assertProductInScope` in the action) + controller validation, with 7 new tests.
- Frontend reliability (INT-006/007/008, P3-04) — fixed with error surfaces, corrected `next` revalidate semantics, and 10 new contract tests.
- Performance/runtime (P2-05/06/07) — transactional reorder (2 rollback tests), bounded dashboard audit count + `created_at` index, OPcache in the image (documented, no JIT).
- P8 — `.env.example` is now production-safe. P9 — storage volumes on all backend-family services; backup confirmed existing (operator-triggered one-shot); scheduled backups remain a documented ops task.

**Release recommendation: PROCEED to staging/production deploy**, after the pending Docker-capable verification in §12.

## 2. Re-verification ledger

| ID | Phase 4 claim | Re-verified finding | Disposition |
|---|---|---|---|
| P1-01 | compose/env point cache/session/queue at redis; hard `Redis::` dep | Partially mis-described: compose DID wire `REDIS_*` correctly; the real hazard was `FeatureFlagService` hard-depending on `Redis::` (500 if extension/client/cache unavailable) + `.env.example` redis defaults (copy-paste trap). Effective drivers were already file/file/database | **CONFIRMED (corrected) → FIXED** |
| INT-006 | `/api/v1/status` leaks version | CONFIRMED — `HealthData`/footer still carried `version` | **CONFIRMED → FIXED** |
| INT-007 | client `next` merge inverted | CONFIRMED — fallback `revalidate` overwritten by `options.next`; admin default would be 60s | **CONFIRMED → FIXED** |
| INT-008 | settings page swallows failures | CONFIRMED — empty selects, silent catch | **CONFIRMED → FIXED** |
| INT-009 | tenant write escape in UpdateDocumentationCategoryAction | CONFIRMED — action updated any category by id; controller lacked `product_id` validation | **CONFIRMED → FIXED** |
| P2-05 | milestone reorder not transactional | CONFIRMED | **CONFIRMED → FIXED** |
| P2-06 | unbounded dashboard audit count; missing index | CONFIRMED — `AuditLog::count()` per request; no `created_at` index | **CONFIRMED → FIXED** |
| P2-07 | no OPcache in image | CONFIRMED — no `opcache` in runner stage | **CONFIRMED → FIXED** (runtime verification pending §12) |
| P3-04 | audit-logs page silent empty table | CONFIRMED | **CONFIRMED → FIXED** |
| P8 | `.env.example` unsafe defaults | CONFIRMED | **CONFIRMED → FIXED** |
| P9 | worker/scheduler lack storage; backup one-shot; no scheduled task | CONFIRMED; backup script EXISTS (`ops/backup/backup.sh`, profile-gated, `pg_dump -Fc -Z9` + `pg_restore --list` verify + retention prune) | **CONFIRMED → FIXED** (storage) / **CONFIRMED, operator-controlled** (backup) |

No finding was found to be NOT REPRODUCIBLE or ALREADY FIXED at the time of remediation.

## 3. P1-01 — cache/session/queue model (High)

Decision: **Redis is not required.** The shipped model is DB/file-backed. Rationale: no existing workload needs a shared cache; Postgres is already the system of record; removing Redis removes an extension dependency, an env surface, and a config landmine.

- `ys-api/app/Domains/System/Services/FeatureFlagService.php` — rewritten: `Cache::get/put/forget/lock` (Laravel Cache abstraction → `file` in production), `try/catch` around cache access with **DB fallback** (`loadFlagsFromDatabase()` — flags re-read from the DB, never invented); `invalidate()` best-effort (cache miss ≠ failure); DB failures still propagate (fail closed, correct for permission-relevant flags).
- `docker-compose.yml` — `redis` service, `REDIS_*` envs, `depends_on` and `redis_data` volume removed.
- `ys-api/.env.example` — see §9.
- `ys-api/phpunit.xml` — `REDIS_CLIENT` env removed.
- New guards: `ys-api/tests/Unit/DeploymentConfigConsistencyTest.php` (5 tests) — no redis service/env in compose; no `REDIS_*` keys in `.env.example`; prod-safe defaults (`APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=info`); `backend_storage:/app/storage` mounted on backend, queue-worker **and** scheduler.
- New tests: `ys-api/tests/Feature/Admin/FeatureFlagCacheTest.php` (6 tests) — flag on/off through cache, environment targeting, role targeting, cache-down DB fallback (flags still resolve), `invalidate` best-effort with cache down, admin invalidation flow.
- `predis/predis ^2.3` remains in composer.json as dormant optional capability (documented in dependencies.md).

## 4. INT-009 — tenant write escape (High)

- `ys-api/app/Domains/Content/Actions/UpdateDocumentationCategoryAction.php` — added `assertProductInScope()`: requires an `Auth` actor; `product_id=null` (General) allowed only for authorized admins; a category whose `product_id` is outside the acting tenant's scope → `abort(403)`. Enforced **inside the action**, so any future controller reuse stays safe.
- `ys-api/app/Http/Controllers/Admin/DocumentationController.php` — `updateCategory` validates `product_id` (`sometimes|nullable|uuid|exists:products,id`) before delegation.
- `ys-api/tests/Feature/Admin/DocumentationTest.php` — +7 tests: valid scoped update; null→General; own product; out-of-scope product → 403; foreign-category → 403; missing permission → 403; action called directly (no actor) → 403.

## 5. P2-05 — transactional milestone reorder

- New `ys-api/app/Domains/Operations/Actions/ReorderMilestonesAction.php` — validates direction, requires `Auth` actor, re-asserts `isAccessibleBy`, and wraps the full re-stamp (updateMany + all row updates) in `DB::transaction`.
- `ys-api/app/Http/Controllers/Admin/MilestoneController.php` — delegates `move()` to the action.
- `ys-api/tests/Feature/Admin/MilestoneTest.php` — +2 rollback tests: a `DB::listen`-injected failure mid-update leaves every row order unchanged **and** writes no audit row (audit is inside the transaction).

## 6. P2-06 — dashboard audit count

- New migration `2026_08_18_000001_add_created_at_index_to_audit_logs_table.php` — btree index on `audit_logs.created_at`.
- `ys-api/app/Domains/System/Services/DashboardService.php` — audit count via `Cache::remember('ys:dashboard:audit_logs_count', 60, ...)`; metric unchanged, cost bounded, 60s staleness acceptable for a dashboard chip.
- `DashboardTest.php` / `DashboardServiceTest.php` — `Cache::flush()` in setUp (array-cache persistence across tests).

## 7. P2-07 — OPcache

- `ys-api/Dockerfile` runner stage — `docker-php-ext-install ... opcache` (bundled in the official php image).
- New `ys-api/docker/php/opcache.ini` → `/usr/local/etc/php/conf.d/zz-opcache.ini`: `enable=1`, `enable_cli=0`, `memory_consumption=128M`, `max_accelerated_files=20000`, `validate_timestamps=0` (immutable image — opcache keys are inlined and never stale; documented in the ini).
- **No JIT** — deliberate: this is a framework with heavy optional-path code; JIT adds memory + complexity with no measured benefit here (documented in the ini).
- Dev Dockerfile intentionally untouched (validate_timestamps=1 by default → hot reload).

## 8. Frontend reliability (INT-006/007/008, P3-04)

- `ys-web/lib/api/client.ts` — request `next: options.next ?? { revalidate: 60 }`; adminRequest `next: options.next ?? { revalidate: 0 }` (admins must never serve stale UI state).
- `ys-web/app/[locale]/(public)/status/page.tsx` — `version` removed from `HealthData` + footer (no-version health contract preserved).
- `ys-web/app/admin/settings/page.tsx` — settings load through `loadSettings()` (admin client → throws on failure): load-error banner + default-safe form; per-row `saveError` shown, draft preserved on failure (no silent catch).
- `ys-web/app/admin/audit-logs/page.tsx` — `loadAuditLogs()` with visible error row instead of a silent empty table.
- New `ys-web/tests/contracts/api-client-revalidate.test.ts` (4 tests): default 60s on request; explicit search `revalidate: 0` preserved; POST with `revalidate: 0` preserved; headers merged.
- New `ys-web/tests/contracts/admin-error-surfaces.test.ts` (6 tests): success payload; network rejection; API 401/403 rejection for both `loadSettings` and `loadAuditLogs`.
- Test env note: vitest runs in `node` (no jsdom/testing-library in devDeps) — loaders are exported pure functions specifically to keep them DOM-less unit-testable.

## 9. P8 — production-safe `.env.example`

`ys-api/.env.example` rewritten: `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=info`, `CACHE_STORE=file`, `SESSION_DRIVER=file`, `QUEUE_CONNECTION=database`, **no REDIS_***; all MUST-change values (DB creds, APP_KEY, MAIL_*, FRONTEND_URL) marked in header comments. Guarded by `DeploymentConfigConsistencyTest`.

## 10. P9 — storage, logs, backups

- `docker-compose.yml` — `backend_storage:/app/storage` now on `backend`, `queue-worker`, `scheduler`: logs + cache + sessions survive container restarts on all backend-family services.
- Backups: **VERIFIED** `ops/backup/backup.sh` exists (one-shot `pg_dump` via the `backup` compose service, production profile). No `routes/console.php` → no Laravel scheduled task exists; scheduled backups are an **operator-controlled cron job** on the host (documented in backup-and-recovery.md §runbook). Deferred: automating the schedule.

## 11. Tests executed (all green)

| Gate | Command | Result |
|---|---|---|
| Backend full suite | `php artisan test` (ys-api) | **460 passed / 2466 assertions** (was 439/2414; +21 new) |
| Backend targeted (new/changed) | `php artisan test --filter='Documentation|Milestone|FeatureFlag|Dashboard|DeploymentConfig'` | all passed |
| Frontend | `npx vitest run` (ys-web) | **75 passed** (65 existing + 10 new) |
| TypeScript | `npx tsc --noEmit` (ys-web) | clean |
| ESLint | `npx eslint app lib tests --max-warnings=0` | clean |
| Next build | `npm run build` (ys-web) | exit 0 |

## 12. Pending verification (Docker-capable host required)

- `docker build` of `ys-api` (validates the new `opcache` install line + compose edits at image build time). Compose YAML re-parsed cleanly; Dockerfile change is the standard official-image pattern, but the image was not built here.
- OPcache runtime load (`php -m | grep opcache`) inside the built image — local PHP 8.4.22 lacks the extension and this Windows host has no Docker CLI.
- A live `docker compose up` smoke test of the full stack.

## 13. Deferred (recorded, not blocking)

- Dashboard remaining ~28 COUNT queries (only the audit count is cached) — revisit with actual traffic data.
- Milestone admin index uses unbounded `->get()`.
- Duplicate public fetches (e.g., company info) — candidate for `unstable_cache`/shared server cache.
- Queue tuning: single worker, default queue only; failed-jobs UI absent; no dead-letter policy.
- Observability: Sentry/APM not configured; failed-job alerting absent.
- Object storage (S3) migration for media.
- Audit-log retention/purge policy.
- Scheduled (cron) backups — operator-controlled today.

## Final release recommendation

**PROCEED** to staging then production, gated on §12 (Docker build + opcache runtime check + compose smoke test) on a Docker-capable host. No further code remediation is required for release.