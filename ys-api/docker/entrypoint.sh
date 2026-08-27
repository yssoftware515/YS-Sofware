#!/bin/sh
set -e

# Worker/scheduler/one-off containers (queue-worker, scheduler, release.yml
# "docker compose run backend php artisan ...") pass a command -> exec it.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# ── Resolve HTTP port ──────────────────────────────────────────
# Railway / Render set $PORT dynamically. Docker Compose sets
# $BACKEND_PORT. Fallback to 8000 for bare `docker run` and local
# development.
HTTP_PORT="${PORT:-${BACKEND_PORT:-8000}}"

# Template the nginx listen directive with the resolved port.
# nginx.conf ships with a hardcoded `listen 8000;` — sed replaces
# it at startup so the same image works on Railway/Render (dynamic
# port), Docker Compose (BACKEND_PORT), and bare docker run (8000).
sed -i "s/listen 8000/listen ${HTTP_PORT}/" /etc/nginx/nginx.conf

# ── Startup migrations (idempotent, safe to repeat) ────────────
# Migrations must run at every startup so schema changes are applied
# on each deploy. Seeders are intentionally excluded — they must be
# run manually on first deployment via Render Shell:
#   php artisan db:seed --force
php artisan migrate --force 2>/dev/null || true

# ── Production caches ──────────────────────────────────────────
php artisan config:cache --quiet 2>/dev/null || true
# NOTE: route:cache is intentionally skipped — Sanctum registers its
# /sanctum/csrf-cookie route dynamically via the service provider.
# When routes are cached, the provider sees routesAreCached() === true
# and skips registration, so the CSRF cookie endpoint disappears and
# every SPA auth flow breaks (CORS errors on /sanctum/csrf-cookie).
php artisan view:cache --quiet 2>/dev/null || true

# ── Startup diagnostics ────────────────────────────────────────
# Log critical env var status at boot so misconfigurations are
# visible in deploy logs immediately, not after a user reports a 403.
if [ -n "$TRUSTED_PROXIES" ]; then
  echo "[boot] TRUSTED_PROXIES=$TRUSTED_PROXIES"
else
  echo "[boot] TRUSTED_PROXIES not set — using config default (private_ranges)"
fi
if [ -n "$FRONTEND_URL" ]; then
  echo "[boot] FRONTEND_URL=$FRONTEND_URL"
else
  echo "[boot] WARNING: FRONTEND_URL not set — CORS and Sanctum stateful domains may be wrong"
fi
if [ -n "$SANCTUM_STATEFUL_DOMAINS" ]; then
  echo "[boot] SANCTUM_STATEFUL_DOMAINS=$SANCTUM_STATEFUL_DOMAINS"
fi

# ── HTTP layer ─────────────────────────────────────────────────
# php-fpm daemonizes; nginx stays in the foreground as PID 1.
# This is the same production nginx+php-fpm architecture used in
# Docker Compose — the only difference is the dynamic port above.
php-fpm -D
exec nginx -g 'daemon off;'
