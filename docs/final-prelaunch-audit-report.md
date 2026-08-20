# Final Pre-Launch Audit Report

Status: **ENGINEERING COMPLETE** — no P0/P1/P2 blockers remain.

This report is the consolidated outcome of the final pre-launch audit
(security + contract verification) and the Final Engineering Gate (K-30).

## Audit scope

Verified end-to-end across `ys-api` (Laravel 12 + Sanctum + PostgreSQL)
and `ys-web` (Next.js 16 App Router, admin panel + public site):

- Authentication & session lifecycle (LoginAction, AuthController,
  CookieToBearer, EnsureUserIsActive, Sanctum expiry enforcement,
  single-session revocation, rate-limited brute-force protection)
- Authorization (Gate registry, Role/Permission enum, product scoping —
  `User::canAccessProduct` with fail-closed semantics for scoped admins)
- Audit (AuditService + RLS at the DB layer, immutable logs)
- Upload security (server-side MIME allow-list, blocked extensions,
  UUID filenames, improper-file rejection via `UploadedFile::isValid()`)
- XSS (sanitize-at-write via `HtmlSanitizerService`/Purifier `cms`
  profile for every rich-text field; everything else renders as plain
  text in the frontend)
- Public API leakage (published-only scopes, product-scoped doc trees,
  public SettingResource whitelist)
- Business flows (contact request → customer → project → tasks →
  milestones lifecycle; delivery summary; subscription management)
- Frontend/backend contract (every admin page's API calls verified
  against real routes; fabricated/demo UI removed)

## P0 — bootstrap admin credential (S-01 regression)

Regression discovered: `AdminUserSeeder` had the committed plaintext
credential `YS515&Yahya` back in source.

**Fix:**
- `ys-api/database/seeders/AdminUserSeeder.php` — env-driven via
  `config/admin.php` (`ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`);
  fails closed (blank password ⇒ seeder skips, no admin created)
- Regression pins:
  - `tests/Unit/AdminSeederContractTest.php` — config contract + no
    credential literal in source
  - `tests/Feature/Admin/AdminUserSeederTest.php` — fail-closed,
    env-created, idempotent, real login flow (4 tests)
- Living docs de-credentialed (README/SETUP, database.md,
  roles-permissions.md, known-issues.md K-11)

## P1 — dead / demo admin UI removed

- `app/admin/api-tokens/` — hardcoded `DEMO_TOKENS` displayed as real
  data; POST to a non-existent endpoint → removed
- `app/admin/sessions/`, `app/admin/login-history/`,
  `app/admin/notifications/` — called endpoints that do not exist →
  removed
- `lib/admin/navigation.ts` — legacy duplicate of the real nav
  (`modules/core/navigation.ts`) → removed (K-29 resolved)

## P2 — hardening

- `MediaUploadService` rejects files that failed to receive
  (`UploadedFile::isValid()`) → `tests/Unit/MediaUploadServiceTest.php`
- Search rate limit is now env-configurable (`RATE_LIMIT_SEARCH`,
  `config/security.rate_limits.search`) — S-14 resolved
  (pinned by `tests/Unit/OpsContractsTest.php`)
- Hardcoded personal email removed from seeded legal pages

## Final Engineering Gate — K-30

### Issue

`RoleController@index` reads roles with `manage_users` (needed for the
Users panel's role-assignment dropdowns), but role mutations require
`manage_admins`. The admin navigation exposed the Roles & Permissions
page only to `manage_admins` holders — inconsistent with the backend
read path.

### Fix (smallest safe change — no permission-model changes)

- `ys-web/modules/core/navigation.ts`: `/admin/roles` nav permission
  `manage_admins` → `manage_users` (the backend's actual read gate)
- `ys-web/app/admin/roles/page.tsx`: page follows the backend boundary
  exactly — readers (`manage_users`) see a read-only view; "New Role",
  "Save" and "Delete" controls render only for `manage_admins` holders
- Backend authorization untouched: every mutation keeps its
  `manage_admins` guard (RoleController + Create/UpdateRoleRequest)

### Tests added

`tests/Feature/Admin/RoleAccessTest.php` (6 tests, 19 assertions):

1. `manage_users`-only user can read roles (200)
2. `manage_users`-only user cannot create/update/delete roles (403)
3. `manage_users`-only user cannot self-escalate to `manage_admins`
4. `manage_admins` user retains full functionality (create/update/delete)
5. Authenticated user without either permission is blocked (403)
6. Unauthenticated user is rejected (401)

### Final verification results

| Check | Command | Result |
|---|---|---|
| Backend tests | `vendor/bin/phpunit` | **226 passed (807 assertions) — OK** |
| PHP code style | `vendor/bin/pint --test` | passed |
| Frontend types | `npm run type-check` | 0 errors |
| Frontend lint | `npm run lint` | 0 errors |
| Frontend build | `npm run build` | succeeded |

### Remaining runtime limitation

**Docker is unavailable in the current workspace** — container-level
deploy verification (compose build/up, ingress, healthchecks) remains
intentionally deferred and must be executed at deployment time.

## Statement

**No P0/P1/P2 engineering blockers remain.** All findings from the final
pre-launch audit — including the bootstrap-credential regression, the
dead/fake admin pages, the K-30 authorization/navigation mismatch, and
the hardcoded value cleanups — are resolved with regression tests.
The only remaining work is optional visual/design polish and actual
deployment/runtime verification in a Docker-enabled environment.

**ENGINEERING STATUS: COMPLETE**