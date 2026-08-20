# Sprint 6 Report — Business Operations Foundation: Customers, Projects & Commercial Records

**Status:** ✅ **COMPLETE**
**Date:** 2026-08-08
**Sprint goal:** Give the platform a real internal business-operations core — extend customers into a working directory (type, WhatsApp, archive lifecycle), add the projects table as the operational record of delivered work (scope, schedule, services involved, recorded commercial value), and wire contact requests to customers with explicit admin-driven linking (never automatic email-based merging). Backend, tests, and admin UI all landed in this sprint.

---

## What was delivered

### 1. Customers — from "subscription holder" to a real directory (Billing domain)

- **Extended the existing generic `customers` table** (no new entity, no duplication): `type` (`individual` | `company`), `whatsapp`, `status` (`active` | `archived`) via migration `2026_08_08_000008_add_business_fields_to_customers_table`.
- `Customer` model: constants for types/statuses, `projects()` + `contactRequests()` relations, scopes `active()` / `archived()`.
- `CustomerController` fully re-authored: business gates (`view_customers`/`manage_customers`), search (name/email/company), type + status filters, `PATCH /customers/{id}/status` for the archive lifecycle (audited), deletion guarded — **a customer with projects or subscriptions cannot be deleted** (422, like the subscription guard).
- `CreateCustomerRequest` / `UpdateCustomerRequest` re-authored with the new fields; `CustomerResource` expanded (`type`, `whatsapp`, `status`, `projects_count`, `creator`).
- Dashboard now counts `customers` and `active_customers` (both gated by `view_customers`).

### 2. Projects — the operational record of delivered work (Operations domain, new)

- New `projects` table (`2026_08_08_000010_create_projects_table`): `customer_id`, `name`, `project_type`, `description`, `status` (`draft | active | on_hold | completed | cancelled`), `start_date`, `expected_completion_date`, `completed_at`, `quoted_value` + `currency`, `internal_notes`, `created_by`.
- New `project_service` pivot (`2026_08_08_000011_create_project_service_table`) — a project draws on existing service lines.
- `Project` model: constants, `customer()`, `services()`, `creator()`, `isCompleted()`.
- `ProjectController` (new): full CRUD + `PATCH /projects/{id}/status` (auto-sets `completed_at`), service sync on create/update (replaces, validated against existing services, max 20), every mutation audited (`project.created/updated/status_updated/deleted`).
- Filters: search, status, project_type, customer_id. **Projects are gated behind `view_projects`/`manage_projects` — invisible to anyone without that permission, including the counts.**
- **Design decision honored:** projects are deliberately *not* a task manager, a product, or a contact request. `quoted_value` is an operational record for business review, not accounting-grade (no invoices/costs/profit).

### 3. Contact requests ↔ customers — explicit admin linking

- Migration `2026_08_08_000009_add_customer_id_to_contact_requests_table` + `customer()` relation.
- Three new endpoints (all require **both** `manage_contact_requests` **and** `manage_customers`):
  - `POST /contact-requests/{id}/link-customer` — link to an existing customer (explicit, never automatic).
  - `POST /contact-requests/{id}/convert-customer` — create a customer from the request's data and link it; **fails with 422 if the email already belongs to a customer** so identities never silently fork.
  - `DELETE /contact-requests/{id}/customer` — unlink (the customer record is never touched).
- Every action audited (`contact_request.customer_linked/converted/unlinked`); `handled_by`/`handled_at` set on the request row. The request row is always preserved as history.

### 4. Permissions & roles

- 4 new permission cases in the `Permission` enum + fail-closed gates in `AuthServiceProvider`: `view_customers`, `manage_customers`, `view_projects`, `manage_projects` (each `view_*` also grants the `manage_*` sibling, mirroring the existing pattern).
- `RoleSeeder`: admin role receives all 4; support role receives `view_customers` + `manage_customers` (project read/write stays admin-only by default).
- Frontend registries kept in sync: `modules/core/permissions.ts` gained Customers + Projects groups; the Roles screen can now grant the new permissions.

### 5. Admin UI (ys-web)

- **Customers** — list upgraded (type + status badges, search/type/status filters, live subscription & project counts linking to filtered lists), `CustomerForm` extended (type select, WhatsApp, status select on edit).
- **Projects** — full new section: list (search/status/type filters, customer link, value formatting), create/edit form (customer picker, project type, schedule dates, quoted value + currency, internal notes, service multi-select), delete with confirm.
- **Contact requests** — list gains a Customer column ("View customer →" / "Not linked"); detail page gains a Customer card with **Convert to Customer**, **Link to existing** (searchable picker), and **Unlink** actions, gated by `manage_customers`; status buttons disabled while linking is in flight.
- **Navigation** — new Business group (Customers, Projects) with `view_customers`/`view_projects`; Customers moved out of the Billing group (which now holds only Subscriptions).
- **Dashboard** — Customers and Projects stat widgets with `view_customers`/`view_projects` gates.

---

## Verification

| Check | Result |
|---|---|
| Backend test suite (PHPUnit) | ✅ **108 tests / 380 assertions — all green** (baseline 80/246; +28 tests / +134 assertions) |
| New test files | ✅ `CustomerOperationsTest`, `ProjectTest`, `ContactRequestCustomerTest`, extended `DashboardTest` |
| Permission coverage | ✅ view/manage gates tested for both directions (view-only 403 on mutations, manage-gated counts) |
| `tsc --noEmit` (ys-web) | ✅ clean |
| ESLint | ✅ 0 errors in all touched files (pre-existing warnings elsewhere unchanged) |
| `next build` | ✅ success — `/admin/projects`, `/admin/projects/new`, `/admin/projects/[id]` in route table |
| Laravel Pint | ✅ applied, suite re-verified green after formatting |

---

## Files changed

**Backend (`ys-api/`):**
- `database/migrations/2026_08_08_000008_add_business_fields_to_customers_table.php`, `..._000009_add_customer_id_to_contact_requests_table.php`, `..._000010_create_projects_table.php`, `..._000011_create_project_service_table.php` *(new)* — all applied to the dev DB
- `app/Domains/Auth/Enums/Permission.php` (+4), `app/Providers/AuthServiceProvider.php` (+4 gates), `database/seeders/RoleSeeder.php`
- `app/Domains/Billing/Models/Customer.php`, `app/Domains/Operations/Models/Project.php` *(new)*, `app/Domains/Operations/Models/ContactRequest.php`
- `app/Http/Controllers/Admin/CustomerController.php` (re-authored), `ProjectController.php` *(new)*, `ContactRequestController.php` (+link/convert/unlink), `DashboardController.php` (+customer/project counts)
- `app/Http/Requests/Admin/Billing/CreateCustomerRequest.php`, `UpdateCustomerRequest.php`, `app/Http/Resources/Admin/CustomerResource.php`, `routes/api.php`
- `database/factories/CustomerFactory.php` (re-authored), `ProjectFactory.php` *(new)*
- `tests/Feature/Admin/CustomerOperationsTest.php`, `ProjectTest.php`, `ContactRequestCustomerTest.php` *(new)*, `DashboardTest.php` (extended)

**Frontend (`ys-web/`):**
- `app/admin/projects/page.tsx`, `app/admin/projects/new/page.tsx`, `app/admin/projects/[id]/page.tsx` *(new)*, `components/admin/ProjectForm.tsx` *(new)*
- `app/admin/customers/page.tsx` (rewritten), `components/admin/CustomerForm.tsx` (extended)
- `app/admin/contact-requests/page.tsx`, `app/admin/contact-requests/[id]/page.tsx` (linking UI)
- `modules/core/navigation.ts` (Business group), `modules/core/permissions.ts` (+2 groups), `modules/core/widgets.ts` (+2 widgets), `app/admin/dashboard/page.tsx` (+2 count keys)

---

## Problems & notes

- **Mass-assignment trap caught by tests:** `service_ids` isn't a Project column — first test run threw on `create()`/`update()`. Fixed with `Arr::except($validated, ['service_ids'])` before the model call; the sync handles the pivot. The tests are what surfaced it, not manual clicking.
- **PHP float JSON nuance:** `json_encode((float) 75000.0)` emits `75000` (no `.0`), so JSON-decoded values arrive as integers — test expectations for `recorded_project_value`/`quoted_value` assert integers, not floats.
- **Customer `status` in API responses:** the DB default only applies on insert, so the in-memory model had no `status` attribute after `create()`; the controller now sets `status => active` explicitly when not provided (also keeps the API contract deterministic).
- **Audit rows:** `logModelChange` snapshots `getDirty()` — a fresh `create()` yields no dirty diff, so created-rows carry `new_values = null`; the action name alone distinguishes them. Tests assert action + resource.
- **Contact-request index payload** still returns full message bodies per row (pre-existing note from Sprint 5) — untouched, listed in `technical-debt.md` context.
- Link picker loads the first 100 customers — adequate for current scale; a proper searchable combobox is future work if the directory grows.

---

## Security & trust

- All four new endpoints authorize **before** any query runs; contact linking requires two distinct permissions.
- Conversion is collision-safe: an existing email returns 422 and the admin must link instead — no silent duplicate identities.
- Customer deletion is fail-closed: referenced customers (projects or subscriptions) cannot be removed; audit rows record every create/update/status change/link/convert/unlink.
- Project commercial values are visible only to `view_projects`/`manage_projects` holders; dashboard counts obey the same gates.

---

## Scope confirmation

Everything in this sprint came from the Business Operations Foundation brief (customers, projects, commercial records, request-to-customer linking). Explicitly **not** built (by design): CRM pipeline/lead scoring, task management, invoices/accounting, automatic email-based dedup. No public-facing changes were made — customers and projects are admin-internal entities, verified by the existing "never exposed through public API" test.
