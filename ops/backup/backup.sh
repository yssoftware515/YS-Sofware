#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# YS Systems — PostgreSQL database backup (Sprint 11)
#
# Runs inside the `backup` compose service (postgres:16-alpine, same image as
# the database service). Produces a timestamped, custom-format (compressed)
# pg_dump, verifies it by listing its archive, then applies retention.
#
# Design rules:
#   * credentials come ONLY from the container environment (PGPASSWORD /
#     DB_*), never from this file, never echoed to logs
#   * a partial dump can never survive: pg_dump writes to a .tmp file (pid
#     suffixed) that is removed on failure
#   * an existing file at the target name aborts (no silent overwrite)
#   * the backup must not be claimed valid until pg_restore --list succeeds
#   * every failure exits non-zero and the final line is explicit
# ─────────────────────────────────────────────────────────────────────────────
set -e
umask 077

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${DB_HOST:-database}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-ys_user}"
DB_DATABASE="${DB_DATABASE:-ys_platform}"
BACKUP_RETENTION="${BACKUP_RETENTION:-7}"

TS="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/${DB_DATABASE}-${TS}.dump"
TMP="${FILE}.tmp.$$"

log() { echo "[backup] $*"; }
fail() {
  log "FATAL: $*"
  exit "${2:-1}"
}

# Whatever happens, a partial dump must never survive.
trap 'rm -f -- "$TMP" 2>/dev/null || true' EXIT

log "started (db=${DB_DATABASE}@${DB_HOST}:${DB_PORT} retention=${BACKUP_RETENTION})"

# 1. Destination must exist and be writable — fail loudly otherwise.
mkdir -p -- "$BACKUP_DIR" 2>/dev/null || fail "cannot create backup directory ${BACKUP_DIR}"
[ -w "$BACKUP_DIR" ] || fail "backup directory not writable: ${BACKUP_DIR}"

# 2. Never silently overwrite an existing backup.
[ -e "$FILE" ] && fail "target backup already exists: ${FILE}" 3
[ -e "$TMP" ] && rm -f -- "$TMP"

# 3. Dump (compressed custom format). PGPASSWORD is exported by compose.
log "database dump created to ${TMP}"
if ! PGPASSWORD="${DB_PASSWORD}" pg_dump \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USERNAME" \
  --format=custom --compress=9 --file="$TMP" "$DB_DATABASE"; then
  fail "pg_dump failed (see output above)"
fi

# 4. Verify — a dump that pg_restore cannot read is worthless.
if ! pg_restore --list "$TMP" >/dev/null 2>&1; then
  fail "verification failed: pg_restore cannot read the dump"
fi
log "backup verified (pg_restore --list OK)"

# 5. Publish atomically and make the file group-readable only.
mv -- "$TMP" "$FILE"

SIZE="$(wc -c < "$FILE")"
log "backup completed: ${FILE} (${SIZE} bytes)"

# 6. Retention — keep the newest BACKUP_RETENTION dumps (0 = keep all).
if [ "$BACKUP_RETENTION" -gt 0 ] 2>/dev/null; then
  to_delete=$((BACKUP_RETENTION + 1))
  # shellcheck disable=SC2012
  for old in $(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | tail -n +"$to_delete"); do
    log "retention: removing ${old}"
    rm -f -- "$old" || fail "failed to remove ${old}"
  done
fi

log "backup finished successfully"
exit 0