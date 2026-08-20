# Security

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown
**Scope:** report only. Nothing was changed.

---

## Executive summary

The platform has a strong baseline: defense-in-depth headers, rate limiting, sanitization at write and render, fail-closed authorization, immutable audit logs, server-side MIME detection, and Argon2id. The main concerns are: a **hardcoded default admin password in source code**, **several frontend pages calling non-existent APIs** (degraded UX, not privilege escalation), **no MFA/password-reset**, **no brute-force IP ban beyond login rate limit**, and **a CI health-check against non-existent endpoints**.

---

## Findings by severity

### CRITICAL

| ID | Finding | Evidence | Fix direction (report only) |
|---|---|---|---|
| S-01 | **Hardcoded admin credentials in source** — `AdminUserSeeder.php` creates `admin@ys-systems.com` with plaintext password `YS515&Yahya` committed to the repo. Any actor with repo access knows the default admin password. README/SETUP.md claim a different password, making detection harder. | ✅ seeder source | Move to env-based seed, rotate immediately, document rotation | + RESOLVED Sprint 1 (`config/admin.php` + `AdminUserSeeder` reads `ADMIN_EMAIL`/`ADMIN_PASSWORD`; fails closed when blank) |
| S-02 | **Secrets in `.env` files are git-ignored but `.env` exists with real local values** (4037 bytes, not tracked — ✅ verified `git check-ignore`). Risk is low locally but must never be committed. | ✅ git check-ignore | Keep ignored; verify CI doesn't publish |

### HIGH

| ID | Finding | Evidence |
|---|---|---|
| S-03 | **Frontend fetches non-existent admin endpoints** (`/admin/sessions`, `/admin/login-history`, `/admin/api-tokens`, `/admin/notifications`, dashboard `/admin/faq`, `/admin/homepage`) → 404. Not a security hole, but a broken-integration risk: if any of these were once real (or get implemented inconsistently), authorization could be bypassed through a different path. | ✅ grep frontend + route:list |
| S-04 | **No password-reset mechanism** (columns exist: `password_reset_token`, `password_reset_expires_at` — no endpoints/UI). Admin accounts locked out on forgotten passwords; operational risk. | ✅ routes + User model |
| S-05 | **No MFA/2FA** despite "MFA-ready infrastructure" in old docs. Admin panel is protected only by password + token. | ✅ no code found |

### MEDIUM

| ID | Finding | Evidence |
|---|---|---|
| S-06 | **Default Grafana admin password** `GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}` (compose) and `GRAFANA_PASSWORD=admin` in root `.env.example`. Production profile exposes Grafana on 3001. | ✅ docker-compose.yml |
| S-07 | **Default DB credentials** `ys_user/secret` in compose + `.env.example`; Postgres port published to host. | ✅ |
| S-08 | **Sanctum `expiration: null`** — server never expires tokens; "8h TTL" is only issuance-time (`expires_at` field + cookie). Tokens remain valid until revoked (logout/disable). Session-invalid-after-expiry is not enforced server-side. | ✅ config/sanctum.php | + RESOLVED Sprint 1 (`EnsureUserIsActive` now checks `expires_at` per request, revokes expired tokens, 401 TOKEN_EXPIRED) |
| S-09 | **`middleware.ts` guards admin pages by cookie presence only** — an expired/revoked token still enters the page shell; API 401s are handled client-side. No redirect-on-401 logic verified in layout. | ✅ middleware.ts |
| S-10 | **Admin login password rule (min:8) is weaker than user-creation rule (min:12)** — inconsistent policy; also no complexity requirement, no breach-password check, no account lockout (only 5/min rate limit per IP; a distributed attack is not throttled per-account). | ✅ LoginRequest vs UserController |
| S-11 | **HTML sanitization coverage is partial**: Purifier `cms` profile applies to product long_desc and doc article content only. FAQs, static pages, updates, careers, homepage-section JSON, menus are NOT sanitized server-side — but ✅ frontend renders those as plain text (no dangerouslySetInnerHTML), so current exploitability is low. If any of them ever switch to rich-HTML rendering, sanitization must be added. | ✅ grep call sites + frontend rendering |
| S-12 | **No CSRF token verification** on cookie-authenticated admin requests (Sanctum `statefulApi()` + `/sanctum/csrf-cookie` registered but frontend never calls it). Mitigated by `SameSite=strict`. | ✅ code |
| S-13 | **`X-XSS-Protection: 0`** — intentional (CSP replaces legacy header; documented in middleware comments), flag for reviewers. | ✅ SecurityHeaders.php |

### LOW

| ID | Finding | Evidence |
|---|---|---|
| S-14 | Rate-limit `search` (60/min) hardcoded in `AppServiceProvider` (not env-configurable unlike others). | ✅ | + RESOLVED: now `config('security.rate_limits.search')` / `RATE_LIMIT_SEARCH` (documented in `ys-api/.env.example`; pinned by `tests/Unit/OpsContractsTest.php`); service also rejects files that failed to receive (`UploadedFile::isValid()`) |
| S-15 | Root `.env.example` ships `DB_PASSWORD=secret`, `GRAFANA_PASSWORD=admin`, `MAIL_USERNAME=` empty — fine as template but easy to promote to prod. | ✅ | + RESOLVED Sprint 1 (root `.env.example` blanks all secrets; compose fails fast on missing `DB_PASSWORD`) |
| S-16 | Nginx lacks CSP (relies on app layers) and has no explicit `ssl_protocols`/security tuning for the 443 listener (no SSL config provided at all — TLS terminates elsewhere). | ✅ default.conf |
| S-17 | `robots.txt` in backend public dir + `sitemap.ts` — fine; admin disallowed in `robots.ts`. | ✅ |
| S-18 | Old docs claim "SecretsManager with Environment/Docker/Vault providers" — the vault/docker providers exist only as **type literals** in frontend `lib/platform/secrets/types.ts`; no real provider implementations verified. Overstating security posture is a risk. | ✅ |
| S-19 | Login response includes token in JSON body (`data.token`) — also set as HttpOnly cookie. Token-in-body increases exposure (logs/proxies) though it enables non-browser clients. | ✅ AuthController |
| S-20 | `view_admin_activity`, `view_financials` permissions defined but unused — dead permission strings can mislead role design. | ✅ grep |
| S-21 | **Storage disk not "private"**: default disk `local` (`storage/app/private`, `serve => true`) serves files unauthenticated via `GET /storage/{path}`; signed PUT route exists (needs valid signature + `upload=1`). APP_KEY exposure would allow arbitrary disk writes. | ✅ verified (see Upload risks above) | + RESOLVED Sprint 1 (`config/filesystems.php` published; `local` private serve=false, `public` disk serve opt-in via env) |
| S-22 | **Product-scope gap**: `canAccessProduct` is enforced only in Product/Release/Documentation controllers. Roadmap, Updates, and Timeline controllers accept `product_id` without scope checks — an admin with `manage_roadmap` but no access to a product can still attach items to it. | ✅ grep (no canAccessProduct in those controllers) | + RESOLVED Sprint 1 (`canAccessProduct` enforced on store/update/show/publish/unpublish/destroy in Roadmap/Update/Timeline) |

### POTENTIAL RISKS (⚠️ inferred / ❓ unknown)

| Risk | Status |
|---|---|
| CSP in `next.config.ts` includes `'unsafe-inline'` for scripts (dev only adds unsafe-eval; inline always allowed) — needed for inline scripts; reduces XSS protection strength. | ⚠️ verified string; impact assessed |
| No `Sec-Fetch-*`/CORS hardening beyond allow-list; CORS allows `allowed_headers: ['*']`, `methods: ['*']`. | ✅ config/cors.php |
| `ForceJsonResponse` + debug info: in non-production, exception messages leak to clients (message field). | ✅ bootstrap/app.php (guarded by `app()->environment('production')` — OK in prod) |
| Admin user emails/passwords handled in `SendAdminUserCreatedJob` (plaintext password in welcome email) — operational exposure of initial password via email. | ✅ job exists (⚠️ email template includes plaintext password) |
| Whether the production server enforces HTTPS end-to-end (HSTS header present from app/nginx). | ❓ unknown |

---

## Authentication weaknesses (summary)

1. No MFA, no email verification, no password reset, no per-account lockout, no breach-password checks (S-04, S-05, S-10).
2. Token TTL is issuance-time only (S-08).
3. Cookie is HttpOnly + SameSite=strict + Secure-in-prod ✅ good; but admin cookie path `/` also sent to public pages (harmless — backend only accepts it on API; public API ignores auth) ⚠️.

## Authorization weaknesses (summary)

1. `view_admin_activity`, `view_financials` unused — dead permissions may confuse role design (S-20 low).
2. No guard found preventing deletion of the last super admin, or a user removing their own `manage_users`/role while active (❓ unverified — needs code-level audit of `UserController@destroy`, `RoleController`).
3. Product scoping enforced only on products/releases/docs — other product-optional resources (roadmap, updates, timeline) accept `product_id` without scope checks (⚠️ verified: no canAccessProduct calls in Roadmap/Update/Timeline controllers). ❗ This is a real **access-control gap**: an admin with `manage_roadmap` but no product access can still create roadmap items for any product.

## Validation problems (summary)

- Inline `validate()` in several controllers vs FormRequests in others — mixed style (see technical-debt).
- Password rule mismatch between login (min:8) and user creation (min:12).
- `seo_meta`, `changelog`, `requirements`/`responsibilities` arrays validated loosely (array shapes not strictly enforced server-side).

## Upload risks (summary)

- ✅ Server-side MIME sniffing, extension block-list, double-extension guard, UUID filenames, 10MB cap, `image/*`+pdf allow-list.
- ✅ SVG was allowed (`image/svg+xml`) but is now REMOVED from the allow-list and `svg`/`svgz` added to blocked extensions (Sprint 1) — closes the stored-XSS surface (ME-07).
- ⚠️ **Storage routes (verified in depth):** Laravel 12's local file serving is enabled — `config/filesystems.php` is **not published** in the app, so framework defaults apply: default disk `local` → root `storage/app/private`, `serve => true`, which auto-registers `GET storage/{path}` and `PUT storage/{path}` (✅ verified: route:list + `vendor/laravel/framework/config/filesystems.php` + `FilesystemServiceProvider` closure in `bootstrap/cache/routes-v7.php`).
  - `GET storage/{path}` — **unauthenticated public read** of anything under `storage/app/private`. Media uploads land here (`MediaUploadService` → default disk, directory `media`), so uploaded files are publicly readable — consistent with public product covers, but it means the "private" disk is not private. Anything else placed on the default disk becomes public.
  - `PUT storage/{path}` — protected by `ReceiveFile`: requires `upload=1` **and** a valid signed URL (`hasValidRelativeSignature`); invalid signatures return 404 in production. ❗ **Not directly exploitable** (signed URL requires `APP_KEY`), but it is an open signed-upload surface — anyone with `APP_KEY` knowledge (e.g., leaked key) could write arbitrary files to the disk. Treat `APP_KEY` as critically sensitive.

## Sensitive data exposure (summary)

- `.env` gitignored ✅; `.env.local` (frontend) contains only localhost values, no secrets ✅.
- `AdminUserSeeder` plaintext password in repo (S-01).
- Token returned in login JSON body (S-19).
- Audit logs store old/new values (incl. potentially sensitive diffs) — access limited to `view_audit_logs`; RLS prevents tampering ✅.
- API error messages leak internal messages in non-production (guarded in prod) ✅/⚠️.

## OWASP mapping

| OWASP Top 10 (2021) | Status |
|---|---|
| A01 Broken Access Control | ⚠️ Product-scope gap on roadmap/updates/timeline (S-22); dead permissions; middleware presence-only |
| A02 Cryptographic Failures | ✅ Argon2id; TLS assumed at proxy (❓); token TTL issuance-only |
| A03 Injection | ✅ Postgres FTS uses websearch_to_tsquery (parameterized); Eloquent parameterized; Purifier for HTML; no raw SQL beyond migrations |
| A04 Insecure Design | ⚠️ No MFA/rate-limit-per-account; no reset flow |
| A05 Security Misconfiguration | ⚠️ Grafana/DB default creds; CORS `*` headers/methods; CSP unsafe-inline |
| A06 Vulnerable Components | ⚠️ Trivy scan in CI (HIGH/CRITICAL only); npm audit `|| true` (fail-open); no composer audit in CI |
| A07 Auth Failures | ⚠️ token expiry not enforced server-side; no lockout |
| A08 Software/Data Integrity | ⚠️ No signed releases/artifacts beyond GHCR; no SBOM |
| A09 Logging & Monitoring | ⚠️ Audit logs rich; no alerting integration; Grafana unprovisioned |
| A10 SSRF | ✅ no external URL fetching in backend (IndexNow is frontend-side) |
