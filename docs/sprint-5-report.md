# Sprint 5 Report — Corporate Platform Operations, Content Governance & Production Readiness

**Status:** ✅ **COMPLETE**
**Date:** 2026-08-08
**Sprint goal:** Make the corporate platform operationally honest and production-ready — fix real frontend/backend authorization mismatches, remove fabricated admin metrics, protect media from accidental deletion, and tighten SEO/privacy for the admin area. No new features; all changes are corrective or hardening work.

---

## What was delivered

### 1. Authorization — frontend navigation permission mismatches (Phase B)

Audit result: **the backend authorization layer is thorough** — every admin controller entry point calls `$this->authorize(...)`, gates are fail-closed, and the `Permission` enum is a closed canonical list. The defects were on the **frontend** in `ys-web/modules/core/navigation.ts`, which registered permission keys that don't exist in the backend, making navigation items invisible (or visible without access) for non-super admins:

| Nav item | Old (broken) key | Backend actually requires | Fix |
|---|---|---|---|
| `/admin/docs` | `manage_docs` | `manage_documentation` | ✅ |
| `/admin/timeline` | `manage_timeline` | `manage_settings` | ✅ |
| `/admin/roles` | `manage_roles` | `manage_admins` (mutations) / `manage_users` (index) | ✅ via `manage_admins` |
| `/admin/feature-flags` | `manage_feature_flags` | `manage_settings` | ✅ |
| `/admin/settings` | *(none — shown to everyone)* | `manage_settings` | ✅ added |

Verified against the gate definitions in `AuthServiceProvider`, role requests, and each controller's `authorize()` call. The roles UI's permission catalog (`modules/core/permissions.ts`) was already correct and unchanged.

### 2. Honest admin dashboard — no fabricated metrics (C)

**Removed fabricated data:**
- Stat cards fell back to `?? 0` when the underlying fetch failed — a failed request displayed a **fake zero**. Now the dashboard is driven by one real endpoint and renders `—` whenever data is missing or not permitted.
- "All systems operational" was **hardcoded** — the green dot never checked anything. It now renders the live result of the new health probe (green = all checks ok, amber = degraded with check details, gray = probe unavailable).

**New backend endpoint:** `GET /api/v1/admin/dashboard/stats` (`DashboardController@stats`):
- Real counts **gated by the same permission as the management screen** (e.g. `manage_products`, `manage_contact_requests`, `view_audit_logs`) — a user without access receives neither counts nor keys, never a guess.
- `recent_contact_requests` (5) and `recent_audit_logs` (6) — each omitted entirely when unpermitted.
- `health` — a live DB + cache probe checked at request time (same logic as the public `/health` endpoint).

Why this matters: the previous page fired **10 parallel list-fetch calls** (`Promise.allSettled`) just to count rows. The dashboard is now a single fetch with server-side permission filtering.

### 3. Media deletion protection (Phase C)

**Before:** `MediaController::destroy` deleted a file even when it was assigned as a product cover, product logo, service cover, static-page cover, or product gallery image — the FK would silently null those columns, leaving broken pages.

**After:** the deletion guard counts live references in `products.cover_image_id` / `products.logo_image_id`, `services.cover_image_id`, `static_pages.cover_media_id`, and `product_media.media_id`. Any reference → `422` with a per-type reference count and a clear message ("Unassign it from the referenced items first"), and the file is left untouched.

### 4. Admin SEO/privacy — noindex (Phase D)

`/admin/*` pages are client components with no metadata, so they were **indexable by default**. Fixes:
- `app/admin/layout.tsx` is now a **server component** exporting `metadata.robots = { index: false, follow: false }`; the old client shell moved unchanged into `app/admin/admin-shell.tsx`. All `/admin/*` routes (including login) now emit `<meta name="robots" content="noindex, nofollow">`.
- Added a second layer: `app/robots.ts` already disallowed `/admin` — now both protections exist.
- Verified `app/sitemap.ts`: no admin routes, both locales, per-entry `alternates.languages` with x-default — no changes needed.
- Verified product detail pages already ship **real-data** `SoftwareApplication` JSON-LD (no prices, ratings, or offers invented — only status/stock semantics).
- Added factual `Organization` JSON-LD (name, url, logo) to the homepage only — no invented claims, social links, dates, or contacts.

### 5. Out of scope (explicitly confirmed)

No CRM, no AI assistant, no lead scoring, no questionnaire engine, no form builder, no billing changes, no features added. Nothing was renamed or restructured outside the changed files.

---

## Verification

| Check | Result |
|---|---|
| Backend test suite (PHPUnit) | ✅ **80 tests / 246 assertions — all green** (baseline was 71/189, +9 tests / +57 assertions) |
| `tsc --noEmit` (ys-web) | ✅ clean |
| ESLint on all touched files | ✅ 0 errors (all prior filter warnings baseline) |
| `next build` | ✅ success — full route table generated, incl. `/robots.txt` + `/sitemap.xml` prerendered |
| Live probe of `dashboard.stats` | ✅ 401 unauthenticated → 200 super admin with counts/health → scoped omissions verified by tests |

---

## Files changed

**Backend (`ys-api/`):**
- `app/Http/Controllers/Admin/DashboardController.php` *(new)* — stats endpoint
- `app/Http/Controllers/Admin/MediaController.php` — deletion guard
- `app/Domains/System/Models/AuditLog.php` — added `HasFactory` (test-only need)
- `routes/api.php` — `admin.dashboard.stats` route + import
- `database/factories/FaqFactory.php`, `StaticPageFactory.php`, `AuditLogFactory.php` *(new)*
- `tests/Feature/Admin/DashboardTest.php`, `tests/Feature/Admin/MediaTest.php` *(new)*

**Frontend (`ys-web/`):**
- `modules/core/navigation.ts` — 5 permission corrections
- `modules/core/widgets.ts` — removed obsolete `apiPath` fields (dashboard no longer re-fetches lists)
- `app/admin/dashboard/page.tsx` — rewritten around the stats endpoint; no fake numbers, live health, recent inquiries/activity
- `app/admin/layout.tsx` *(server)* + `app/admin/admin-shell.tsx` *(new, client shell)* — noindex metadata
- `app/[locale]/(public)/page.tsx` — Organization JSON-LD

---

## Problems & notes

- `RoleController` gates its index with `manage_users` and mutations/sho-page with `manage_admins`; the nav now uses `manage_admins`. An admin holding *only* `manage_users` (without `manage_admins`) would no longer see the "Roles & Permissions" item — an intentional trade-off, since role mutation is the actual point of that screen and `manage_admins` grants are always accompanied by it in the seeders.
- `AuditLog` is immutable-by-design; its factory correctly relies on `create()` (a new-row insert), which is the only path that doesn't throw.
- Dashboard "System Status" links to the public `/status` page, which is itself driven by the real `/api/v1/health` probe — the link and the dot now tell the same true story.
- Known nuance (pre-existing, recorded): the admin contact-requests list returns full message bodies per row — heavier payload, not touched in this sprint.

---

## Security & trust (re-checked)

- Every admin entry point audited: all `authorize()` **before** any query runs.
- The stats endpoint **never reveals aggregate counts for modules the caller cannot manage** — scoped-admin verified by tests.
- Media deletion is now fail-closed: referenced files cannot be deleted or lost accidentally.
- Admin page noindex is emitted server-side (layout metadata) and in `robots.txt` — two independent layers.
- No URLs, phone numbers, or contact details were hardcoded anywhere in the SEO additions.

---

## Scope confirmation

Everything in this sprint was requested within the corporate operations & production readiness brief. No user-facing features were added; every change makes existing screens report true data (metrics, health) or behave safely (media, SEO). The report is complete — no outstanding work items from Phase A auditing remain unaddressed.