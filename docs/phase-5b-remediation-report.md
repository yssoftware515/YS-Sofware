# Phase 5B — Release-Candidate Remediation Report

**Date:** 2026-08-19
**Scope:** `ys-api` (Laravel 12 / PHP 8.4), `ys-web` (Next.js 16 / React 19), `docker-compose`, `.github/workflows/*`, `docker/nginx/*`
**Baseline:** HEAD `1d4b9ef` (unchanged; no commit/push performed during this phase)
**Gate findings:** G-01 (P1) … G-09 — defined in `docs/phase-5-release-candidate-audit.md`

---

## 1. Result

| Finding | Severity | Disposition |
|---|---|---|
| G-01 browser (SPA) CSRF 419 — login impossible from a browser | **P1** | **FIXED** — frontend XSRF handshake + nginx `/sanctum/` route + backend regression tests + **live end-to-end proof** |
| G-02 release.yml verify expects plain-HTTP 401/419 but TLS gate returns 403 | P2 | **FIXED** — HTTPS probes + plain-HTTP `{403,301,308}` assertion + HTTPS 401/419 assertion |
| G-03 ci.yml frontend-tests never runs the test suite | P2 | **FIXED** — `npm test` added (vitest, 75 tests) |
| G-04 Turnstile site key not propagated to frontend build | P2 | **FIXED** — build arg in release.yml + compose + root `.env.example` |
| G-05 empty `SANCTUM_STATEFUL_DOMAINS` passthrough would break stateful auth | P2 | **DOCUMENTED** — no passthrough added; `.env.example` carries real values (verified) |
| G-06 stale backend vhost `ys-api/docker/nginx/sites/default.conf` | P3 | **FIXED** — deleted (unreferenced by Dockerfile/compose) |
| G-07 dead `REDIS_HOST`/`REDIS_PORT` in root `.env.example` | P3 | **FIXED** — removed (stack is deliberately DB/file-backed, no Redis) |
| G-08 nginx logs container-local vs Laravel logs on volume | P3 | **DOCUMENTED** — covered by `docs/backup-and-recovery.md` §57-59 (logs disposable; `storage/logs` on `backend_storage`) |
| G-09 `StrictHostKeyChecking=no` in release.yml SSH | P2 | **FIXED** — `known_hosts` deploy secret, fail-closed |

**Verdict: A — RELEASE READY** (code-wise), subject to the operator-controlled conditions in §15.

---

## 2. Method

- **Backend:** full PHPUnit suite, 5 consecutive clean runs (484 tests / 1936 assertions each); security regression (`RequireTlsTest`, `TrustedProxyRateLimitTest`) green.
- **Frontend:** `vitest run` (17 files / 75 tests), `eslint .`, `tsc --noEmit`, `next build` — all clean; the build-time `HTTPS is required` messages during static generation are the TLS gate failing closed against SSR fetches without `X-Forwarded-Proto` (expected local behavior; production nginx forwards `https`).
- **Live runtime:** browser-equivalent Node client against the running API (`127.0.0.1:8000`, `REQUIRE_TLS=true`, `TRUSTED_PROXIES=127.0.0.1`), full cookie-jar round-trip — see §11.
- No security control was weakened: no CSRF bypass, no route exemption, no `statefulApi()` removal, no `REQUIRE_TLS=false`, no localStorage tokens.

---

## 3. G-01 — browser (SPA) CSRF 419 (P1, FIXED)

### 3.1 Root cause chain

1. `bootstrap/app.php` calls `$middleware->statefulApi()` — Sanctum's `EnsureFrontendRequestsAreStateful` wraps every `/api/*` request that carries a matching `Origin`/`Referer` in `EncryptCookies` + `ValidateCsrfToken` (Laravel 12 name of `VerifyCsrfToken`).
2. `ValidateCsrfToken::getTokenFromRequest()` reads `_token` input → `X-CSRF-TOKEN` header → **decrypted `X-XSRF-TOKEN` header** (`CookieValuePrefix::remove(decrypt($header, serialized))`). A browser never sends these by itself: the XSRF-TOKEN cookie is **URL-encoded** and must be `decodeURIComponent`'d and echoed in the header (the axios `xsrfCookieName` contract that the SPA must implement manually with `fetch`).
3. The frontend used plain `fetch` with no handshake — every stateful non-GET (login, logout, every admin write) 419'd `CSRF token mismatch` while carrying a valid `Origin`.
4. The backend suite was **green because** `ValidateCsrfToken::runningUnitTests()` short-circuits the check when the console + unit-test flags are set — the middleware literally cannot fail in PHPUnit. The suite's 419 expectations never executed the real gate.

### 3.2 Fixes

- **`ys-web/lib/csrf.ts`** (new): `readXsrfToken()` (`decodeURIComponent` of the cookie value), `apiOrigin()` (cookie lives at the origin root, NOT under `/api/v1`), `ensureXsrfToken()` (shared inflight promise, `credentials: 'include'`, GET `/sanctum/csrf-cookie`), browser-guarded (`typeof document === 'undefined'` → no-op on the server).
- **Wired into** `lib/admin/api.ts` `adminFetch()`, `lib/api/client.ts` `request()` (non-GET: `await ensureXsrfToken(API)` + `X-XSRF-TOKEN`), `app/admin/login/page.tsx`, `app/admin/admin-shell.tsx` (logout).
- **`docker/nginx/sites/default.conf`**: `location /sanctum/` → `proxy_pass http://backend` with the standard proxy headers (origin-root route, would otherwise hit Next.js and 404).
- **`ys-api/tests/Feature/Auth/StatefulCsrfFlowTest.php`** (new, 4 tests): binds a `ValidateCsrfToken` subclass whose `runningUnitTests()` returns `false` so the gate behaves exactly as behind a browser, then asserts both sides of the contract.

### 3.3 Regression tests (all pass)

| Test | Result |
|---|---|
| stateful POST without any XSRF echo → **419** | ✅ |
| stateful POST with a forged token → **419** | ✅ |
| full browser flow: handshake → login (echo) → cookie-auth `/me` → logout (echo) → **200** | ✅ |
| authenticated stateful POST without echo → **419** (gate fires before auth) | ✅ |

### 3.4 Live end-to-end (browser-equivalent Node client, real cookie jar)

```
PASS  GET /sanctum/csrf-cookie -> 204            (sets XSRF-TOKEN + ys_session)
PASS  login with echoed XSRF -> 200              (NOT 419 — G-01 fixed)
PASS  me (cookie auth) -> 200
PASS  role create (stateful write) -> 201        (real DB write)
PASS  role create (no echo) -> 419
PASS  logout with echo -> 200
PASS  logout (no echo) -> 419
PASS  me after logout -> 401
```

Throwaway user/role removed from the live DB after the run.

### 3.5 Cookie attributes (verified live)

- `XSRF-TOKEN`: encrypted, **not** HttpOnly (readable by client JS — required for the echo), URL-encoded.
- `ys_session`: encrypted, HttpOnly, SameSite=lax.
- `ys_admin_token`: encrypted, HttpOnly, SameSite=lax, 8h (30d with `remember`).

### 3.6 Test-client findings (documented in the test file)

- The Laravel test client does **not** round-trip encrypted response cookies; authenticated follow-ups re-inject the plaintext token via `withCookie()` (AuthTest pattern). The full browser cookie round-trip is proven live (§3.4).
- `withHeaders()` **merges** into a shared header set — a login's `X-XSRF-TOKEN` leaks into the next request unless removed with `withoutHeader()` (this is what initially produced false-positive 200s in the negative test).
- Cookies are only sent when `withCredentials()` is set.

---

## 4. G-02 — release.yml verify step vs TLS gate (P2, FIXED)

`RequireTlsInProduction` exempts only `/up` and `/api/v1/health`; every other plain-HTTP request is 403. The verify step probed plain HTTP and demanded 401/419 → would always fail after a healthy deploy.

**Fix** (`.github/workflows/release.yml`):
- Health probes now go over **HTTPS** (`https://${{ secrets.DEPLOY_URL }}/…`; DEPLOY_URL = public HTTPS host, scheme omitted — documented in a comment).
- Plain-HTTP admin probe asserts `{403,301,308}` (TLS gate / ingress redirect) — proves the gate is in force.
- HTTPS admin probe asserts `{401,419}` — proves the auth layer is reachable.

---

## 5. G-03 — ci.yml frontend-tests never runs tests (P2, FIXED)

The job carried a stale comment claiming no test framework is installed and ran only lint + type-check. `vitest` is installed with 75 tests across 17 files. **Fix:** `npm test` added to the job (comment updated). Runs green locally; CI will run it on next push.

---

## 6. G-04 — Turnstile site key is build-time (P2, FIXED)

The widget is server-rendered on the login page → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` must be inlined at image build.

**Fix:** build arg added to the frontend build in `release.yml` (`vars.NEXT_PUBLIC_TURNSTILE_SITE_KEY`, empty default), to `docker-compose.yml` (`${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-}`), and to the root `.env.example` (with a comment pointing at `TURNSTILE_SECRET_KEY`). `ys-api/.env.example` already carried the full Turnstile set (§13).

---

## 7. G-05 — `SANCTUM_STATEFUL_DOMAINS` empty-passthrough trap (P2, DOCUMENTED)

Adding `SANCTUM_STATEFUL_DOMAINS=` to any env file would make `explode(',', '')` yield `['']`, breaking stateful auth silently. **Decision: no passthrough added.** Verified: `ys-api/.env.example:91` carries real values (`localhost:3000,127.0.0.1:3000`), and `config/sanctum.php` falls back to `localhost:3000` when the variable is unset. No change required.

---

## 8. G-06 — stale backend vhost (P3, FIXED)

`ys-api/docker/nginx/sites/default.conf` was dead weight: the backend image copies `docker/nginx/nginx.conf` only, and compose mounts `docker/nginx/sites` (repo root). Deleted along with the empty `sites/` directory. The active edge vhost is `docker/nginx/sites/default.conf` (the one with the new `/sanctum/` location).

---

## 9. G-07 — dead Redis env vars (P3, FIXED)

`REDIS_HOST`/`REDIS_PORT` removed from the root `.env.example` (lines 53-55). The stack is deliberately DB/file-backed (cache=file, sessions=file, queue=database; no Redis service exists in compose — Phase 4A P1-01). `DeploymentConfigConsistencyTest` already guards against reintroduction.

---

## 10. G-08 — log location documentation (P3, DOCUMENTED)

nginx logs stay container-local (`docker logs`); Laravel logs live on `backend_storage:/app/storage` (`storage/logs`), surviving restarts. Already documented: `docs/backup-and-recovery.md` §57-59 (logs "disposable", `storage/logs` + container logs). No change required.

---

## 11. G-09 — SSH host-key verification (P2, FIXED)

`ssh -i deploy_key -o StrictHostKeyChecking=no` replaced with a pinned `known_hosts` file written from the new `DEPLOY_KNOWN_HOSTS` secret; `StrictHostKeyChecking` stays at its default so an unknown/changed host key **aborts** the deploy (fail-closed) instead of accepting a MITM. Operator must populate `DEPLOY_KNOWN_HOSTS` with the deployment host's public key (§15).

---

## 12. Gates

| Gate | Command | Result |
|---|---|---|
| Backend suite (run 1) | `php vendor/bin/phpunit` | ✅ 484 / 484 (1936 assertions) |
| Backend suite (run 2) | same | ✅ 484 / 484 |
| Backend suite (run 3) | same | ✅ 484 / 484 |
| Backend suite (run 4) | same | ✅ 484 / 484 |
| Backend suite (run 5) | same | ✅ 484 / 484 |
| Security regression | `--filter RequireTlsTest` | ✅ 5 / 5 |
| Security regression | `--filter TrustedProxyRateLimitTest` | ✅ 3 / 3 |
| Frontend tests | `npm test` (vitest) | ✅ 75 / 75 (17 files) |
| Frontend lint | `npm run lint` | ✅ exit 0 |
| Frontend types | `npm run type-check` | ✅ exit 0 |
| Frontend build | `npm run build` | ✅ 79 routes |
| G-01 regression | `--filter StatefulCsrfFlowTest` | ✅ 4 / 4 (21 assertions) |
| Live e2e | Node cookie-jar client | ✅ 8/8 checks (§3.4) |

All gates run after the last code change. Scratch/debug files (`ScratchCsrfFlowTest.php`, `ScratchCsrfDebugTest.php`, `ScratchLogoutDebugTest.php`, `csrf-debug-standalone.php`, `schema-check.php`) removed.

---

## 13. Environmental finding (not a code defect)

An earlier 500 on the failed-login audit path (`SQLSTATE[42703]: column "product_id" of relation "audit_logs" does not exist`) turned out to be a **local DB missing pending migrations** — `2026_08_18_000001_add_created_at_index_to_audit_logs_table` and `2026_08_18_000002_add_product_id_to_audit_logs_table`. Applied with `php artisan migrate --force` (release.yml runs `migrate --force` before `up` — prod safe). The API process also carried a stale env; restarted with `REQUIRE_TLS=true` + `TRUSTED_PROXIES=127.0.0.1`.

---

## 14. Verification notes

- `ValidateCsrfToken`/`VerifyCsrfToken` (vendor): token from input → `X-CSRF-TOKEN` → decrypted `X-XSRF-TOKEN`; `CookieValuePrefix` = 40-hex HMAC + `|`; `EncryptCookies::$except = []` (all cookies encrypted, prefix inside ciphertext).
- Sanctum pipe resolves `config('sanctum.middleware.validate_csrf_token')` → `ValidateCsrfToken::class` — binding `VerifyCsrfToken::class` in tests does NOT intercept; the subclass must extend `ValidateCsrfToken` (constructor `(Application $app, Encrypter $encrypter)`).
- Frontend build-time `[public:*] fetch failed: HTTPS is required` lines are the TLS gate failing closed on SSR fetches without `X-Forwarded-Proto` — expected locally, pages degrade gracefully, build completes; production nginx forwards the scheme.
- Compose YAML changes parse; `nginx -t` remains operator-required (§15).

---

## 15. Operator checklist (BLOCKED on this host — no container runtime, no nginx binary, no cron)

- [ ] `docker compose build` all images; verify frontend image has `NEXT_PUBLIC_TURNSTILE_SITE_KEY` inlined when set
- [ ] `docker compose exec nginx nginx -t` (healthcheck runs this continuously)
- [ ] Live smoke through the edge: `/sanctum/csrf-cookie` → browser login → admin write → logout (G-01 contract through the gateway)
- [ ] Verify step behavior with a plain-HTTP probe → 403/301/308 and HTTPS probe → 401/419
- [ ] Populate `DEPLOY_KNOWN_HOSTS` (G-09) and verify the deploy SSH step connects
- [ ] SMTP delivery, scheduled backups (`docker compose --profile production run --rm backup`), external TLS gateway must forward `X-Forwarded-Proto: https` (Phase 4B map; fail-loud 403 otherwise)
- [ ] Turnstile: set `TURNSTILE_ENABLED=true` + secret key + site key (build arg) to enforce CAPTCHA in production

---

## 16. Conclusion

**Verdict: A — RELEASE READY** (code verdict). The P1 browser-CSRF defect (G-01) is fixed end-to-end and proven against the live API with a real cookie-jar browser-equivalent client; the negative cases (no echo, forged token, authenticated no-echo) still 419. All remaining findings are fixed or documented. The only outstanding items are operator-controlled runtime verifications listed in §15 — they do not affect the code verdict.

**STOPPED** — no commit, no push, no Phase 6. Post-release backlog (unchanged): search relevance refinement, scheduled-backup automation, CI DB-connectivity hardening.