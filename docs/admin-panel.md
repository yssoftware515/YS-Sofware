# Admin Panel

**Verification:** ✅ code-verified from `app/admin/*`, `modules/core/*` (2026-11-10).

---

## 1. Overview

The admin panel lives at `app/admin/*` in `ys-web`. It is a client-rendered Next.js area, English-only UI, protected by `middleware.ts` (cookie presence) and backend authorization (Sanctum + permissions). It is powered by the platform kernel (`lib/platform`) via the `core` module.

## 2. Structure & routing (✅ verified)

| Path | Page |
|---|---|
| `/admin/login` | Login (client-side lockout: 5 attempts → 30s) |
| `/admin/forgot-password` | Request a password reset link |
| `/admin/reset-password` | Set a new password from the reset token |
| `/admin/dashboard` | Dashboard: 5 widget stat cards + attention lists |
| `/admin/services` (+ `[id]`, `new`) | Services CRUD (company service catalog) |
| `/admin/contact-requests` (+ `[id]`) | Inquiries: status, customer/project linking, convert-to-customer |
| `/admin/customers` (+ `[id]`, `new`) | Customers CRUD |
| `/admin/projects` (+ `[id]`, `new`) | Projects CRUD (delivery records) |
| `/admin/users` (+ `[id]`, `new`) | Users CRUD |
| `/admin/roles` | Roles CRUD (permission picker) |
| `/admin/settings` | Settings management |
| `/admin/audit-logs` | Audit log viewer |

## 3. Shell & providers (`app/admin/layout.tsx`, ✅ verified)

- Sidebar navigation from kernel `NavigationRegistry` (`getFilteredGroups(hasPermission)`) — 6 groups: Overview, Services & Content, Engagement, System, Security, Business. Customers/Projects are gated by `view_customers`/`view_projects`.
- Breadcrumb, `QueryClientProvider` (TanStack Query), `PlatformProvider` (boots `registeredModules` = [`coreModule`]), `AuthProvider`, `ToastProvider`, Cmd/Ctrl+K `CommandPalette`.
- `HealthIndicator` (uses `lib/platform/health-endpoints` — frontend-side checks).

## 4. Dashboard widgets (✅ `modules/core/widgets.ts`)

| Widget id | Title | Permission | API path |
|---|---|---|---|
| `services` | Services | manage_services | `/admin/services` |
| `inquiries` | Inquiries | manage_contact_requests | `/admin/contact-requests` |
| `customers` | Customers | view_customers | `/admin/customers` |
| `projects` | Projects | view_projects | `/admin/projects` |
| `audit-logs` | Audit Logs | view_audit_logs | `/admin/audit-logs` |

Widget counts are read from `meta.total` of each list response; failures fall back to 0 silently.

## 5. Forms & validation (✅ verified)

- Admin forms use local client validation; server-side FormRequests/inline validation are authoritative.
- `UserForm` — role picker (no product access; product-scoped access was removed with the Product domain).
- `RoleForm` — permission multi-select driven by `modules/core/permissions.ts` (mirrors `Permission.php` exactly).
- Rich text (service descriptions, static page content) is sanitized server-side (Purifier); see security.md.

## 6. Data access pattern (✅ verified)

`lib/admin/api.ts` (`adminFetch` etc., `credentials: 'include'`) + `lib/hooks/useAdminResource.ts` (`useAdminList`, `useAdminDelete`) for TanStack Query-based lists with toast feedback.

## 7. Known admin panel issues (see known-issues.md for detail)

1. `middleware.ts` guards by cookie presence only — an expired cookie passes the redirect guard and only the API rejects; UX should redirect on 401 (`AuthProvider` handles refresh on mount).
2. Removed public routes (`/products`, `/docs`, `/updates`, `/roadmap`, `/careers`) are still 308-redirected by `proxy.ts`; that is intentional (no dead 404s), not an admin surface.
