# Roles & Permissions

**Verification:** ✅ verified from `RoleSeeder.php`, `Permission.php`, `AuthServiceProvider.php`, and every `authorize()` call in controllers (2026-11-10, after Group H).

---

## 1. Canonical permission catalog (✅ `Permission` enum)

The `Permission` enum is the closed list of every permission string the system recognizes (12 values). Product/subscription/content/feature-flag permissions were removed with their domains in Groups A–F/H.

| Permission string | Used by |
|---|---|
| `manage_contact_requests` | contact-requests (list/show/status/link/convert) |
| `manage_settings` | settings |
| `view_audit_logs` | audit-logs, ops/failed-jobs |
| `manage_users` | users CRUD, roles index |
| `manage_admins` | roles create/update/delete |
| `view_financials` | dashboard value-by-currency, customer value-by-currency, project `quoted_value`/`currency` |
| `view_services` | services read |
| `manage_services` | services create/update/delete |
| `view_customers` | customers index/show, dashboard counts |
| `manage_customers` | customers create/update/status/delete, contact-request link/convert/unlink |
| `view_projects` | projects/tasks/milestones read, dashboard counts |
| `manage_projects` | projects/tasks/milestones create/update/status/delete/move |
| `*` (special, not in enum) | super-admin bypass via `Gate::before` + `User::isSuperAdmin()` |

**Removed permissions** (their domains/controllers were deleted; strings no longer exist in the enum or UI):
`manage_products`, `manage_documentation`, `manage_roadmap`, `manage_updates`, `manage_careers`, `manage_media`, `manage_timeline`, `manage_feature_flags`, `manage_faqs`, `manage_menus`, `manage_homepage`, `manage_static_pages`, `manage_subscriptions`, `view_products`.

---

## 2. Seeded roles (✅ `RoleSeeder` — updateOrCreate by slug)

| Slug | Name | Permissions |
|---|---|---|
| `super_admin` | Super Admin | `['*']` (bypasses every gate) |
| `admin` | Admin | `manage_settings`, `manage_contact_requests`, `view_audit_logs`, `view_services`, `manage_services`, `view_customers`, `manage_customers`, `view_projects`, `manage_projects`, `view_financials` |
| `support` | Support | `manage_contact_requests`, `view_customers`, `manage_customers` |

Notes (✅ verified):
- `manage_users`/`manage_admins` are **not** granted to any seeded role except implicitly `super_admin` (via `*`). The `admin` role cannot manage users.
- `view_financials` is granted to `admin` and `super_admin` only.
- Roles are created/updated idempotently by `db:seed`.
- Row visibility is permission-gated only; there is **no product-level scoping** (removed with the Product domain; leftover `product_id` columns dropped in Group H).

---

## 3. How permissions are enforced

- **Gate definitions** (`AuthServiceProvider`): every `Permission` enum value has a `Gate::define`; `Gate::before` lets super admin (`hasPermission('*')`) bypass all gates.
- `view_*` gates accept their `manage_*` counterpart via `hasAnyPermission` (e.g. `view_projects` is satisfied by `view_projects` or `manage_projects`).
- **Direct `authorize()`** in every admin controller method with the enum string.
- **Role validation**: `CreateRoleRequest`/`UpdateRoleRequest` validate `permissions.*` ∈ `Permission::values()` (typo-proof; `*` deliberately excluded from the pickable list).
- **Frontend mirror**: `modules/core/permissions.ts` (verified against backend `Permission.php`) drives nav filtering and `PermissionGate`. Frontend checks are UX-only; the backend is the authority.

---

## 4. Admin user seeding (✅ `AdminUserSeeder`)

- Bootstrap credentials come only from `config/admin.php` (`ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars). `updateOrCreate` keyed on the configured email; password hashed at insert by the model's `hashed` cast. **Fails closed**: a blank `ADMIN_PASSWORD` skips bootstrap entirely — no account is created or touched. No credential literal exists in source.

---

## 5. Permission gaps and inconsistencies (✅/⚠️)

| # | Issue | Verification |
|---|---|---|
| 1 | `manage_admins` is in the enum but **no seeded role** has it (only super_admin via `*`) | ✅ seeder |
| 2 | `view_financials` wired: dashboard, customer value-by-currency, project payload | ✅ grep + tests |
| 3 | `admin` role description: all permissions except `manage_users`/`manage_admins` | ✅ accurate (seeder) |
| 4 | Role self-edit protection | ❓ unverified — `RoleController` does not explicitly guard super_admin role mutation |
| 5 | Deleting the last super admin | ❓ unverified — no guard found in `UserController@destroy` |

---

## 6. Fail-closed principles (✅ verified)

- Permission checks fail closed (no role → denied).
- Unknown permission strings cannot be persisted (closed enum).
- Authorization happens in the controller/gate, never only in the UI.
