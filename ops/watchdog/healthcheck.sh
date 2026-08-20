#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# YS Systems — external availability probe (Sprint 11)
#
# Zero-dependency: plain curl against the real endpoints. No metrics are
# invented here — this checks the same signals the platform already exposes:
#   * frontend readiness route   /health/live
#   * backend readiness route    /api/v1/health  (DB + cache)
#   * auth gate must answer 401  /api/v1/admin/products
#
# Exit 0 = all measurable endpoints healthy, non-zero otherwise. Wire it on
# the host (cron hour or systemd timer), e.g.:
#
#   */5 * * * * /opt/ys-platform/ops/watchdog/healthcheck.sh \
#       >> /var/log/ys-watchdog.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -u

BASE_URL="${YS_WATCHDOG_BASE_URL:-http://127.0.0.1}"
TIMEOUT="${YS_WATCHDOG_TIMEOUT:-15}"

fail() { echo "[watchdog] $(date -Is) FAIL: $*"; exit 1; }

curl -fsS -o /dev/null --max-time "$TIMEOUT" "$BASE_URL/health/live" \
  || fail "frontend /health/live unreachable"

curl -fsS -o /dev/null --max-time "$TIMEOUT" "$BASE_URL/api/v1/health" \
  || fail "backend /api/v1/health unreachable (DB or cache degraded)"

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$BASE_URL/api/v1/admin/products")"
[ "$code" = "401" ] || fail "api auth gate expected 401, got ${code}"

echo "[watchdog] $(date -Is) all checks healthy"
exit 0