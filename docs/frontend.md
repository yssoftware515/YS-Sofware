# Frontend (ys-web)

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown
Next.js ^16.2.9 (App Router) · React 19 · TypeScript 5.5 · Tailwind CSS 3.4 · framer-motion · zustand · TanStack Query · zod · isomorphic-dompurify · lucide-react

---

## 1. Areas

1. **Public site** — `app/[locale]/(public)/*`, bilingual EN/AR with RTL.
2. **Admin panel** — `app/admin/*`, English-only UI, permission-filtered navigation.
3. **Platform framework** — `lib/platform/` (12 files) — a minimal plugin kernel powering the admin shell (`ModuleKernel`, registries for navigation/permission/widget/SEO, services for Logger/EventBus/ServiceContainer/PlatformConfig); dead scaffolding removed 2026-08-18 (Phase 2A, ARCH-006).
4. **Core module** — `modules/core/` registers nav groups (6 groups), permission groups (8 groups, 12 permissions), and 5 dashboard widgets.

## 2. Routing

- `middleware.ts` (✅ verified):
  - `/admin/*` → requires cookie `ys_admin_token` (presence only — **not** validated); else redirect `/admin/login`.
  - Everything else → locale redirect to `/en/...` (default locale `en`).
  - Static files and `/_next` skipped.
- `robots.ts` disallows `/admin`.
- `sitemap.ts` — generated sitemap incl. public pages and docs articles (✅ verified in code).

## 3. Public API client — `lib/api/client.ts` (✅ verified)

- Base: `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).
- Sends `Accept-Language` from locale.
- ISR caching: GETs `revalidate: 60`; search & contact `0` (never cached).
- Exposed functions: `settings, services, service, search, contact, pages, page, faqs`.
- Admin wrapper `lib/admin/api.ts`: `adminFetch/adminList/adminGet/adminCreate/adminUpdate/adminDelete`, always `credentials: 'include'`, throws `{status, message, errors}`.

## 4. Auth flow (admin) (✅ verified)

1. `GET /sanctum/csrf-cookie` (stateful CSRF handshake, see §4.1) then `POST /auth/login` with `{email, password, remember}` + `credentials: 'include'` + the `X-XSRF-TOKEN` header.
2. Backend sets HttpOnly cookie `ys_admin_token` (client JS cannot read it).
3. `AuthProvider` (`components/admin/PermissionGate.tsx`) calls `GET /auth/me` on mount → `{user, loading, hasPermission, refresh}` context.
4. `PermissionGate` component renders children only when permission matches (`*` wildcard or exact string).
5. Logout: `POST /auth/logout` (with CSRF header); failure alerts (cookie cannot be cleared client-side).
6. Client-side brute-force lockout: 5 attempts → 30s (login page).

### 4.1 XSRF/CSRF contract (stateful Sanctum) (✅ verified)

Implemented in `ys-web/lib/csrf.ts` (consumed by `lib/api/client.ts` and `lib/admin/api.ts`):

- **Handshake** — before the first stateful request, `ensureCsrf()` calls `GET /sanctum/csrf-cookie` with `credentials: 'include'`; Laravel answers with the `XSRF-TOKEN` cookie.
- **Credentials** — every stateful request sends `credentials: 'include'` (or `withCredentials`), so the HttpOnly session cookie and the XSRF cookie are attached.
- **CSRF header** — all **non-GET** stateful requests must carry `X-XSRF-TOKEN` with the **URL-decoded** value of the `XSRF-TOKEN` cookie (the cookie is URL-encoded; echoing the raw value fails verification). A missing/invalid header is rejected with 419.
- **Contract surface** — covered end-to-end by `ys-api/tests/Feature/Auth/StatefulCsrfFlowTest.php` (handshake 204 → login 200 → write 201 → logout 200 → post-logout 401; no-echo requests 419).

## 5. Admin shell (✅ verified)

`app/admin/layout.tsx` provides: sidebar (from kernel NavigationRegistry, filtered by permissions), breadcrumb, `QueryClientProvider`, `PlatformProvider` (boots `registeredModules` = [coreModule]), `AuthProvider`, `ToastProvider`, Cmd/Ctrl+K command palette. `HealthIndicator` component present in admin components.

## 6. i18n (✅ verified — important)

- **next-intl is NOT used** (`ys-web/SETUP.md` claims it is — outdated).
- Locale via `[locale]` route segment + middleware default redirect.
- `app/layout.tsx` inline script sets `dir`/`lang` before hydration (anti-FOUC).
- Component-level EN/AR lookup objects (e.g., Header nav, hero fallbacks).
- CMS content bilingual via API `_en`/`_ar` fields; `Accept-Language` sent per request.
- Helper `lib/i18n.ts` (`locales`, `isValidLocale`, `t()`) — used for validation/translation lookups.
- `i18n/messages/{en,ar}.json` — **dead files** (not imported anywhere). ⚠️

## 7. Design system (✅ verified)

- `styles/globals.css` — CSS custom properties (`--color-*`) for light + dark (`data-theme="dark"`), glass utilities, fluid type, `prefers-reduced-motion` support.
- `tailwind.config.ts` — maps Tailwind colors to CSS vars; fonts via vars: DM Sans / DM Mono / Space Grotesk (Google Fonts).
- `lib/stores/theme.ts` — zustand store persisted as `ys-theme`; `resolvedTheme()` SSR guard.
- `components/shared/ThemeProvider.tsx` — anti-FOUC inline script.

## 8. CMS content handling (✅ verified)

- `lib/cms/schemas.ts` — zod schemas (`heroContentSchema`, `whyChooseContentSchema`, `ctaContentSchema`).
- `lib/cms/validate.ts` — `validateUrl()` (protocol allow-list), `validateCmsContent()` (safeParse).
- Rich text rendering: service descriptions and static page content → `dangerouslySetInnerHTML` **wrapped in `sanitizeHtml()`** (isomorphic-dompurify allow-list). FAQs render as plain React text (no innerHTML). ✅

## 9. The `lib/platform` framework (✅ verified)

A minimal, self-contained module-kernel framework (**12 files**, 4 subdirectories) powering the admin shell:

| Area | Key files |
|---|---|
| Kernel | `kernel/ModuleKernel.ts`, `bootstrap.ts`, `PlatformProvider.tsx` |
| Contracts | `contracts/ModuleManifest.ts` |
| Registries | `NavigationRegistry.ts`, `PermissionRegistry.ts`, `WidgetRegistry.ts`, `SeoRegistry.ts` |
| Services | `Logger.ts`, `EventBus.ts`, `ServiceContainer.ts`, `PlatformConfig.ts` |

**Verification:** every remaining file is reachable from app code (`app/admin/layout.tsx` boots the core module via `PlatformProvider`; nav/widgets/permissions registries are consumed by the admin shell; `HealthIndicator` uses health-endpoints). The framework is functional but only the portions above are wired into the running app. No FeatureFlag, Scheduler, Search-driver, mail, or storage engines are registered — those capabilities were removed with their domains in Groups A–F/H, and no placeholder engines remain.

## 10. Tests (⚠️)

- `tests/platform/` — 6 Vitest files (`environment`, `health-endpoints`, `installer`, `recovery`, `release`, `secrets`) testing `lib/platform` classes. ✅
- ✅ `vitest` **is** declared in `package.json` with scripts `test`, `type-check`, `lint`, `build`; coverage config targets `lib/platform/**` + `modules/**`. (The "vitest not in package.json" claim below is outdated.)

## 11. TypeScript config (✅ verified)

- Path alias `@/*` → project root. Strict mode. `types/` holds shared interfaces (`ApiResponse<T>`, `PublicSettings`, `AdminUser`, `Locale`, etc.).

## 12. Known frontend issues (summary; details in known-issues.md)

- ⚠️ Former gaps — all **resolved** (no longer present in the tree): the 4 admin pages that called non-existent backend APIs (`sessions`, `login-history`, `api-tokens`, `notifications`) were removed (K-01..K-04); the 2 dashboard widgets hitting wrong paths (`/admin/faq`, `/admin/homepage`) were fixed via `apiPath` (K-05, K-06); the `manage_releases` widget gate was aligned to the backend's `manage_products` (K-07).
- `i18n/messages/*.json` unused (custom i18n, K-28 — dead files, keep out of API calls).
- Nav permissions are cross-checked — `modules/core/navigation.ts` is the single source, verified against backend gates 2026-08-18.
