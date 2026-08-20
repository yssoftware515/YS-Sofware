# Sprint 11 — Backup, Observability & Failure Recovery

**Date:** 2026-08-09 · **Scope:** ME-06 · **Env note:** no Docker engine on the dev machine — all container behavior verified statically; the first-server checklist is explicit.

---

## 1. Verdict

```
Backup:   DEFINED + IMPLEMENTED (one-shot pg_dump service, verify, retention) — runtime-pending
Recovery: PROCEDURE COMPLETE (identify → verify → restore → integrity check) — drill pending
Grafana:  SHIPPED AS-IS; gap documented honestly (no datasources — nothing invented)
Alerting: catalogue for EXISTING signals only + host watchdog + backup exit codes
Failed jobs: observable via admin API (read-only, safe), no retry/delete UI
K-34:     explicitly deferred (no real operational requirement yet)
```

**Guiding principle honored:** no fake metrics, no invented thresholds, no phantom dashboards. Everything that claims to be observable maps to a real signal.

## 2. Initial state (verified baseline)

- No backup mechanism anywhere; `postgres_data` was the only copy of the data.
- Grafana container present, but **zero provisioning** (no datasources, no dashboards).
- Health signals available: `/api/v1/health` (DB+cache), `/up`, `/health/live`, container healthchecks, `failed_jobs` table (added Sprint 10) with **no visibility path**.
- 178 backend tests green; suite runs on local PostgreSQL (`tests` green at start).

## 3. Backup work (Phases A+B)

- `ops/backup/backup.sh` (POSIX sh) — `pg_dump --format=custom --compress=9` → temp file (pid-suffixed) → `pg_restore --list` verification → atomic `mv` → retention prune (newest `BACKUP_RETENTION` dumps, default 7).
- One-shot compose service `backup` (postgres:16-alpine, same image as the DB) — depends only on database health; app containers may be down.
- Credentials: `DB_PASSWORD` is injected as env at runtime → `PGPASSWORD`; the script never contains or logs secrets.
- Exit codes: 0 ok / 1 any failure / 3 filename collision. Boot-time `trap EXIT` removes partial temp files.
- Host cron line documented (`05 2 * * *`), backup destination `./backups` (bind mount, gitignored, root `.gitignore` added).
- NOT built: any scheduler work inside the app (K-34), cloud/S3/K8s, media volume backup automation (documented as host `rsync` follow-up).

## 4. Restore procedure (Phase C — mandatory)

`docs/backup-and-recovery.md` §5: identify → verify (`pg_restore --list`, scratch restore) → clean-instance restore → app integrity checks → downtime envelope; §8 RPO/RTO are stated as **targets, not measured**; §9 contains the full first-server verification matrix incl. quarterly drill instruction. Nothing here was executed against a real database (no Docker).

## 5. Monitoring work (Phase D)

`docs/monitoring.md`:
- Grafana: container only — **no datasources/dashboards exist, and this report does not claim otherwise** (section 1 + gaps list).
- Real signals inventory (sec.2): healthchecks, `/api/v1/health`, `/up`, `/health/live`, auth-401 gate, failed-jobs endpoint, backup exit/logs, container state `docker compose ps`.
- New `ops/watchdog/healthcheck.sh` (curl; exit non-zero with a cause line; cron-able `*/5`).

## 6. Alerting work (Phase E)

Catalogue with severity/condition/meaning/action/recovery — **only signals that exist**: A-01 API health, A-02 container unhealthy/restart-loop, A-03 auth-gate 401, A-04 new failed jobs, A-05 nightly backup absence, A-06 frontend `/health/live`. Fabricated thresholds (CPU/mem/disk latency) deliberately absent. Delivery channel (email/IM/pager) remains an open decision — the exit codes are the signal.

## 7. Failed-job observability (Phase F)

- `GET /api/v1/admin/ops/failed-jobs` — read-only, paginated, gated with the existing `view_audit_logs` permission (no new permission architecture).
- Never exposes `payload` fields (serialized args may contain private data); returns first line of the exception, truncated (500 chars).
- No retry/delete UI; no public exposure; immutable model (`FailedJob`, non-writable).
- Route lives under `admin/ops/*`; tests assert routes `retry`/`destroy` do **not** exist.

## 8. Security review (Phase G)

| Check | Status |
|---|---|
| Credentials in script | ❌ none — only env (`PGPASSWORD`) |
| Secrets logged | ❌ never echoed; log lines contain no credentials |
| File perms | `umask 077` → owner-only dump files |
| Backup dir perms | bind mount on host; document `chown` note in runbook (host-owned dir) |
| Public exposure | `backups/` is NOT under any document root; root `.gitignore` added |
| `.gitignore`/`.dockerignore` | root `.gitignore` includes `backups/`; `ys-api/.dockerignore` excludes dispatch (tests, .env, caches) — backup path not inside backend image |
| Retention / collisions | timestamped names + collision abort (exit 3); prune by count; never overwrites |
| Partial files | tmp+pid+trap EXIT — impossible to publish a partial dump |
| Failure handling | non-zero exits, FATAL log line, watchdog sees absence |

**Backups contain customer/business data → stored outside `public/` and outside `storage/`; gitignored.**

## 9. Tests (Phase H)

- **188 passing (677 assertions)** locally against real PostgreSQL — full suite.
- Added 16 assertions across 3 new files:
  - `FailedJobObservabilityTest` (Feature, 5): 401 / 403 / order / payload redaction (secret emails + password never in response) / no retry-delete routes.
  - `HealthContractTest` (Feature, 2): public health shape `{status, version, checks{database,cache}}` + dashboard health block.
  - `OpsContractsTest` (Unit, 4): failed-queue store pinned, admin-address-config contract (no hardcoded Gmail), full mailer set, `from` address present.
- No tests asserting file existence; no count inflation.

## 10. Verification

| Claim | Verified how |
|---|---|
| Backend suite still green | `php artisan test` → 188 passed (677 assertions), all three pending files listed green |
| Pint (test mode) | `vendor/bin/pint` on the 5 changed PHP files → passed |
| PHP syntax | `php -l` on all changed files → 0 errors |
| Compose YAML | static read-back (no docker CLI); service block, envs, depends_on and volumes re-inspected |
| Shell scripts | ⚠️ syntax `sh -n` + execution pending (no shell on dev machine) |

## 11. Runtime limitations (explicit)

- Docker engine unavailable → **no live backup, no restore drill, no Grafana/container observation, no watchdog execution** on this machine.
- Shell scripts written for busybox `sh` — reviewed by eye; must run `sh -n` + the §9 checklist on the server.
- Cron lines, retention behavior, off-site copies: **documented, unexecuted.**

## 12. Remaining gaps

1. On-host verification (deployment.md §8.9–10 + backup-and-recovery.md §9) — first server access.
2. Off-host copy of dumps (rsync + separate disk) — documented, not automated.
3. Restore drill (quarterly) — first execution measures true RTO.
4. Alert delivery channel (email/IM) + cron consumer for failed-jobs (A-04, A-05) — decision needed; endpoint + probes exist.
5. Grafana provisioning (datasources/dashboards) — nothing to build until a metrics pipeline (Prometheus/exporters) exists; documented as the condition, not as fake charts.
6. Media volume backup (manual `rsync` runbook) — documented, not automated.
7. `failed_jobs` dirt accumulation — no retention policy yet (observable; cleanup is a DBA task).

## 13. K-34 — scheduler

Explicitly **deferred**, per sprint constraints. No artificial scheduled jobs added. The backup mechanism runs from host cron (outside the PHP scheduler), so there is still **no real requirement** for `routes/console.php`; the scheduler container remains idle and documented as such (configuration.md / known-issues K-34).