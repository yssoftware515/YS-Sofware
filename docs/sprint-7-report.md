# Sprint 7 Report — Operational Intelligence, Business Control & Data Integrity

**Status:** ✅ **COMPLETE**
**Date:** 2026-08-08
**Sprint goal:** Turn the business-operations core (Sprint 6) into something the owner can actually act on. The dashboard now surfaces what needs attention — overdue engagements, on-hold work, completed projects missing their timestamps, and untouched contact requests — instead of a wall of counts. Money stops traveling as floats anywhere in the API (integrity), the customer identity key can never silently fork (email canonicalization + race-safe conversion), and the services catalog gains a closed, admin-only business classification. Backend, tests, and admin UI all landed in this sprint; the public website surface is untouched.

---

## What was delivered

### 1. Dashboard — operational intelligence + "Needs Attention"

- **`attention` block** added to `GET /admin/dashboard/stats`, each section bounded (≤15 items) and permission-gated like every other number on the endpoint:
  - `projects_overdue` — active engagements whose `expected_completion_date` is **before today** (objective definition, not opinion), with `days_overdue` per item.
  - `projects_on_hold` — engagements parked on hold.
  - `data_integrity.completed_without_completed_at` — completed projects that never got a completion timestamp; each flag is a one-line fix.
  - `new_contact_requests` — untouched requests (status `new`), gated by contact-request access.
- Dashboard UI gained a **Needs Attention** widget (`app/admin/dashboard/page.tsx`): red `Nd late` rows linking straight into the record, amber on-hold rows, integrity flags with "fix →", and an "All clear" state when nothing is flagged. The widget only renders sections the backend allowed (permission mirror).

### 2. Money discipline — decimal strings, per-currency, never floats

- `ProjectController::payload()` no longer casts `quoted_value` to float — the decimal string travels intact (`"48500.00"`, not `48500.0`).
- Dashboard recorded values are now **grouped per currency** — `recorded_project_value_by_currency`, `active_project_value_by_currency`, `completed_project_value_by_currency` (`{ USD: "75000.00" }`). The old `recorded_project_value` float was removed: it summed across currencies unless per-currency version. All sums are formatted decimal strings.
- Frontend displays them with `Intl.NumberFormat` (fallback to `CODE 123,456.78` for unknown codes) via the new `lib/admin/format.ts`; the dashboard labels them "recorded figures — never revenue".

### 3. Permission-gate alignment on the dashboard

- Sprint 6 gated dashboard metrics behind `view_*` only, while every controller accepts `view_*` **or** `manage_*`. A manage-only user saw none of their module's numbers. Fixed: `hasAnyPermission(['view_x','manage_x'])` for customers/projects/contact-requests — the dashboard now matches what the screens themselves permit.

### 4. Services — business classification (admin-only)

- New column `services.service_class` (`custom` | `product` | `subscription`, nullable = unclassified) — the smallest normalized answer to "what are we selling and where": custom/external delivery work vs product-related offerings vs subscription-style services.
- Create/update validation (`Rule::in`), admin list filter `?service_class=`, admin resource exposure only. **The public ServiceResource is untouched — the class never leaves the admin boundary** (tested).
- Admin UI: `ServiceForm` select, Services table badge + filter.

### 5. Contact identity integrity — the email cannot fork

- **Canonicalization at the model layer** (`Customer::setEmailAttribute`): emails are trimmed and lowercased on every write, so `Foo@x.com` and `foo@x.com` can never become two rows.
- Requests (`CreateCustomerRequest`/`UpdateCustomerRequest`): email is canonicalized in `prepareForValidation` before the `unique` rule runs — duplicate variants are rejected as a clean 422, not a DB explode.
- `convertCustomer` race hardening: the pre-check is case-insensitive (`LOWER(email)`), and the create is guarded against the unique-index violation (Postgres `23505`), returning the same friendly 422 if two admins convert the same request at once. Identities never silently fork.

### 6. Housekeeping

- Migration `2026_08_08_000012_business_control_and_integrity` — `service_class` + the operational indexes the new queries and filters use: `customers.type`, `customers.status`, `projects.project_type`, `projects.expected_completion_date`, `contact_requests.customer_id`.
- Removed the duplicated `withCount` chain in `CustomerController::index` (harmless duplicate SQL).

---

## Verification

| Check | Result |
|---|---|
| Backend test suite (PHPUnit) | ✅ **123 tests / 424 assertions — all green** (baseline 108/380; +15 tests / +44 assertions) |
| New/updated test files | ✅ `ServiceClassTest`, `CustomerIdentityTest`, extended `DashboardTest` (per-currency, attention, gate alignment), extended `ContactRequestCustomerTest` (normalization, case-insensitive duplicate), updated `ProjectTest` (money-as-string contract) |
| Pint (code style) | ✅ passed |
| `tsc --noEmit` (ys-web) | ✅ clean |
| `next build` (ys-web) | ✅ compiled + routes generated (public-page prerender fetch warnings are the API not running locally — normal) |
| `eslint` | ⚠️ baseline only — the 16 pre-existing errors/warnings live in files untouched by this sprint (Header, SearchModal, ColorPicker, CookieConsent, GlobalSearch, ProductsSection, PermissionGate, PlatformProvider, etc.); every file this sprint produced or modified is lint-clean |

## Notes for the next sprint

- The elapsed "days overdue" is calendar-day arithmetic on date columns — fine for an operational flag; a business-hours model would belong to a future task layer.
- The attention lists are bounded at 15; a real volume of flagged items would justify a dedicated queue view (still out of scope by design).
- Nestgression: services `category` (free text) and `service_class` (closed enum) coexist — category remains a display grouping, `service_class` is the management classification.
- The eslint baseline errors are a one-line-per-file chore, not a correctness problem; worth a dedicated cleanup sprint.