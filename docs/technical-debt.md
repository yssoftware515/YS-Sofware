# Technical Debt

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## 1. Duplicated code (✅ verified)

| # | Duplication | Files |
|---|---|---|
| TD-01 | Admin navigation defined twice | `lib/admin/navigation.ts` vs `modules/core/navigation.ts` (same 7 groups, slightly different icons/moduleIds) |
| TD-02 | Permission groups duplicated conceptually | `modules/core/permissions.ts` vs `Permission.php` (backend) — kept in sync manually; drift documented in file header |
| TD-03 | Hardcoded EN/AR translation objects per component | Header, HeroSection, sections, admin pages — repeated pattern, no shared dictionary (i18n/messages/*.json exist but unused!) |
| TD-04 | Fetch boilerplate | public `lib/api/client.ts` vs admin `lib/admin/api.ts` — two wrappers with different conventions |
| TD-05 | Widget/quick-links permission lists | dashboard `quickLinks` + widgets definitions + nav — three places describing the same resources |

## 2. Dead code / unused files (✅ verified)

| # | Item | Location | Evidence |
|---|---|---|---|
| TD-06 | `i18n/messages/{en,ar}.json` | ys-web | no imports anywhere |
| TD-07 | `public/branding/illustrations/` | ys-web | doc says "unused illustrations" (⚠️ per FRONTEND_STRUCTURE.md, now deleted; ❓ re-verify) |
| TD-08 | `PermissionRepository` | ys-api `app/Domains/Auth/Repositories/` | "future-swap abstraction" per README; no callers found ⚠️ |
| TD-09 | `view_admin_activity`, `view_financials` permissions | Permission.php | unused by any gate/controller |
| TD-10 | `media.mediable_type/mediable_id` polymorphic columns | migration 000006 | no MorphTo in code |
| TD-11 | `users.password_reset_token/expires_at`, `email_verified_at` | migration 000002 | no flow uses them |
| TD-12 | `SettingsSeeder_ADDITIONS.php` | seeders | removed in Sprint 1.1 (dead merge-fragment with parse error; not called by `DatabaseSeeder`) |
| TD-13 | `SearchResultCollection` `groupedByType` ⚠️ | used by frontend search UI (check) | ✅ actually used |
| TD-14 | Stray empty files + brace dir (K-25, K-26) | ys-api root, Search/ | committed junk |

## 3. Large components / controllers (⚠️ inferred from size & grep)

| # | File | Concern |
|---|---|---|
| TD-15 | `app/Http/Controllers/Admin/DocumentationController.php` | single controller handling 8 actions (categories + articles) — largest admin controller |
| TD-16 | `app/Http/Controllers/Admin/UserController.php` | store/update inline validation + syncProducts — mixed responsibilities |
| TD-17 | `components/sections/HeroSection.tsx` | complex animated hero (documented as "the main file to edit" — risk of regressions) |
| TD-18 | `lib/platform/*` (191 files) | enormous dormant framework — maintenance surface with no consumers for most services |
| TD-19 | `app/admin/layout.tsx` + providers | single layout mounting 6+ providers + command palette |

## 4. Architecture smells (⚠️ inferred, code-based)

| # | Smell | Detail |
|---|---|---|
| TD-20 | Mixed validation styles | FormRequests (products/roles/billing/login) vs inline `$request->validate` (users, media, menus, faqs, homepage, timeline, contact, updates, docs…) |
| TD-21 | Mixed write patterns | Actions/DTOs (products, docs, CMS, auth) vs direct Eloquent in controllers (users, media, settings, feature flags, timeline, releases) — two idioms |
| TD-22 | Global middleware does everything | SecurityHeaders + ForceJsonResponse + CookieToBearer applied to *all* routes including public/health — health response also goes through `Accept: application/json` forcing (harmless) |
| TD-23 | Frontend platform framework duality | admin could run with plain React; `lib/platform` adds a parallel architecture (registries/buses/drivers) that only partially connects to real APIs |
| TD-24 | Duplicated i18n strategy | dead JSON files + component-scoped objects + CMS bilingual fields — three mechanisms |
| TD-25 | Nginx URL-rewriting coupling | `/api/` strip logic + build-time env vars + frontend base path — fragile chain (K-20/K-21) |
| TD-26 | `config/filesystems.php` not published | framework defaults silently drive storage behavior (unconfigured serve)` | + RESOLVED Sprint 1 (config published; explicit disks) |
| TD-27 | Two git repos inside one monorepo | root not a repo; `ys-api` and `ys-web` each have `.git` — coordination/release coupling issues |

## 5. Testing debt (⚠️)

| # | Item |
|---|---|
| TD-28 | Frontend tests unreachable (vitest not in package.json, no npm test script) |
| TD-29 | CI "static analysis" and "frontend tests" are placeholders (fail-open `|| echo`) |
| TD-30 | No tests for: billing, feature flags controller, roles/users controllers, media controller, search endpoint, settings controller, menus, homepage sections, static pages, timelines — only products/docs/auth/contact/actions covered |
| TD-31 | No E2E tests; no load tests |

## 6. Naming inconsistencies (✅/⚠️)

| # | Issue |
|---|---|
| TD-32 | `faq` (route path) vs `faqs` (API) — admin URL `/admin/faq` vs backend `/admin/faqs` | + RESOLVED Sprint 1 (dashboard widget uses `apiPath: 'faqs'`) |
| TD-33 | `homepage` (UI) vs `homepage-sections` (API) | + RESOLVED Sprint 1 (dashboard widget uses `apiPath: 'homepage-sections'`) |
| TD-34 | `docs` API group name reused for both documentation articles (admin `docs`) and public docs |
| TD-35 | `manage_settings` gates timeline + feature flags + settings — semantically overloaded |
| TD-36 | `Customer`/`Subscription` domain under `Billing` — consistent, but `created_by` naming vs `author_id`/`uploaded_by`/`handled_by` varies per table |

## 7. Refactoring opportunities (report only — NOT executed)

1. Unify frontend admin nav into one source (`modules/core/navigation.ts`), delete `lib/admin/navigation.ts`.
2. Unify backend validation into FormRequests (users, media, menus, faqs, homepage, timeline, updates, contact).
3. Either wire `i18n/messages` into a real i18n layer or delete them.
4. Consolidate API clients (`lib/api/client.ts` + `lib/admin/api.ts`).
5. Publish `config/filesystems.php` with explicit disk settings (private/public, serve flags).
6. Fix dashboard widget IDs/permissions (K-05..K-07) — functional debt, not refactor.
7. Remove stray files/dirs (K-25, K-26). (`SettingsSeeder_ADDITIONS` fragment already removed in Sprint 1.1.)
8. Decide fate of `lib/platform` — invest or document as dormant.
9. Add a route health endpoint contract shared by CI and docs.
10. Add `MAIL_ADMIN_ADDRESS` to `.env.example`; remove `cantactys@gmail.com` fallback or make it env-required. + closed — env documented in `.env.examples` + compose pass-through; hardcoded fallback removed; job warns and skips when unset.

| TD-38 | Pre-Sprint-7 rows with mixed-case emails exist? A one-off cleanup query (LOWER(email)) is safe � canonicalization now prevents new ones |
