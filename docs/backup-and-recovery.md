# Backup & Recovery

**Verification:** ⚠️ static implementation review only — no Docker engine available, so the backup/restore cycle has not been executed yet. Every procedure below is written to be run verbatim on the first real server. See "Runtime verification pending" at the end.

**Sprint:** 11 (ME-06). **Date:** 2026-08-09

---

## 1. Backup architecture

A dedicated one-shot compose service, completely decoupled from the application:

```
docker compose --profile production run --rm backup
```

> **Operator note — compose profiles:** the `backup` service is **profile-controlled**
> (profiles: `development`, `staging`, `production`). It is not visible to
> `docker compose` unless the matching profile is active, so the invocation
> above (or `--profile staging` / `--profile development` on those hosts) is
> mandatory. Every `docker compose … backup …` command in this document uses
> the production profile. Scheduling is **host-side cron** — there is **no
> Laravel scheduler task for backups**, and none should be added (K-34 remains
> deferred: no Laravel scheduled commands exist, so the `scheduler` container
> is idle by design).

| Aspect | Design |
|---|---|
| Service | `backup` (postgres:16-alpine — same image as the database, so `pg_dump`/`pg_restore` versions match the server) |
| Runs | On demand from the host; optionally every night via host cron |
| Inputs | `DB_HOST=database`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `BACKUP_DIR=/backups`, `BACKUP_RETENTION` |
| Credentials | Only from container environment (`DB_PASSWORD` → `PGPASSWORD`). Never in the script, never logged |
| Output | Host bind mount `./backups/` (gitignored) |
| Independence | Requires only the **database** container to be healthy — the app (backend/frontend/queue/scheduler) can be fully down |
| Script | `ops/backup/backup.sh` (POSIX sh, mounted read-only) |

### What each run does

1. `pg_dump --format=custom --compress=9` (compressed, restorable archive)
2. writes to `<db>-<YYYYmmdd-HHMMSS>.dump.tmp.<pid>` first — a partial dump can never be published
3. **verifies** the archive with `pg_restore --list` before publishing (a dump that cannot be listed is deleted and the run fails)
4. atomically `mv` to `<db>-<YYYYmmdd-HHMMSS>.dump`
5. prunes to the newest `BACKUP_RETENTION` dumps (default `7`; `0` = keep all)
6. exits `0` and logs `[backup] backup finished successfully`, or a non-zero exit code and a `FATAL` line

Exit codes: `0` success · `1` any failure (connectivity, dump, verification) · `3` target filename already exists (collision — explicitly refused, never overwritten).

## 2. What is backed up

- **All PostgreSQL data** of `${DB_DATABASE}`: schema, tables, rows, constraints, indexes, sequences. Custom-format archive is portable to a clean instance of the same major version.
- The dump is **compressed** (`-Z 9`) but **not encrypted at rest** — see §6.

## 3. What is NOT backed up (and why)

| Data | Owner | Reason / expectation |
|---|---|---|
| Cache & sessions | `backend_storage` volume (`storage/framework/cache`, `.../sessions`) | file-backed, travels with the storage volume; safe to lose (TTL-bound) |
| Uploaded media (`backend_storage` volume) | product covers, gallery, docs | binary volume, not in the dump. If media matters, run a nightly host-level `rsync`/copy of the volume in addition (documented runbook below; not automated) |
| Logs | `storage/logs`, container logs | disposable |
| Grafana state (`grafana_data`) | dashboards | export dashboards via API when they exist (none provisioned today — see monitoring.md) |
| Configuration secrets (`.env`, `APP_KEY`, SMTP/DB passwords) | host | **never** in backups; a restore onto a fresh host requires the same `APP_KEY` (cookie/session encryption) and the host `.env` |

## 4. Frequency, retention, storage location

- **Frequency (recommended):** one dump per night. Host crontab (server, root):

  ```cron
  # Backup at 02:05 UTC daily; failures visible in log + hourly watchdog sees exit code
  5 2 * * * cd /opt/ys-platform && docker compose --profile production run --rm backup >> /var/log/ys-backup.log 2>&1
  ```

- **Retention:** by **count** — newest `BACKUP_RETENTION` dumps kept (`BACKUP_RETENTION=7` default). Old files are pruned only by size of the file list, never touched otherwise.
- **Storage location (production):** `./backups` on the host (bind mount). It must live on a **different physical disk than the PostgreSQL data volume** and, for full protection, be **copied off-host** (e.g. nightly `rsync` + a different machine/backup drive). The compose file does not leave the host.

## 5. Restore procedure

> ⚠️ Destructive commands below target a **replacement** database. Never run them against a live production instance.

### 5.1 Identify a backup

```bash
ls -la /opt/ys-platform/backups/          # ys_platform-YYYYmmdd-HHMMSS.dump
```

Filename embeds the database and the run timestamp; the newest dated file is usually the best recovery point (RPO target ≤ 24h).

### 5.2 Verify a backup (before trusting it)

```bash
cd /opt/ys-platform
docker compose --profile production run --rm --no-deps backup sh -c 'pg_restore --list /backups/ys_platform-YYYYmmdd-HHMMSS.dump >/dev/null && echo BACKUP-OK'
```

Prints `BACKUP-OK` only when the archive is readable. It does not prove row-level integrity — the strongest available check short of a full restore is to perform one into a scratch database (5.4).

### 5.3 Restore into a clean PostgreSQL database

Option A — **scratch verify** (non-destructive, recommended before every real restore):

```bash
# creates ys_restore_verify inside the database container; then walks the archive
docker compose exec -T database sh -c 'createdb -U ys_user ys_restore_verify'
docker compose --profile production run --rm --no-deps backup \
  sh -c 'pg_restore --no-owner --exit-on-error -U ys_user -d "host=database dbname=ys_restore_verify" /backups/ys_platform-YYYYmmdd-HHMMSS.dump && echo RESTORE-OK'
```

Option B — **actual recovery** (destructive on the target database):

```bash
# bring the app down first (see 5.5 for the downtime envelope)
docker compose stop frontend backend queue-worker scheduler

# replace the database contents
docker compose exec -T database sh -c 'psql -U ys_user -d ys_platform -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
docker compose --profile production run --rm --no-deps backup sh -c 'pg_restore --clean --if-exists --no-owner -U ys_user -d ys_platform /backups/ys_platform-YYYYmmdd-HHMMSS.dump'

# if the backup predates the current schema, apply pending migrations:
docker compose run --rm backend php artisan migrate --force --pretend   # review
docker compose run --rm backend php artisan migrate --force            # actual

docker compose up -d
```

### 5.4 Clean-instance restore (fresh host / scratch verification)

Same two commands as 5.3, but targeting a freshly provisioned database. This is the honest **"can we actually come back?"** test and should be rehearsed quarterly (see §8).

### 5.5 What happens to application downtime

| Phase | Down? | Duration (target, not yet measured) |
|---|---|---|
| Detect + verify archive | yes | ≈ 10 min |
| Stop app containers | yes | ≤ 1 min |
| Restore (restore time scales with DB size) | yes | 5’ — 60’ |
| Migrate (only if schema drifted) | yes | as needed |
| `up` + health gates | partial | ≈ 5 min |

**Target RTO ≈ 1 hour** for a DB of this scale; pathological large datasets will take longer. No metric exists yet — it becomes a measured value the first time the quarterly drill (§8) is executed.

## 6. Security expectations

- Credentials: only env (`DB_PASSWORD`); the backup container has no file with secrets.
- File permissions: script runs with `umask 077` (owner-only) and binds the host dir to `./backups`.
- Host: keep `backups/` out of the web server document roots and out of Git (root `/.gitignore` covers it).
- **Encryption**: the dump is compressed, **not encrypted**. Treat the host disk/volume as trusted; if untrusted (cloud disk, off-site copy), wrap with volume/LUKS encryption or `gpg -c`. Encryption is a documented follow-up, not implemented in the script.

## 7. Failure detection (backup)

- `docker compose --profile production run --rm backup` exit code + `[backup]` log lines (docs).
- Host cron line above records each night's run in `/var/log/ys-backup.log`.
- A failed run is **visible** via the log + the absence of a fresh dump file; wire the log file into your monitoring once an alert channel exists (see monitoring.md — currently no automated alert delivery).

## 8. RPO / RTO — honest statement

| Metric | Value | Status |
|---|---|---|
| RPO | ≤ 24h (nightly) / ≤ 24h worst case with 02:05 cron | target; only a full instrumentation run can measure |
| RTO | ≈ 1 h (target) | **target** — not measured until a quarterly restore drill is executed |

Not numbers on a diagram: the repository ships a **quarterly drill** (executing §5.4 on a scratch database and recording the wall-clock) as the acceptance criterion for both.

---

## 9. Runtime verification pending (first server access)

- [ ] `docker compose --profile production run --rm backup` — exit 0, `backup finished successfully`
- [ ] a `.dump` file exists in `./backups` with size > 0, `pg_restore --list` OK
- [ ] retention pruning keeps exactly `BACKUP_RETENTION` dumps
- [ ] kill mid-dump (docker stop) leaves no `.dump`/`.tmp` garbage
- [ ] full scratch restore (§5.4) finishes on the server and `/api/v1/health` reports `ok`
- [ ] cron job runs unattended overnight
- [ ] **off-host copy** of dumps is in place after the first week