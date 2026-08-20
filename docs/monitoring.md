# Monitoring & Alerting

**Verification:** ⚠️ static review — no Docker engine available; none of the containers have been observed at runtime yet. Everything in this file is grounded in code/configuration that exists. **Nothing here claims metrics that do not exist.**

**Sprint:** 11. **Date:** 2026-08-09

---

## 1. What the stack contains today (Grafana)

- `monitoring` service (`grafana/grafana:11.4.0`, production profile only, port `127.0.0.1:3001`, fail-fast `GRAFANA_PASSWORD`).
- **Data sources: none.** No Prometheus, no exporters, no Loki, no provisioning directories, no dashboards.
- Grafana currently ships as an **empty control plane**: it can be logged into, but it has nothing to display and no alerting backend.

This is documented as a **monitoring gap**, not papered over. The sprint deliberately does not invent metrics.

## 2. Real signals that exist (all verifiable today)

| Signal | Type | Where | How to observe |
|---|---|---|---|
| Backend readiness | HTTP | `GET /api/v1/health` (DB + cache checks, public) | container healthcheck, release verify, watchdog |
| Backend liveness | HTTP | `GET /up` (Laravel /up, internal) | `docker inspect`-healthcheck: backend |
| Frontend readiness | HTTP | `GET /health/live` (Next route) | frontend healthcheck, watchdog |
| Database liveness | TCP→`pg_isready` | container | `docker inspect`-healthcheck: database |
| Redis liveness | TCP→`ping` | container | `docker inspect`-healthcheck: redis |
| Edge nginx config | stdin | `nginx -t` | nginx healthcheck |
| Auth layer reachable | HTTP 401 | `GET /api/v1/admin/products` (unauth) | watchdog checks it answers 401, not 502/404 |
| Failed queue jobs | HTTP | `GET /api/v1/admin/ops/failed-jobs` (`view_audit_logs`) | admin API (read-only) |
| Database backup | filesystem | `./backups/*.dump` + run log | backup exit code + nightly cron log |
| Container restarts | Docker API | `docker compose ps`, `docker inspect` | host commands |

### Container healthcheck state (compose)

`docker compose ps` shows `healthy` / `unhealthy` / `restarting` per service thanks to the per-container healthchecks (frontend `/health/live`, backend `/up`, DB `pg_isready`, Redis `redis-cli ping`, nginx `nginx -t`). This is the first human-visible "real signal".

## 3. External availability probe (implemented this sprint)

`ops/watchdog/healthcheck.sh` — a zero-dependency host probe measuring exactly the signals above (no invented thresholds):

```bash
# every 5 minutes, as root cron on the host
*/5 * * * * /opt/ys-platform/ops/watchdog/healthcheck.sh >> /var/log/ys-watchdog.log 2>&1
```

Behavior: exit `0` only when `/health/live`, `/api/v1/health` and the auth-401 gate all answer; any failure exits non-zero with a `[watchdog] FAIL ...` line carrying the exact cause. **Alert delivery** (email/IM/pager) is not implemented — the log line + exit code are the signal; wiring a channel is an explicit remaining gap (§7).

## 4. Alert catalogue

Only alerts backed by an existing measurable signal are defined. Every entry: condition → severity → meaning → action → recovery expectation.

| ID | Severity | Condition | Meaning | Action | Recovery expected |
|---|---|---|---|---|---|
| A-01 | CRITICAL | `/api/v1/health` returns non-2xx (watchdog) | API or its dependencies (DB/cache) down/inaccessible | Investigate: `docker compose ps`, `docker compose exec backend php artisan about`, DB/Redis healthchecks | 6xx→200 in one health check or restart cycle |
| A-02 | CRITICAL | `docker compose ps` shows `unhealthy` or `restarting` for database/redis/backend | container crashed or crash-looping | `docker compose logs --tail=200 <svc>` | restart via `restart: unless-stopped`; else manual |
| A-03 | CRITICAL | auth gate answers ≠401 (watchdog) | edge routing broken (502/404/500 on /api) | checks nginx conf + backend container health | next probe OK |
| A-04 | WARNING | `/api/v1/admin/ops/failed-jobs` has new rows since last check | a queued job exhausted its retries (mail/DB) | Fetch page, first exception line shows cause (e.g. SMTP credentials) | retry when root cause fixed; jobs recover without operator data loss |
| A-05 | WARNING | backup cron log missing today's `[backup] finished successfully` or 206 exit ≠0 | nightly backup failed | Read `/var/log/ys-backup.log`; re-run `docker compose --profile production run --rm backup` (backup is a profile-controlled service) | today's dump exists + log shows success |
| A-06 | WARNING | `/health/live` non-2xx | frontend unresponsive | `docker compose logs frontend` | next probe OK |

Not included (no real metric exists — do not add until the data exists): CPU/memory/disk pressure, per-endpoint latency, queue depth over time, business counters, Grafana-backed alerts. The resource signals can only come from a metrics pipeline (§7).

## 5. Operator actions — quick reference

```bash
# one-line health
docker compose ps
# tail problems
docker compose logs --tail=100 backend database redis queue-worker
# deep probes
curl -fsS http://localhost/api/v1/health; echo
curl -fsS http://localhost/health/live; echo
# failed jobs (permissions: view_audit_logs)
curl -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/admin/ops/failed-jobs
# backup
ls -la /opt/ys-platform/backups/
docker compose --profile production run --rm backup
```

## 6. Monitoring gaps (honest list)

1. **No metrics pipeline** — no Prometheus, no exporters, no dashboards. Container resource usage & disk are invisible except by host `docker stats`.
2. **Grafana is an empty shell** — nothing to display until a datasource exists.
3. **No alert delivery channel** — the watchdog writes logs and exits non-zero; there is no email/webhook consumer. Decision needed: host MTA, external monitor (UptimeRobot), or third-party pager.
4. **No failed-job alert automation** — A-04 is a manual query today (endpoint exists; cron consumer does not).
5. **No measured RTO** — restore RTO is a target until the quarterly drill runs (backup-and-recovery.md §8).
6. **No business/frontend performance signals.**

These are deliberately **not** implemented with fake data; each stays on the sprint backlog until a real signal can back it.