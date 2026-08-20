# Security Audit Report — YS-SOFTWARE

**Date:** 2026-08-16
**Scope:** `ys-api` (Laravel 12 / PHP 8.4), `ys-web` (Next.js 16 / React 19), `docker-compose` + `nginx`
**Method:** Static code review, targeted penetration-style testing, dependency audits (composer + npm), regression test suite (PHPUnit), PHP-CS-Fixer (Pint)
**Result:** All confirmed findings remediated. **0 open vulnerabilities** in production dependency audits. **265 tests / 927 assertions green.**

---

## 1. Executive Summary

Ten claims from the pre-audit security review were verified against the codebase. Six were **confirmed** and are now fixed; two were **already handled** correctly (no change required); two were **false claims** (no vulnerability existed). During verification, an additional **nine** real issues were identified and fixed: IDOR-style product scoping gaps in the admin area, a stored-XSS vector in SVG media uploads, missing contact-form abuse controls, a broken 429 error renderer, information disclosure via the health endpoint, an unsafe search-locale fallback, unauthenticated Redis in the docker stack, and nginx fingerprint/header hardening. Frontend dependency audits surfaced five vulnerabilities (one moderate, four high) in the production dependency tree — all fixed by upgrading `next`, `sharp`, `dompurify`/`isomorphic-dompurify`, and pinning `nanoid`.

Verification status:

| Check | Result |
|---|---|
| PHPUnit (`ys-api`) | OK — 265 tests, 927 assertions |
| Pint (`--test`) | Passed — style clean |
| `composer audit` | 0 advisories |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm audit` (incl. dev) | 0 vulnerabilities |
| `tsc --noEmit` (`ys-web`) | Passed |
| `eslint .` (`ys-web`) | Passed |
| `next build` (`ys-web`) | Passed |

---

## 2. Findings

### 2.1 Claim verification (original review items)

| # | Claim | Verdict | Action |
|---|---|---|---|
| 1 | Token returned in login response body | **CONFIRMED — Critical** | Token removed from body; delivered exclusively via hardened HttpOnly cookie |
| 2 | Logout crashes on null `currentAccessToken()` | **CONFIRMED — High** | Null-safe logout; 401 for unauthenticated; idempotent on repeated logout; cookie cleared in all paths |
| 3 | Login rate limit keyed only by raw IP (enumerable / evadable) | **CONFIRMED — High** | Dual hashed keys `login-ip:sha256(ip)` + `login-email:sha256(email)`; per-email secondary limit; both cleared on success |
| 4 | CORS misconfiguration (wildcard origins) | **FALSE** | `config/cors.php` already restricts origins to `env('FRONTEND_URL')` with `supports_credentials => true`; no change |
| 5 | Auth cookie hardening (SameSite / Domain / CHIPS / Secure) | **CONFIRMED — High** | Cookie now: SameSite=Lax, config-driven domain, Secure in production, `Partitioned` flag (CHIPS) support, HttpOnly |
| 6 | Cookie expiry drift (`abs(diffInMinutes)`) | **CONFIRMED — Medium** | Cookie expires at the real token `expires_at` timestamp; TTL fallback only when null/past |
| 7 | `latestRelease` via `hasMany()->limit(1)` (silent truncation bug) | **CONFIRMED — Medium** | Converted to `hasOne`; resource reads the single relation directly |
| 8 | `me()` missing active-account check | **FALSE — already handled** | `EnsureUserIsActive` middleware (403 `ACCOUNT_DISABLED`) applies to all admin routes; no change |
| 9 | Sanctum token prefix leaks product identity (`ys_admin_`) | **CONFIRMED — Low** | Prefix changed to generic `token_` |
| 10 | `ForceJsonResponse` middleware missing | **FALSE** | Middleware exists; all API responses are JSON; no change |

### 2.2 Additional findings discovered and fixed

| # | Finding | Severity | Fix |
|---|---|---|---|
| 11 | **IDOR / cross-product data exposure** — admin roadmap items, updates, timeline entries, feature flags, and dashboard counts were not scoped to the user's granted products; non-super-admins could read/modify items of products they cannot access | High | All admin controllers now scope `index` to `whereNull('product_id') OR whereIn(granted products)` (global items stay visible) and guard `store/show/update/destroy/publish/unpublish` with null-safe `canAccess*` helpers; dashboard product/release counts scoped via `$user->products()->pluck('products.id')` |
| 12 | **Stored XSS via SVG upload** — SVG files were stored unvalidated; `script`, `foreignObject`, `<use>`, `<image>`, `<a>`, event handlers, `href/src/javascript:` payloads render in the browser under the media CDN origin | High | `MediaUploadService` now sanitizes SVG with `DOMDocument` (`LIBXML_NONET`, no entity substitution); unsafe elements stripped, attribute sweep (`on*`, `href`, `xlink:href`, `src`, `style`, `javascript:`); malformed SVG rejected (`ValidationException`); sanitized content written via `Storage::put` |
| 13 | **Contact form abuse** — no honeypot, no per-email rate limit (only per-IP), no visible confirmation | Medium | Honeypot `website` field (silent success, nothing stored/queued); per-email rate limit (2/hour, 1h window) with check-before-hit ordering; contact requests now nullable return |
| 14 | **429 responses rendered as 500** — `throttle`'s custom `HttpResponseException` fell through to the generic Throwable renderer (`SERVER_ERROR`, empty message) | Medium | Dedicated `HttpResponseException` renderer in `bootstrap/app.php` returns the original response; clients now receive the correct 429 `RATE_LIMIT_EXCEEDED` payload |
| 15 | **Health endpoint fingerprint leak** — `/health` returned app `version` in the public payload | Low | Version removed from the health response (liveness only); regression test added |
| 16 | **Unsafe search-locale fallback** — unsupported locale silently fell back to `english`, masking misconfiguration | Low | Strict whitelist guard: unsupported locale raises `InvalidArgumentException` (fail fast) |
| 17 | **Unauthenticated Redis** — `docker-compose.yml` launched redis without `requirepass`; public port 6379 | High | Redis started with `--requirepass "${REDIS_PASSWORD:?}"` (compose fails fast if unset); authenticated healthcheck; `REDIS_PASSWORD` plumbed to backend, queue worker, scheduler |
| 18 | **nginx fingerprint / headers** — `server_tokens on` (version leak), `X-XSS-Protection: 1` (obsolete, can mislead), missing `X-Permitted-Cross-Domain-Policies` | Low | `server_tokens off;`, `X-XSS-Protection "0"`, `X-Permitted-Cross-Domain-Policies "none"` added; CSP intentionally not set at edge (would stack/AND with upstream CSPs) |
| 19 | **Frontend dependency vulnerabilities** (production): `dompurify ≤3.4.12` (moderate XSS), `nanoid <3.3.18` (high DoS), `next ≤16.3.0-preview.10` via bundled `postcss ≤8.5.22` (high XSS / arbitrary `.map` disclosure) and `sharp <0.35.0` (high libvips CVEs) | High (composite) | Upgraded `next` → 16.3.1 (bundles postcss 8.5.23), `sharp` → 0.35.3, `dompurify` → 3.4.13, `isomorphic-dompurify` → 3.22.0; `nanoid` pinned via `overrides` → 3.3.18; `npm audit fix` for dev-toolchain `brace-expansion`/`js-yaml`. Result: **0 vulnerabilities** |

### 2.3 Deferred / accepted (documented, not changed)

| Item | Rationale |
|---|---|
| Captcha on contact form | Requires external keys (Turnstile/reCAPTCHA); honeypot + per-email/IP limits deployed now, captcha tracked as follow-up |
| User/Role controller listing product access names | Product-name disclosure to super-admins only (endpoint itself is super-admin gated); accepted as Low |
| Build-time `postcss`/`nanoid` nested under Next | Resolved by the Next 16.3.1 upgrade (postcss 8.5.23, nanoid 3.3.18 via override) |
| Docker runtime verification | Containers unavailable in this environment; all compose/nginx changes verified statically |

---

## 3. Changes by file

### Backend — authentication & sessions
- `ys-api/config/security.php` — new `rate_limits` section (`auth_per_email` = `RATE_LIMIT_AUTH_PER_EMAIL`, default 10; `contact_email` = `RATE_LIMIT_CONTACT_EMAIL`, default 2); new `cookies` section (`name`, `domain`, `secure`, `partitioned` — pure `env()` defaults; config files must not call `app()`).
- `ys-api/config/sanctum.php` — `token_prefix` → `'token_'`.
- `ys-api/app/Http/Controllers/Auth/AuthController.php` — login returns only `user` + `expires_at`; auth cookie built as a raw `Symfony\Component\HttpFoundation\Cookie` (SameSite=Lax, HttpOnly, Secure in production, `Partitioned` when `AUTH_COOKIE_PARTITIONED=true`, config domain, real token expiry); logout null-safe, clears cookie (past expiry) on every path; private `authCookie()` helper.
- `ys-api/app/Domains/Auth/Actions/LoginAction.php` — rate-limit keys `login-ip:sha256(ip)` and `login-email:sha256(strtolower(trim(email)))`; hit both on failure, clear both on success; per-email limit enforces `InvalidCredentialsException` (429 `INVALID_CREDENTIALS`).

### Backend — authorization (product scoping)
- `ys-api/app/Http/Controllers/Admin/RoadmapController.php`
- `ys-api/app/Http/Controllers/Admin/UpdateController.php`
- `ys-api/app/Http/Controllers/Admin/TimelineController.php`
- `ys-api/app/Http/Controllers/Admin/FeatureFlagController.php`
- `ys-api/app/Http/Controllers/Admin/DashboardController.php`
- `ys-api/app/Domains/Product/Models/Product.php` — `latestRelease()` is now `HasOne` (`where('is_published', true)` + `orderByDesc('release_date')`).
- `ys-api/app/Http/Resources/Public/ProductDetailResource.php` — reads `latestRelease` single relation.

### Backend — input handling & public surface
- `ys-api/app/Domains/System/Services/MediaUploadService.php` — SVG DOM sanitizer (`UNSAFE_SVG_ELEMENTS`, attribute sweep, `LIBXML_NONET | LIBXML_NOBLANKS | LIBXML_NOERROR`), malformed → `ValidationException`, `Storage::put` of sanitized bytes.
- `ys-api/app/Http/Controllers/Public/ContactController.php` — honeypot `website` field (`sometimes|nullable|string|max:100`; nullable because `TrimStrings` nulls empties); per-email limiter with check-before-hit ordering; silent success on honeypot.
- `ys-api/app/Domains/Operations/Actions/SubmitContactRequestAction.php` — returns `?ContactRequest`; returns `null` on honeypot (nothing stored, nothing queued).
- `ys-api/routes/api.php` — `/health` no longer exposes `version`.
- `ys-api/app/Domains/Search/Drivers/PostgresSearchDriver.php` — strict locale whitelist (`InvalidArgumentException` on unsupported locale).
- `ys-api/bootstrap/app.php` — `HttpResponseException` renderer (returns `$e->getResponse()`); fixes throttle 429 → 500.

### Infrastructure & configuration
- `ys-api/.env.example` — `REDIS_PASSWORD` (blank), `SANCTUM_TOKEN_PREFIX=token_`, `AUTH_COOKIE_NAME/DOMAIN/SECURE/PARTITIONED`, `RATE_LIMIT_AUTH_PER_EMAIL=10`, `RATE_LIMIT_CONTACT_EMAIL=2`, `SESSION_SAME_SITE=lax`.
- `docker-compose.yml` — redis `requirepass` (fail-fast on unset), authenticated healthcheck, `REDIS_PASSWORD` plumbed to backend/queue-worker/scheduler.
- `docker/nginx/nginx.conf` — `server_tokens off;`.
- `docker/nginx/sites/default.conf` — `X-XSS-Protection "0"`, `X-Permitted-Cross-Domain-Policies "none"`; CSP deliberately not set at edge (commented).
- `ys-api/.gitignore` — ignore `/storage/framework/testing/*` (test-upload artifacts).

### Frontend
- `ys-web/package.json` — `next` → `^16.3.1`, `sharp` → `^0.35.3`, `dompurify` → `^3.4.13`, `isomorphic-dompurify` → `^3.22.0`, `overrides.nanoid` → `3.3.18`; `package-lock.json` regenerated.

---

## 4. Verification evidence

### 4.1 Backend test suite (after dependency update)

```
vendor\bin\phpunit
OK (265 tests, 927 assertions)
Time: 00:24.753, Memory: 68.00 MB
```

New/updated tests:
- `tests/Feature/Auth/AuthTest.php` — login body contains no token; cookie attributes (HttpOnly, SameSite, Secure, Partitioned, real expiry via clock-skew simulation); logout idempotency; logout clears cookie; 429 `RATE_LIMIT_EXCEEDED` after 5 failures; per-email limit across rotating `REMOTE_ADDR`; success clears limits.
- `tests/Unit/AuthCookieTest.php` — reflection-based cookie attribute/fallback coverage (5 tests).
- `tests/Feature/Admin/ProductScopedContentTest.php` — roadmap/update/timeline/feature-flag scoping (10 tests).
- `tests/Feature/Admin/MediaUploadSvgSanitizationTest.php` — SVG sanitizer (6 tests: script/foreignObject/use/image/a/on*/href/javascript:/malformed).
- `tests/Feature/Admin/ProductLatestReleaseTest.php` — hasOne latestRelease (3 tests).
- `tests/Feature/Public/ContactTest.php` — honeypot silent success + not stored/queued; per-email 429.
- `tests/Feature/Public/HealthContractTest.php` — no version in payload.
- `tests/Feature/Admin/DashboardTest.php` — scoped product/release counts.

### 4.2 Dependency audits

```
composer audit          → No security vulnerability advisories found.
guzzlehttp/guzzle       → 7.15.2
league/commonmark       → 2.10.0
npm audit --omit=dev    → 0 vulnerabilities
npm audit               → 0 vulnerabilities
next 16.3.1 · sharp 0.35.3 · dompurify 3.4.13 · isomorphic-dompurify 3.22.0 · postcss 8.5.23 · nanoid 3.3.18
```

### 4.3 Frontend build

```
npm run type-check      → passed
npm run lint            → passed
npm run build           → passed (all routes compiled; login flow unaffected — reads only body.success)
```

---

## 5. Deployment checklist (breaking changes)

| Item | Impact |
|---|---|
| `SANCTUM_TOKEN_PREFIX=token_` | **All existing tokens invalid on deploy** — every user must re-login (one-time event). |
| `AUTH_COOKIE_NAME` (default `ys_admin_token`) | New cookie name; token moves from response body to cookie — no frontend change required (login reads only `success`), but API clients that read `access_token` from the body must switch to cookie transport. |
| `REDIS_PASSWORD` | **Required** — `docker-compose` fails fast if unset (`${REDIS_PASSWORD:?}`). |
| `SESSION_SAME_SITE=lax` | Recommended in `.env.example` (was `strict`). |
| `RATE_LIMIT_AUTH_PER_EMAIL=10`, `RATE_LIMIT_CONTACT_EMAIL=2` | New tunable limits (env-gated). |

## 6. Post-deploy verification (curl)

```bash
# Login — token must NOT appear in the JSON body; cookie ys_admin_token must be Set-Cookie'd
curl -si -X POST $API/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"…"}'

# Cookie attributes — expect HttpOnly; Secure (prod); SameSite=lax; Partitioned (if AUTH_COOKIE_PARTITIONED=true)
curl -si -X POST $API/login … | grep -i '^set-cookie'

# Throttle — 5 bad logins → 429 {"code":"RATE_LIMIT_EXCEEDED",…} (not 500)
for i in $(seq 1 6); do curl -si -X POST $API/login -H 'Content-Type: application/json' \
  -d '{"email":"x@x.com","password":"bad"}' -o /dev/null -w "%{http_code}\n"; done

# Health — no "version" key
curl -s $API/health

# Honeypot — filled website field → 200 with {"data":{"id":null}}, nothing queued
curl -si -X POST $API/contact -H 'Content-Type: application/json' \
  -d '{"name":"Bot","email":"b@b.com","message":"hi","website":"http://spam"}' | tail -1

# Redis auth (docker)
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping   # → PONG

# Headers
curl -si https://$HOST/ | grep -iE 'server|x-xss-protection|x-permitted-cross-domain-policies'
```

## 7. Remediation timeline

| Priority | Items | Window |
|---|---|---|
| **Critical** | #1 token in body | 24 h |
| **High** | #2 logout crash, #3 rate limiting, #5 cookie hardening, #11 IDOR scoping, #12 SVG XSS, #17 Redis auth, #19 frontend deps | 48 h |
| **Medium** | #6 expiry drift, #7 hasOne, #13 contact abuse, #14 429 renderer | 72 h |
| **Low** | #9 token prefix, #15 health version, #16 locale guard, #18 nginx headers | 72 h (bundled with above) |

All items closed within window on 2026-08-16. Follow-ups: captcha on contact form (external keys), docker runtime smoke test.