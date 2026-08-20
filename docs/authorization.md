# Authorization

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## 1. Model

Role-based access control (RBAC) with a **wildcard super-admin bypass** and an additional **product-level scoping** layer for product-bound resources. (No ABAC, no teams, no tenants.)

## 2. Layers (✅ verified)

### Layer 1 — Permissions stored on roles
- `roles.permissions` — jsonb array of permission strings.
- `User::hasPermission(string)` — false if no role; `'*'` (super admin) → true for everything; else exact membership.
- `User::hasAnyPermission(array)` — any-of.

### Layer 2 — Gates (`AuthServiceProvider`, ✅ verified)
- `Gate::before`: super admin (`hasPermission('*')`) bypasses **all** gates.
- Explicit gates defined for **every** `Permission` enum value — `manage_products`, `manage_documentation`, `manage_roadmap`, `manage_updates`, `manage_careers`, `manage_contact_requests`, `manage_media`, `manage_users`, `manage_settings`, `manage_timeline`, `manage_feature_flags`, `manage_faqs`, `manage_menus`, `manage_homepage`, `manage_static_pages`, `manage_roles`, `manage_admins`, `manage_subscriptions`, `view_audit_logs`, `view_admin_activity`, `view_financials`, `view_services`, `manage_services`, `view_customers`, `manage_customers`, `view_projects`, `manage_projects`, `view_products` — with view-variants via `hasAnyPermission`. ✅ Verified 2026-08-18: every enum value has a registered gate.
- Controllers call `$this->authorize('<permission>')` on every admin route where the permission string matches a `Permission` enum value. ✅ Verified.

### Layer 3 — Product-scoped access (✅ verified, fail-closed)
- Pivot `admin_product_access` (user_id ↔ product_id), backfilled for all users×products by migration 2026_07_31_000004.
- `User::canAccessProduct(Product|string)` — super admin → true; otherwise row must exist in pivot → **zero rows = zero access**.
- Enforced in: `ProductController` (index/show/update/destroy), `ReleaseController`, `DocumentationController` (categories + articles) — `abort_unless(..., 403, 'You do not have access to this product.')`.

### Layer 4 — Policies
- `ProductPolicy` — maps `manage_products`/`viewAny`/`view`/`create`/`update`/`delete`; registered in `AuthServiceProvider::$policies`.

### Layer 5 — Active-user gate
- `EnsureUserIsActive` middleware on all admin routes (see [authentication.md](authentication.md)).

## 3. Admin routes summary (✅ verified from `routes/api.php`)

All `/admin/*` routes require `auth:sanctum` + `active`. Permission per controller:

| Permission | Routes |
|---|---|
| `manage_products` | products, releases |
| `manage_documentation` | docs categories + articles |
| `manage_roadmap` | roadmap |
| `manage_updates` | updates + publish/unpublish |
| `manage_careers` | careers |
| `manage_settings` | settings |
| `manage_timeline` | timeline |
| `manage_feature_flags` | feature-flags |
| `manage_contact_requests` | contact-requests |
| `manage_media` | media |
| `manage_users` | users CRUD + roles index |
| `manage_admins` | roles create/update/delete, users/{user}/products (syncProducts) |
| `manage_faqs` | faqs |
| `manage_menus` | menus + menu-items |
| `manage_homepage` | homepage-sections |
| `manage_static_pages` | static-pages |
| `manage_subscriptions` | customers, subscriptions |
| `view_audit_logs` | audit-logs |

## 4. Frontend permission model (✅ verified)

- `modules/core/permissions.ts` — permission groups (verified against backend `Permission.php`).
- `PermissionGate` + `useAuth().hasPermission` — UI-level gating (nav, buttons, routes).
- **Security note:** frontend checks are UX-only; the backend is the authority. ❓ The one exception: `middleware.ts` guards admin pages by cookie *presence* only — a user without permission who has *any* valid cookie can load the page shell, but API calls still 401/403.

## 5. Known authorization gaps / notes

| Item | Status | Detail |
|---|---|---|
| `view_financials` permission | ⚠️ defined but unused | `Permission` enum has it; no controller checks it; subscriptions/customers are gated by `manage_subscriptions` only |
| `manage_admins` | ✅ used | roles CRUD + product sync |
| `view_admin_activity` | ⚠️ defined but unused | no route/controller references it |
| `view_products` | ✅ used | gate + ProductPolicy viewAny/view (allows read-only product access) |
| Role self-edit protection | ❓ unverified | `RoleController` — see known-issues (super_admin role mutation not guarded in code read) |
| Deleting the last super admin | ❓ unverified | no guard found in `UserController@destroy` |

## 6. Fail-closed principles (✅ verified from code comments)

- Product access fails closed (empty pivot → denied).
- Permission checks fail closed (no role → denied).
- `Permission` enum is the closed list validated by `Rule::in(Permission::values())` in role requests — admins cannot create roles with unknown permission strings.
