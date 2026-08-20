# Phase-1 Deployment Checklist — Deferred Runtime Verifications

Phase-1 remediation (FIX-01..FIX-10) is committed on `main`. Items below were
implemented and covered by tests but could not be verified at runtime on a
production-like stack during development (no Docker locally). Run this
checklist once, in order, against the staging environment before promoting to
production.

Branch/commits: `security/phase-1-remediation` merged into `main`
(HEAD of Phase-1: `e989e75`; FIX-07 `bbf5946`, FIX-08 `f88d8c9`, FIX-09 `8547963`).

---

## 0. Prerequisites

- [ ] Pull `main`, deploy the backend + frontend artifacts
- [ ] Set production env vars (fail-closed defaults are the compose values):
  - `REQUIRE_TLS=true`
  - `SESSION_SECURE_COOKIE=true`
  - `APP_ENV=production`
  - `APP_URL=https://<host>`
  - `TRUSTED_PROXIES=<comma-separated edge CIDR(s)>`
- [ ] Run migrations with the least-privilege role (see item 2):
  - `docker compose run --rm backend php artisan migrate --force`
- [ ] Confirm admin users receive the one-time welcome sign-in mail (FIX-05)
  and that the plaintext token appears ONLY in the email body, never in logs,
  queue payloads or the database (`welcome_token_hash` is a SHA-256 digest)

## 1. nginx XFF hardening — runtime verification (FIX-07)

Implemented: `ys-api/docker/nginx/sites/default.conf` sets
`X-Forwarded-For $remote_addr` (never `$proxy_add_x_forwarded_for`); nginx.conf
includes `/etc/nginx/conf.d/*.conf`; app only trusts `TRUSTED_PROXIES` CIDRs.

- [ ] `docker compose exec edge nginx -t` — config parses (check "test is successful")
- [ ] Confirm the edge vhost is active: `docker compose exec edge nginx -T | grep -A3 'server_name'` shows the expected server block and the `proxy_set_header X-Forwarded-For` line
- [ ] From outside the stack, `curl -sI http://<host>` — response headers do NOT contain a spoofable chain: the app must see a single IP (the edge)
- [ ] From outside the stack, spoof attempt: `curl -s -H "X-Forwarded-For: 1.2.3.4" http://<host>/api/v1/auth/login -X POST` — verify the rate-limit key still resolves to the real client IP: 5 rapid failures → 429 for the real caller; the spoofed 1.2.3.4 must NOT absorb the limit
- [ ] Internal containers are outside `TRUSTED_PROXIES`: a request with a spoofed `X-Forwarded-For` arriving directly on the app port must be treated as untrusted (log lines show the raw header untouched — no client IP trust)
- [ ] After a restart with `TRUSTED_PROXIES` set, hit `/api/v1/health` and `GET /` — 200, no proxy-related errors in `laravel.log`

Regression test (CI covers logic): `tests/Feature/Security/TrustedProxyRateLimitTest.php`.

## 2. PostgreSQL `ys_app` role provisioning on production DB (FIX-08)

Implemented: initdb hook `docker/postgres/init/01-app-role.sh` provisions a
NOSUPERUSER role; all services connect as `ys_app`; audit_logs RLS REVOKE
hardened (UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER denied).

On an EXISTING database (created before FIX-08), the init hook does not run
(initdb scripts run only on first boot of an empty data dir) — provision
manually:

- [ ] As the DB superuser, run the equivalent of `docker/postgres/init/01-app-role.sh` against the existing cluster (create `ys_app` LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE, `GRANT CONNECT ON DATABASE`, `GRANT ALL ON SCHEMA public`, default privileges for future tables)
- [ ] Verify no superuser usage anywhere: `docker compose exec database psql -U ys_app -c "SELECT current_user, rolsuper FROM pg_roles WHERE rolname = current_user"` → `ys_app | f`
- [ ] Run `docker compose run --rm backend php artisan migrate --force` as `ys_app` — succeeds (role owns all migrated tables)
- [ ] Privilege hardening confirmed: as `ys_app`, `UPDATE audit_logs SET action='x'` → permission denied; `TRUNCATE audit_logs` → permission denied
- [ ] Audit rows still WRITTEN normally: trigger `audit()` on a resource mutation → row appears in `audit_logs`
- [ ] RLS policy functional: non-superuser querying `audit_logs` sees only its own rows (policy via `current_setting('app.tenant_id')`)
- [ ] Backup restore path: `ops/backup/backup.sh` succeeds as `ys_app` (it already owns the tables); restore into a fresh cluster then re-run the init hook before the app connects
- [ ] Credential hygiene: `DB_SUPERUSER`/`DB_SUPERUSER_PASSWORD` live only in ops secrets, never in app env; `.env` has `DB_USERNAME=ys_app`

## 3. TLS certificate installation + HTTP→HTTPS redirect test (FIX-09)

Implemented: `RequireTlsInProduction` middleware (403 JSON `code: TLS_REQUIRED`
on plain HTTP, exempting `/up` and `api/v1/health`); `SESSION_SECURE_COOKIE=true`.

- [ ] Install the TLS certificate/key on the edge server; nginx listens on 443 with `ssl_certificate`/`ssl_certificate_key` and `proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto`
- [ ] `curl -sI http://<host>` → 301/308 redirect to `https://<host>/` (permanent redirect must be configured at the edge)
- [ ] `curl -s http://<host>/api/v1/admin/dashboard/stats` (bypassing the redirect, plain HTTP) → HTTP 403 with `{"success":false,"code":"TLS_REQUIRED",...}` — the app's own fail-closed gate fires even if the edge redirect is bypassed (e.g. direct-to-app traffic)
- [ ] `curl -s http://<host>/up` and `curl -s http://<host>/api/v1/health` over plain HTTP → 200 (probe exemptions work)
- [ ] `curl -sI https://<host>/` → 200; login flow works end-to-end over HTTPS; the session cookie carries the `Secure` attribute: `curl -sI https://<host>/ | grep -i set-cookie` → `...; Secure; HttpOnly; SameSite=...`
- [ ] `openssl s_client -connect <host>:443 -servername <host> </dev/null 2>/dev/null | openssl x509 -noout -dates` — certificate valid and not expired; chain complete (no intermediate warnings in a browser)

Regression test (CI covers logic): `tests/Feature/Security/RequireTlsTest.php`.

## 4. Edge rate limiting + managed WAF recommendation (FIX-17 / GAP-04)

Implemented: `limit_req` zones in `docker/nginx/nginx.conf` keyed by the real
client IP (`$binary_remote_addr` — safe because the edge rewrites
`X-Forwarded-For` itself, FIX-07) + per-family `limit_req` in
`docker/nginx/sites/default.conf`, plus a connection-level `limit_conn`
(20 concurrent conns/IP). Both throttled responses are 429. These are coarse
flood gates; the backend enforces its own stricter per-IP/per-email budgets
(`throttle:public`/`auth`/`contact`/`admin`, VULN-15 escalating lockout,
VULN-27 per-user 300/min).

- [ ] Config parses: `docker compose exec nginx nginx -t` (the stack healthcheck runs this continuously; a broken config fails it)
- [ ] **Login flood** — `ab -n 100 -c 10 -p login.json -T application/json http://<host>/api/v1/auth/login` (with `login.json` = `{"email":"admin@…","password":"…"}`): ~6 requests pass (5 burst + credit), the rest → 429; a gentle `-n 5 -c 1` run right after → 200s once the budget refills
- [ ] **Zones are independent** — after the login flood above (auth zone exhausted), `POST /api/v1/auth/login` → 429 but `ab -n 5 -c 1 http://<host>/api/v1/public/products` → all 200 (public zone untouched) and vice versa
- [ ] **Contact gate** — `ab -n 10 -c 2 -p contact.json -T application/json http://<host>/api/v1/public/contact`: ~3 pass (2 burst + credit) then 429
- [ ] **Connection cap** — `ab -n 100 -c 30 http://<host>/api/v1/public/products` → 429 on requests beyond 20 concurrent connections
- [ ] **Legit traffic unaffected** — browse the public site and the admin panel normally: no 429s; `/api/v1/health` and `/up` stay unthrottled (probes)
- [ ] **Production WAF** — place a managed WAF (Cloudflare or AWS WAF) in front of this nginx for managed rule sets, bot management and DDoS absorption. The XFF chain already works behind it: add the provider's proxy CIDRs to `TRUSTED_PROXIES` (see item 0) so per-IP limits keep resolving to the real client

NOTE: nginx cannot express requests-per-hour (`rate` supports only `r/s` and
`r/m`), so the contact zone runs at `3r/m` + burst 2 as a flood gate; the true
3-per-hour (per IP) and 2-per-hour (per email) budgets are enforced in the
backend (`throttle:contact` + action-level checks).

Rollback: config-only — remove the `limit_req_zone`/`limit_conn_zone`/
`limit_req_status`/`limit_conn_status` lines from `nginx.conf` and the
`limit_req`/`limit_conn` directives from `default.conf`, reload nginx.

---

## Rollback notes

- All FIX-07/08/09 changes are config/compose-level plus two migrations
  (`2025_01_01_000012_audit_logs_row_level_security`, welcome-token columns).
  Rollback = revert env (`TRUSTED_PROXIES`, `REQUIRE_TLS`) and restore
  `DB_SUPERUSER` connectivity; the RLS migration `down()` mirrors the REVOKE
  hardening.
- The welcome-token migration is additive (nullable columns) — safe to keep on
  rollback.

## Phase-1 status

- [x] All 10 fixes merged (`main` @ `e989e75`)
- [x] Suite: 344 tests / 1352 assertions green
- [x] `composer audit`: 0 advisories; `npm audit`: 0 vulnerabilities
- [ ] Runtime items 1–3 verified on staging (this checklist)
- [ ] Production cutover + smoke test
