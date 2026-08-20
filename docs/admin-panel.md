# Admin Panel

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## 1. Overview

The admin panel lives at `app/admin/*` in `ys-web`. It is a client-rendered Next.js area, English-only UI, protected by `middleware.ts` (cookie presence) and backend authorization (Sanctum + permissions). It is powered by the platform kernel (`lib/platform`) via the `core` module.

## 2. Structure & routing (✅ verified)

| Path | Page |
|---|---|
| `/admin/login` | Login (client-side lockout: 5 attempts → 30s) |
| `/admin/dashboard` | Dashboard: 8 widget stat cards, quick actions, system status |
| `/admin/products` (+ `[id]`, `new`) | Products CRUD |
| `/admin/releases` | Releases CRUD |
| `/admin/docs` (+ `categories/` + `articles/[id]`, `new`) | Documentation management |
| `/admin/static-pages` (+ `[id]`, `new`) | Static pages CRUD |
| `/admin/faq` (+ `[id]`, `new`) | FAQs CRUD (API uses `/admin/faqs`) |
| `/admin/menus` (+ `[id]`, `new`) | Menus CRUD |
| `/admin/homepage` (+ `[id]`, `new`) | Homepage sections (API uses `/admin/homepage-sections`) |
| `/admin/roadmap` | Roadmap CRUD |
| `/admin/updates` | Updates + publish/unpublish |
| `/admin/careers` | Careers CRUD |
| `/admin/timeline` | Timeline CRUD |
| `/admin/media` | Media library (upload/list/delete) |
| `/admin/users` (+ `[id]`, `new`) | Users CRUD + product access |
| `/admin/roles` | Roles CRUD (permission picker) |
| `/admin/settings` | Settings management |
| `/admin/feature-flags` | Feature flags CRUD |
| `/admin/audit-logs` | Audit log viewer (⚠️ UI exists; API exists) |
| `/admin/sessions` | ⚠️ **no backend API** → broken |
| `/admin/login-history` | ⚠️ **no backend API** → broken |
| `/admin/api-tokens` | ⚠️ **no backend API** → broken |
| `/admin/notifications` | ⚠️ **no backend API** → broken |
| `/admin/customers` (+ `[id]`, `new`) | Customers CRUD |
| `/admin/projects` (+ `[id]`, `new`) | Projects CRUD (Operational/delivery records) |
| `/admin/subscriptions` (+ `new`) | Subscriptions CRUD (manual) |

## 3. Shell & providers (`app/admin/layout.tsx`, ✅ verified)

- Sidebar navigation from kernel `NavigationRegistry` (`getFilteredGroups(hasPermission)`) — 8 groups: Overview, Content, Media, System, Security, Notifications, Business, Billing. Business (Customers, Projects) is gated by `view_customers`/`view_projects`.
- Breadcrumb, `QueryClientProvider` (TanStack Query), `PlatformProvider` (boots `registeredModules` = [`coreModule`]), `AuthProvider`, `ToastProvider`, Cmd/Ctrl+K `CommandPalette`.
- `HealthIndicator` (uses `lib/platform/health-endpoints` — frontend-side checks).

## 4. Dashboard widgets (✅ `modules/core/widgets.ts`)

| Widget id | Title | Permission | API path used | Backend route | Status |
|---|---|---|---|---|---|
| `products` | Products | manage_products | `/admin/products` | ✅ exists | ✅ |
| `releases` | Releases | ⚠️ `manage_releases` (invalid) | `/admin/releases` | ✅ exists | ⚠️ permission mismatch |
| `careers` | Careers | manage_careers | `/admin/careers` | ✅ exists | ✅ |
| `audit-logs` | Audit Logs | view_audit_logs | `/admin/audit-logs` | ✅ exists | ✅ |
| `static-pages` | Static Pages | manage_static_pages | `/admin/static-pages` | ✅ exists | ✅ |
| `faq` | FAQ | manage_faqs | `/admin/faq` | ❌ (is `/admin/faqs`) | ❌ 404 |
| `menus` | Menus | manage_menus | `/admin/menus` | ✅ exists | ✅ |
| `homepage` | Homepage | manage_homepage | `/admin/homepage` | ❌ (is `/admin/homepage-sections`) | ❌ 404 |

Widget counts are read from `meta.total` of each list response; failures fall back to 0 silently.

## 5. Forms & validation (✅ verified)

- Admin forms use zod schemas (CMS content) and local client validation; server-side FormRequests/inline validation are authoritative.
- `UserForm` — role picker, product access checkboxes (synced via `PUT /admin/users/{id}/products`).
- `RoleForm` — permission multi-select driven by `modules/core/permissions.ts`.
- Rich text (product long desc, doc articles) sanitized server-side (Purifier) and client-side (dompurify) — see security.md.

## 6. Data access pattern (✅ verified)

`lib/admin/api.ts` (`adminFetch` etc., `credentials: 'include'`) + `lib/hooks/useAdminResource.ts` (`useAdminList`, `useAdminDelete`) for TanStack Query-based lists with toast feedback.

## 7. Known admin panel issues (see known-issues.md for detail)

1. 4 pages with no backend API (sessions, login-history, api-tokens, notifications) → error states.
2. 2 dashboard widgets 404 (faq, homepage paths).
3. Widget permission `manage_releases` invalid.
4. Duplicated navigation definitions (`lib/admin/navigation.ts` vs `modules/core/navigation.ts`).
5. `middleware.ts` guards by cookie presence only — an expired cookie passes the redirect guard and only the API rejects; UX should redirect on 401 (`AuthProvider` handles refresh on mount; ❓ verify behavior after token expiry).
