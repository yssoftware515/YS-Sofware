# Roles & Permissions

**Verification:** ✅ verified from `RoleSeeder.php`, `Permission.php`, `AuthServiceProvider.php`, and every `authorize()` call in controllers.

---

## 1. Canonical permission catalog (✅ `Permission` enum)

| Permission string | Used by |
|---|---|
| `manage_products` | products, releases, ProductPolicy |
| `manage_careers` | careers |
| `manage_documentation` | docs categories/articles |
| `manage_faqs` | faqs |
| `manage_homepage` | homepage-sections |
| `manage_menus` | menus, menu-items |
| `manage_roadmap` | roadmap |
| `manage_static_pages` | static-pages |
| `manage_updates` | updates (+publish/unpublish) |
| `manage_media` | media |
| `manage_contact_requests` | contact-requests |
| `manage_settings` | settings |
| `manage_timeline` | timeline |
| `manage_feature_flags` | feature-flags |
| `view_audit_logs` | audit-logs |
| `manage_users` | users CRUD, roles index |
| `manage_admins` | roles create/update/delete, users/{id}/products |
| `manage_subscriptions` | subscriptions |
| `view_financials` | dashboard value-by-currency, customer value-by-currency, project quoted_value/currency (`ProjectController` payload) |
| `view_customers` | customers index/show, dashboard customer counts |
| `manage_customers` | customers create/update/status/delete, contact-request link/convert/unlink |
| `view_projects` | projects index/show, dashboard project counts |
| `manage_projects` | projects create/update/status/delete |
| `*` (special, not in enum) | super-admin bypass via `Gate::before` + `User::isSuperAdmin()` |

## 2. Seeded roles (✅ `RoleSeeder` — updateOrCreate by slug)

| Slug | Name | Permissions |
|---|---|---|
| `super_admin` | Super Admin | `['*']` |
| `admin` | Admin | manage_products, manage_documentation, manage_roadmap, manage_updates, manage_careers, manage_media, manage_settings, manage_timeline, manage_feature_flags, manage_contact_requests, manage_static_pages, manage_faqs, manage_menus, manage_homepage, view_audit_logs, view_products, view_services, manage_services, view_customers, manage_customers, view_projects, manage_projects, view_financials |
| `editor` | Editor | manage_documentation, manage_updates, manage_roadmap, manage_media, manage_faqs, manage_homepage, view_products |
| `content_manager` | Content Manager | manage_documentation, manage_updates, manage_careers, manage_static_pages, manage_faqs, manage_homepage, view_products |
| `support` | Support | manage_contact_requests, view_customers, manage_customers, view_products |

Notes (✅ verified):
- `manage_users`/`manage_admins` are **not** granted to any seeded role except implicitly `super_admin` (via `*`). The `admin` role cannot manage users.
- `manage_subscriptions`, `view_financials` are **not** granted to any seeded role.
- Roles are created/updated idempotently by `db:seed`.

## 3. How permissions are enforced

- **Gate definitions** (`AuthServiceProvider`): every `Permission` enum value has a `Gate::define` — `manage_products`, `manage_documentation`, `manage_roadmap`, `manage_updates`, `manage_careers`, `manage_contact_requests`, `manage_media`, `manage_users`, `manage_settings`, `manage_timeline`, `manage_feature_flags`, `manage_faqs`, `manage_static_pages`, `manage_menus`, `manage_homepage`, `manage_admins`, `manage_subscriptions`, `view_audit_logs`, `view_financials`, `view_products`/`manage_products`, `view_services`/`manage_services`, `view_customers`/`manage_customers`, `view_projects`/`manage_projects` (view-variants via `hasAnyPermission`) + `Gate::before` super-admin bypass.
- **Direct `authorize()`** in every admin controller method with the enum string.
- **Role validation**: `CreateRoleRequest`/`UpdateRoleRequest` validate `permissions.*` ∈ `Permission::values()` (typo-proof; `*` deliberately excluded from the pickable list).
- **Frontend mirror**: `modules/core/permissions.ts` (verified against backend) drives nav filtering and `PermissionGate`.

## 4. Admin user seeding (✅ `AdminUserSeeder`)

- Bootstrap credentials come only from `config/admin.php` (`ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars). `updateOrCreate` keyed on the configured email; password hashed at insert by the model's `hashed` cast. **Fails closed**: a blank `ADMIN_PASSWORD` skips bootstrap entirely — no account is created or touched. No credential literal exists in source (S-01/A-1 regression fixed; contract pinned by `tests/Unit/AdminSeederContractTest.php` + `tests/Feature/Admin/AdminUserSeederTest.php`).

## 5. Permission gaps and inconsistencies (✅/⚠️)

| # | Issue | Verification |
|---|---|---|
| 1 | `manage_admins` is in the enum but **no seeded role** has it (only super_admin via `*`) | ✅ seeder |
| 2 | ~~`view_financials` unused anywhere~~ — now wired: dashboard, customer value-by-currency and project payload; **VULN-10 resolved** | ✅ grep + tests |
| 3 | Frontend widget `manage_releases` (modules/core/widgets.ts) — **not a real permission**; backend gates releases with `manage_products` | ✅ |
| 4 | Frontend `modules/core/navigation.ts` permission labels — **cross-checked vs backend controllers 2026-08-18** (Phase 2A): every nav permission is a real gate; `timeline` → `manage_timeline`, `feature-flags` → `manage_feature_flags` fixed | ✅ |
| 5 | `admin` role description in `ys-api/README.md` says "All except manage_users" — ✅ accurate today (role has all except manage_users/manage_admins) | ✅ |
| 6 | `editor`/`content_manager`/`support` in README's roles table are abbreviated vs actual seeder (e.g., editor also has manage_faqs, manage_homepage) | ✅ seeder is authoritative |
