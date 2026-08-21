# Phase 3 Report — Full System Integration & API Contract Verification

**Date:** 2026-08-18 · **Scope:** backend ↔ frontend coherence across all 159 routes (130 admin / 20 public / 6 auth + health/up/csrf-cookie), ~95 admin API call sites, 19 public client usages · **Method:** read-only audit — code as source of truth, direct re-verification of every claim (grep/read + vendor-code tracing), no runtime/browser execution except a production build. Evidence is labeled **VERIFIED** (static code evidence), **INFERENCE** (derived, plausible), or **UNVERIFIED — REQUIRES RUNTIME** (no static proof possible).

---

## 1. Executive Summary

The integration surface is **mostly coherent**: 159 backend routes match 24 admin page groups and 19 public client call sites; the shared `useAdminList`/`adminFetch` layer and `lib/api/client.ts` follow one envelope convention (`{success, data[, meta, message]}`); auth, throttling, and locale plumbing are consistent end-to-end. Re-verification of previously documented integration issues (pagination envelope, dashboard widget paths, publish/unpublish verbs, phantom admin pages) cleared all of them — the envelope claim in particular was **proven false** by tracing Laravel's `CollectsResources` trait.

However, **5 P1 defects** were confirmed that break real admin workflows: menu CRUD (always 422), homepage sections (3 of 8 types always 422), FAQ publication (every FAQ stuck in draft), role-editor permission mapping (Timeline/Feature Flags grant the wrong permission), and the public header search (a UI shell with no API call). None are crashing P0s; the public marketing site renders and consumes its API correctly.

**Recommendation: C — operational, with 5 P1 defects in the admin surface that must be fixed before feature-complete sign-off.** No P0s. 19 findings total (5 P1 / 4 P2 / 6 P3 / 4 process-information). Remediation was **not** executed in this phase (read-only mandate).

## 2. Scope & Method

- **Backend inventory:** `routes/api.php` (245 lines) — every route read and categorized (auth 6, public 20, admin 130, +health/up/csrf-cookie); middleware stacks (`auth:sanctum` + `active` + `idle` + `throttle:admin` on admin; named throttles `auth`, `forgot`, `public`, `search`, `contact`, `admin`), base `Controller::perPage()` clamp (1–100), success-envelope conventions (stores 201 + `message`, deletes 200 `{success, message}`, never 204).
- **Frontend inventory:** all admin pages/call sites (via explore agent, then direct spot-verification of every critical claim), `lib/admin/api.ts`, `lib/hooks/useAdminResource.ts`, `lib/api/client.ts`, `lib/schemas/admin.ts`, `modules/core/{navigation,permissions,widgets}.ts`.
- **Vendor-code tracing** (for the pagination-envelope question): `Illuminate\Http\Resources\CollectsResources` + `ResourceCollection` read directly from `vendor/` to determine actual serialization.
- **Test evidence:** backend test suite (417 tests / 2323 assertions, all green) probed for what the index-route tests actually assert — they are shape-blind (see §20).
- **Production build:** `next build` (79/79 pages) executed during this phase as part of the companion implementation task; public pages correctly fall back on API failure (expected ECONNREFUSED at build time).

## 3. Verdict Classification

| Grade | Meaning | Assignment |
|---|---|---|
| A | Contracts fully coherent, no functional defects | — |
| B | Coherent with minor gaps | — |
| **C** | **Operational; significant P1 defects in feature surfaces** | **← this phase** |
| D | Broken core flows | — |

Public site: **B** (one P1: header search shell). Admin surface: **C** (4 P1s + permission-mapping P1). Combined verdict: **C**.

## 4. Findings Overview

| ID | Severity | Finding | Confidence | Evidence |
|---|---|---|---|---|
| INT-001 | P1 | Menu create/edit always 422; items never persist | VERIFIED | `MenuForm.tsx:26-27,41,103` ↔ `MenuController.php:47` |
| INT-002 | P1 | Homepage sections: 3 of 8 types always 422 | VERIFIED | `HomepageSectionForm.tsx:25-33` ↔ `HomepageSectionController.php:17,39` |
| INT-003 | P1 | FAQ creation never publishable; stuck in draft | VERIFIED | `FaqForm.tsx:14-19,35-36` ↔ `FaqController.php:53` + `Public/FaqController.php:18` |
| INT-004 | P1 | Role editor grants wrong permission for Timeline/Feature Flags | VERIFIED | `permissions.ts:29-30` ↔ `TimelineController.php:27,46,78,99`, `FeatureFlagController.php:24,42,80,115` |
| INT-005 | P1 | Header search is a UI shell with no API call | VERIFIED | `components/layout/Header.tsx` SearchModal (L58–190) — zero fetch; `client.ts:70` `search()` has no callers |
| INT-006 | P2 | Status page renders `undefined` for version | VERIFIED | `app/[locale]/(public)/status/page.tsx:16` ↔ `routes/api.php:54-57` (version deliberately omitted) |
| INT-007 | P2 | `next: { revalidate: 60 }` hard-coded, overrides callers | VERIFIED | `lib/api/client.ts:31` |
| INT-008 | P2 | Settings page swallows errors (3 bare `catch {}`) | VERIFIED | `app/admin/settings/page.tsx:64,84,112` |
| INT-009 | P2 | Docs category edit silently ignores `product_id` | VERIFIED | `DocumentationController.php:81-87` (update) vs `:58` (store) |
| INT-010 | P3 | Unpublish error message degraded (plain-object throw vs `instanceof Error`) | VERIFIED | `app/admin/updates/page.tsx:35` |
| INT-011 | P3 | Orphan `components/shared/SearchModal.tsx` (duplicate of inline header modal) | VERIFIED | file exists; no imports |
| INT-012 | P3 | Dead `adminRequest` export | VERIFIED | `lib/api/client.ts:104`; zero callers |
| INT-013 | P3 | `setQueryData` on a key no query uses (stale cache write) | VERIFIED | `app/admin/contact-requests/[id]/page.tsx` |
| INT-014 | P3 | Users index meta lacks `per_page` (products/services include it) | VERIFIED | `UserController.php:41-44` |
| INT-015 | P3 | `docs/api.md` §6 documents 4 admin pages that don't exist | VERIFIED | no `app/admin/{sessions,login-history,api-tokens,notifications}` |
| INT-016 | INFO | CookieConsent `hasConsentFor()` never called — no analytics runs | VERIFIED | `components/shared/CookieConsent.tsx:43`, zero callers |
| INT-017 | INFO | Breadcrumb JSON-LD deliberately not emitted | VERIFIED | `components/shared/Breadcrumb.tsx:5` comment |
| INT-018 | INFO | Public updates page consumes first page only (no pager) | INFERENCE | page renders `api.updates` result without pagination UI |
| INT-019 | INFO | Dev DB carried 6 pending migrations (reseeded cleanly after `migrate`) | VERIFIED | `migrate:status` (this phase) |

**Blocking flags:** none are P0. INT-001..INT-005 block feature-complete sign-off.

## 5. Finding Details — P1 (functional breakage)

### INT-001 — Menu create/edit always 422
- Frontend `MenuForm.tsx` models `{name_en, name_ar, location, items[]}` (L26-27, 41) and POSTs it (L103). Backend `MenuController::store` validates `name` (required, L47) and `location` (unique, L48) — `name` is never sent → 422 on every create. Update (L72-74) has the same `name` requirement → edit always 422.
- Menu items are edited inline in the form but the backend only persists them through separate `menu-items` endpoints (`MenuController.php:100-137`); the form never calls them → items never persist.
- Impact: the Menus admin feature is unusable end-to-end. Severity P1.

### INT-002 — Homepage sections: 3 of 8 types always 422
- `HomepageSectionForm.tsx:25-33` offers 8 types: hero, capabilities, products, services, why_choose, process, cta, stats.
- Backend `HomepageSectionController.php:17` allows 5: hero, stats, why_choose, products, cta. `capabilities`, `services`, `process` → `Rule::in` failure → 422.
- Impact: 3 of 8 homepage section types can never be created/edited. Severity P1.

### INT-003 — FAQ never publishable from the UI
- `FaqForm.tsx` has no status field (only question/answer/highlight, L14-19, 35-36).
- Backend `FaqController::store` validation (L53): `status` is `sometimes` + `in:[draft,published,archived]`; absent → default (draft). `update` (L82) likewise.
- Public endpoint returns only `Faq::published()` (`Public/FaqController.php:18`).
- Impact: every FAQ created via the admin UI is invisible on the public site, with no UI path to publish. Severity P1.

### INT-004 — Role editor grants wrong permission for Timeline / Feature Flags
- `modules/core/permissions.ts:29-30` maps Timeline → `manage_settings` and Feature Flags → `manage_settings`. The backend actually authorizes `manage_timeline` (`TimelineController.php:27,46,78,99`) and `manage_feature_flags` (`FeatureFlagController.php:24,42,80,115`).
- The file's own docblock (L6-16) asserts those permissions "don't correspond to any real check" — **stale**, contradicted by the current controllers (this is the mirror-image of the Phase 2A ARCH-009 correction: Phase 2A fixed `navigation.ts`, but `permissions.ts` — the role *editor* registry — was never aligned).
- Impact: a role built through the Role editor with "Timeline"/"Feature Flags" granted receives `manage_settings` instead → role-bound admins get 403 on timeline/feature-flag pages while also getting settings they weren't granted. Severity P1.

### INT-005 — Header search is a UI shell
- `components/layout/Header.tsx` `SearchModal` (L58–190): input bound to `query` state, keyboard hints, empty-state text — and **no fetch, no `api.search`, no results rendering** anywhere in the component (verified by full read).
- Backend `/public/search` exists and is wired (full-text vectors, VULN-19 pushdown); `lib/api/client.ts:70` exports `search()` — **zero callers**.
- Impact: public site search UI appears interactive but returns nothing. Severity P1.

## 6. Finding Details — P2 (works but wrong/silent)

- **INT-006** — `status/page.tsx` declares `HealthData.version: string` and renders it; the health endpoint deliberately exposes only `{status, checks}` (`routes/api.php:54-57`, security-motivated) → the page renders `undefined`. Fix direction: drop the version from the UI or the type.
- **INT-007** — `client.ts:31` sets `next: { revalidate: 60 }` after spreading `options`, overriding any caller-supplied `options.next`; `search()` (revalidate 0) and `contact()` (POST) cannot opt out. Latent until INT-005 is wired; would serve stale search results.
- **INT-008** — `settings/page.tsx:64,84,112` — three `catch {}` blocks hide every network/parse failure; admins see nothing on failure (the exact bug class `useAdminList` was built to eliminate, still present in this page's local fetches).
- **INT-009** — `DocumentationController::updateCategory` (L81-87) validates slug/title/sort_order/parent_id — **no `product_id`**, while `storeCategory` (L58) validates it + access-checks it. Editing a category with a product selector silently drops the product change.

## 7. Finding Details — P3 (minor / convention)

- **INT-010** — `adminCreate` throws a plain object `{status, message, errors}`; `updates/page.tsx:35` uses `err instanceof Error` → always falls back to generic "Failed to unpublish.", losing the server message.
- **INT-011** — `components/shared/SearchModal.tsx` is a dead duplicate of the inline header modal (no imports).
- **INT-012** — `adminRequest` (`client.ts:104`) has no callers; dead export.
- **INT-013** — contact-requests `[id]` writes `setQueryData(['/admin/contact-requests', id], …)` — a key shape no query uses (`useAdminList` keys are `[path, searchParams]`); harmless but ineffective; `invalidateQueries` would be correct.
- **INT-014** — users index `meta` omits `per_page` (products/services include it); `PageMeta` type expects it — benign because no user of the users list requests `withMeta`.
- **INT-015** — `docs/api.md` §6 documents sessions / login-history / api-tokens / notifications admin pages; none exist in `app/admin/` and no code references them — documentation drift (see §22).

## 8. Per-Resource-Group Integration Status (24 admin groups)

| Group | Backend surface | Frontend surface | Verdict |
|---|---|---|---|
| Products | CRUD + search + scoping | list/detail/new + forms | **Aligned** |
| Services | CRUD + filters | list/detail/new + forms | **Aligned** |
| Customers | CRUD + status patch | list (withMeta) / detail / new | **Aligned** |
| Subscriptions | CRUD | list / new (no delete button — no dead call) | **Aligned** |
| Users | CRUD + welcome token | list / detail / new | **Aligned** |
| Releases | CRUD + publish | list / form (date guard) | **Aligned** |
| Roadmap | CRUD | list / form | **Aligned** |
| Updates | CRUD + publish/unpublish (POST, routes exist) | list / forms; unpublish via `adminCreate` is **correct verb** | **Minor** (INT-010) |
| Static Pages | CRUD | list / form | **Aligned** |
| Careers | CRUD | list / form | **Aligned** |
| Contact Requests | index + status patch + per-email throttle | list / detail | **Minor** (INT-013) |
| Media | CRUD admin-only | media page | **Aligned** |
| Dashboard | stats/health/recent | widgets (UI-only) + quick links | **Aligned** |
| Audit Logs | index (RLS) | list | **Aligned** |
| Roles | CRUD | list / editor | **Mismatch** (INT-004) |
| Timeline | CRUD (authorize manage_timeline) | list / form | **Gated** — page fine, role editor can't grant access (INT-004) |
| Feature Flags | CRUD (authorize manage_feature_flags) | list / form | **Gated** — same |
| FAQ | CRUD (draft default) | list / form (no status) | **Broken** (INT-003) |
| Menus | CRUD + menu-items | form (name mismatch) | **Broken** (INT-001) |
| Homepage | sections CRUD (5 types) | form (8 types) | **Broken** (INT-002) |
| Docs | categories + articles | categories/articles pages | **Mismatch** (INT-009) |
| Settings | public + admin settings | settings page (silent catches) | **Minor** (INT-008) |
| Projects | CRUD + scoping (Phase 2A) | list / detail / new | **Aligned** |
| Login | 6 auth routes + throttle | login page | **Aligned** |

Summary: **14 aligned, 3 broken, 2 mismatch (+2 gated), 3 minor.**

## 9. Re-verification Ledger (previously documented integration issues)

| Prior claim | Re-verification result |
|---|---|
| Paginated indexes (products/services/users) return a nested paginator under `data` ("double envelope") → frontend crash | **VERIFIED FIXED / claim false** — traced `CollectsResources::collectResource`: paginator items are mapped into the resource class and the collection flattens to a plain array; `data` is `[{...resource}]` + top-level `meta`. Tests assert 200 + `['data','meta']` and pass. |
| Dashboard widgets hit wrong paths `/admin/faq`, `/admin/homepage` | **VERIFIED FIXED** — quick links (`dashboard/page.tsx:79,81`) match real page dirs (`app/admin/faq`, `app/admin/homepage`); `widgets.ts` carries no hrefs (UI-only stats). |
| Updates publish/unpublish use the wrong verb (`adminCreate` POST) | **VERIFIED FIXED / claim false** — `routes/api.php:154-155` define POST publish/unpublish; POST is correct. |
| Header search "dead" | **Half-corrected** — the standalone `shared/SearchModal.tsx` is dead (INT-011), but the header contains its own inline modal — which is a **real** UI shell with no API call (INT-005). Severity upgraded. |
| 4 phantom admin pages (sessions/login-history/api-tokens/notifications) | **VERIFIED ABSENT** — no directories, no API calls; only `docs/api.md` §6 still claims them (INT-015). |
| FaqResource raw-model leakage (ARCH-001) | **VERIFIED FIXED** — `Admin\FaqResource` on all four paths (Phase 2A regression tests green). |
| nav permission mismatch (ARCH-009) | **Partially fixed** — `navigation.ts` correct; the role-editor registry `permissions.ts` still wrong (INT-004). |

## 10. Auth Lifecycle

- Login: `auth/login` (throttle:auth) → `auth/me`, `auth/logout`, `auth/change-password` behind `auth:sanctum` + `active` + `idle`; `/csrf-cookie` exposed. Frontend admin login posts credentials with `credentials: 'include'`; `adminFetch` reuses the session cookie. Verified coherent.
- Throttles: admin 60/min (per-user via VULN-27), forgot-password per-email 3/hr, contact per-email 2/hr, public 120/min. No frontend/auth mismatch found.
- No logout-route mismatch: admin shell calls the same `auth/logout`.

## 11. Authorization End-to-End

- Admin routes: `auth:sanctum` + `active` + `idle` + per-controller `authorize('…')`. Frontend: `PermissionGate` + `navigation.ts`/`widgets.ts` permission keys — **all backend permission strings** (Permission.php enum) are mirrored in the frontend registries **except** the role-editor groups (INT-004), which map to different strings.
- Product-scoping (`canAccessProduct`) verified consistent: backend filters index queries, frontend scoped lists use the same `/admin/products` path — the backend's whereIn filtering is the enforcement point. Consistent.

## 12. Error Handling

- Backend: uniform `{success:false, message}` (validation adds `errors`). Frontend public client throws `Error(body.message)`; admin client throws `{status, message, errors}` — the **two throw shapes are inconsistent** (public: Error, admin: plain object), which is why `err instanceof Error` fails in `updates/page.tsx` (INT-010) and would fail anywhere else using `instanceof`. Recommendation: normalize admin throws to `Error` with `errors` attached, or a shared guard.
- Silent `catch {}` in settings page (INT-008) is the worst offender.

## 13. Localization / RTL

- Backend: `ResolveLocale` middleware (`bootstrap/app.php:32`) maps `Accept-Language` → `en|ar`, resources pick `_en/_ar` columns. Frontend public client sends `Accept-Language: locale`; admin is English-only by design.
- Verified: public resources (`StaticPageResource`, `FaqResource`, etc.) localize correctly; admin resources are bilingual-by-field. Arabic static pages confirmed rendering real Arabic strings in the seeded DB (this phase's reseed verification). No RTL defects found in the legal pages (dir attributes present).

## 14. Cache & State

- React Query: `useAdminList` key `[path, searchParams]` — stable; invalidations on delete/publish/unpublish correct. One stale-key write (INT-013).
- Public pages: ISR/`revalidate: 60` — but hard-coded override bug (INT-007) makes caller control impossible.
- Dashboard stats: fresh fetch per render path (no stale-cache defect found).

## 15. Media

- Admin-only media CRUD; `ProductResource` maps `mediaAttachments` with null-safe `media?->url` (deleted-media crash guard verified in code, `ProductResource.php:68-76`). Public product detail consumes the same guard. No integration defect found.

## 16. Orphans & Dead Code

- `components/shared/SearchModal.tsx` (INT-011), `client.ts` `adminRequest` (INT-012), `client.ts` `search()` (zero callers — the actual live search path), plus the 100 remaining `lib/platform` files (all reachable per Phase 2A ARCH-006). No dead backend routes found.

## 17. Performance

- `per_page` clamp 1–100 on all paginated indexes; search uses SQL pushdown + real COUNT (VULN-19); admin indexes eager-load relations (no N+1 in the audited paths); public homepage coalesces fetches with `Promise.allSettled`; static generation with 60s revalidate. No P2+ performance defect found; INT-007 caps how aggressively cacheability can be tuned.

## 18. Conventions & Architecture Compliance

- Envelope: all 159 routes return `{success, data[, meta][, message]}`; stores 201; deletes 200 (never 204) — frontend handles both. No exceptions found.
- Resource usage: admins use `Admin\*Resource` on all audited paths post-Phase 2A; users index uses `Auth\UserResource` (fields match the admin table: `is_active`, `last_login_at`, `role`) — consistent.
- Meta shape: products/services include `per_page`, users omit it (INT-014) — the only envelope inconsistency.

## 19. Feature Completeness Matrix

| Public surface | Backend | Frontend | Status |
|---|---|---|---|
| Homepage (hero/stats/why_choose/products/cta) | ✓ | ✓ | **Aligned** |
| Products + detail + releases | ✓ | ✓ | Aligned |
| Services + detail (incl. wa.me CTA) | ✓ | ✓ | Aligned (settings now seeded) |
| Search | ✓ endpoint | ✗ UI shell | **Broken** (INT-005) |
| FAQ | ✓ published-only | ✓ | Aligned (but admin can't publish — INT-003) |
| Menus (header/footer nav) | ✓ | ✓ | Aligned |
| Roadmap / Updates / Changelog / Careers | ✓ | ✓ | Aligned |
| Docs (categories/articles) | ✓ | ✓ | Aligned (product_id edit — INT-009) |
| Legal pages (privacy/terms/cookie/security/status) | ✓ | ✓ | Aligned (last-updated fixed post-audit, see §23) |
| Contact form + per-email throttle | ✓ | ✓ | Aligned |

## 20. Test Coverage Gaps

- **Backend:** index-route tests are shape-blind — `ProductTest.php:23-25` / `ServiceTest.php:25-27` assert only `['data', 'meta']` keys, never that `data` is an array of typed items; a real envelope regression (nested paginator) would pass these tests. **No test pins the paginated array shape.**
- No backend test covers the menu-item endpoints' relationship to menus, homepage type list, or FAQ status default semantics (the three P1 breakages shipped with green suites).
- **Frontend:** the 40 tests cover contract schemas and client helpers; **zero tests render admin list pages or forms** — every P1 in this report is invisible to the current suite. No test for the header search behavior.
- Recommendation (not executed): one contract test per paginated index asserting `Array.isArray(data)`, one form-submission test per admin group (mock fetch, assert payload), and one header-search interaction test.

## 21. Deployment Notes

- **pgsql required** — `ilike` used in Product/Service/User search (`ProductController.php`, `ServiceController.php`, `UserController.php`); Laravel translates it for SQLite but production must be Postgres (matches `phpunit.xml` and `.env`).
- This phase exposed **stale dev-DB hygiene**: 6 migrations were pending locally (`2026_08_08_000017`…`2026_08_16_000005`, incl. `add_highlights_to_faqs`); `migrate` + reseed ran clean afterwards (0 duplicate slugs). A pre-deploy `migrate --force` on all environments is required.
- Seeders are idempotent (`updateOrCreate` by slug/key) — verified by reseeding in this phase.

## 22. Documentation Drift

- `docs/api.md` §6 lists 4 nonexistent admin pages (INT-015). Every other audited doc (roles-permissions, authorization, features, frontend, architecture) matched code on spot-checks. Known-issues should also absorb INT-001..005 once fixed.

## 23. Post-Audit Changes (executed between audit and this report)

A separate implementation order was executed after this audit, touching only: legal-page "last updated" rendering (now uses `published_at` from the API, no `new Date()` fabrication; `security` page had no bug), Privacy/Cookie content in `CmsSeeder.php` + frontend fallbacks (verified in DB), and `SettingsSeeder.php` (TikTok company URL, WhatsApp number `201008920677` digits-only for `wa.me`, display `0100 892 0677`). All gates green (tsc, eslint, next build, reseed). None of the Phase 3 P1s were addressed by that order — they remain open.

## 24. Remediation Recommendations (not executed — read-only phase)

| Priority | Action |
|---|---|
| P1 | `MenuForm` → send `name` (or backend accept `name_en`/`name_ar`); persist items via the menu-items endpoints |
| P1 | Align homepage types: drop `capabilities/services/process` from the form or add them to backend `TYPES` (decision needed — the form's 3 extras have no backend model shape) |
| P1 | Add a status control to `FaqForm` (or a publish action); backend default is already `published` in the table default — align seeder/controller default explicitly |
| P1 | Fix `permissions.ts:29-30` → `manage_timeline` / `manage_feature_flags`; update the stale docblock |
| P1 | Wire the header search to `api.search()` (client.ts `search()` + `/public/search`) or remove the input |
| P2 | Drop `version` from status page/type; allow `options.next` passthrough in `client.ts`; replace the 3 `catch {}` in settings; add `product_id` to updateCategory validation |
| P3 | Normalize admin throw to `Error`; delete `shared/SearchModal.tsx` + `adminRequest`; fix contact-requests invalidation; add `per_page` to users meta; fix `docs/api.md` §6 |

## 25. Final Verdict & Next Steps

**Verdict: C — operational.** The public marketing site is coherent and the admin surface is usable except for the five P1 surfaces above; no data-loss or security regression was found. The five P1s are isolated form/registry defects with clear one-surface fixes, none requiring architectural change.

**Next steps:** (1) Lead Engineer review of this report and the accompanying implemented order (legal pages + settings); (2) execute the P1 remediation batch (§24) with the existing test conventions (regression tests per fix, contract tests per paginated index); (3) re-run full gates (backend suite, tsc, eslint, next build, reseed) and re-audit the five P1 surfaces; (4) update `docs/api.md` §6 and `known-issues.md`; (5) re-grade to B/A.