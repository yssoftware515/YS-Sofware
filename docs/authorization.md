# Authorization

**Verification:** ✅ code-verified from `Permission.php`, `AuthServiceProvider.php`, `routes/api.php` and every controller `authorize()` call (2026-11-10).

---

## 1. Model

Role-based access control (RBAC) with a **wildcard super-admin bypass**. No ABAC, no teams, no tenants, no product-level scoping (removed with the Product domain in Group A; the leftover columns were dropped in Group H).

## 2. Layers (✅ verified)

### Layer 1 — Permissions stored on roles
- `roles.permissions` — jsonb array of permission strings.
- `User::hasPermission(string)` — false if no role; `'*'` (super admin) → true for everything; else exact membership.
- `User::hasAnyPermission(array)` — any-of.

### Layer 2 — Gates (`AuthServiceProvider`, ✅ verified)
- `Gate::before`: super admin (`hasPermission('*')`) bypasses **all** gates.
- Every one of the 12 `Permission` enum values has a matching gate:
  `manage_contact_requests`, `manage_settings`, `view_audit_logs`, `manage_users`, `manage_admins`, `view_financials`, `view_services`, `manage_services`, `view_customers`, `manage_customers`, `view_projects`, `manage_projects`.
- `view_*` gates accept their `manage_*` counterpart via `hasAnyPermission` (e.g. `view_projects` is satisfied by `view_projects` or `manage_projects`).
- Controllers call `$this->authorize('<permission>')`; the `Permission` enum is the closed list validated by `Rule::in(Permission::values())` in role requests.

### Layer 3 — Active-user gate
- `EnsureUserIsActive` middleware on all admin routes (see [authentication.md](authentication.md)).

## 3. Admin routes summary (✅ verified from `routes/api.php`)

All `/admin/*` routes require `auth:sanctum` + `active`. Permission per controller:

| Permission | Routes |
|---|---|
| `manage_services` | services CRUD (read gated by `view_services`) |
| `manage_contact_requests` | contact-requests (list/show/status/link/convert) |
| `view_customers` / `manage_customers` | customers read / customers mutations + status |
| `view_projects` / `manage_projects` | projects, tasks and milestones (read / mutations + status + move) |
| `manage_users` | users CRUD + roles index |
| `manage_admins` | roles create/update/delete |
| `manage_settings` | settings |
| `view_audit_logs` | audit-logs, ops/failed-jobs |
| `view_financials` | dashboard/customer/project money fields (omitted without it) |

## 4. Frontend permission model (✅ verified)

- `modules/core/permissions.ts` — permission groups verified against backend `Permission.php` (8 groups, 12 permissions).
- `PermissionGate` + `useAuth().hasPermission` — UI-level gating (nav, buttons, routes).
- **Security note:** frontend checks are UX-only; the backend is the authority. `middleware.ts` guards admin pages by cookie *presence* only — a user without permission who has *any* valid cookie can load the page shell, but API calls still 401/403.

## 5. Known authorization notes

| Item | Status | Detail |
|---|---|---|
| `view_financials` | ✅ used | dashboard value-by-currency, customer value-by-currency, and project `quoted_value`/`currency` — omitted entirely unless the caller holds `view_financials` (or super-admin bypass) |
| `manage_admins` | ✅ used | roles create/update/delete |
| `view_products`, `manage_products`, `manage_subscriptions`, `manage_media`, `manage_faqs`, `manage_menus`, `manage_homepage`, `manage_static_pages`, `manage_documentation`, `manage_roadmap`, `manage_updates`, `manage_careers`, `manage_timeline`, `manage_feature_flags` | ✅ removed | Their domains/controllers were removed; the strings no longer exist in the enum or the UI |
| Role self-edit protection | ❓ unverified | `RoleController` — super_admin role mutation is not explicitly guarded in code |
| Deleting the last super admin | ❓ unverified | no guard found in `UserController@destroy` |

## 6. Fail-closed principles (✅ verified)

- Permission checks fail closed (no role → denied).
- Unknown permission strings cannot be persisted (closed enum).
- Authorization happens in the controller/gate, never only in the UI.
