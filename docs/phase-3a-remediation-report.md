# Phase 3A — Integration Remediation Report

- **Phase**: 3A (integration remediation — P1 only)
- **Author**: opencode (acting under Lead Engineer)
- **Date**: 2026-08-18
- **Scope**: the five P1 findings from `docs/phase-3-integration-report.md` (INT-001..INT-005)
- **Status of this deliverable**: complete — implementation, verification, and this report are done. **No commit, no push.** Handoff stops here for Lead Engineer review.

---

## 1. Non-Negotiable Rules Followed

| Rule | Compliance |
|---|---|
| No commit / no push | ✅ — tree untouched, working-directory changes only |
| No destructive DB commands (`migrate:fresh/refresh/reset`, reset scripts) | ✅ — nothing run against any database except the isolated `ys_api_test` suite |
| Backend authorization is the authority — never weakened | ✅ — zero `authorize()` changes; `PermissionCoverageTest` still green |
| Only the 5 confirmed P1 defects, smallest coherent fix | ✅ — every change traces to INT-001..005 |
| No unrelated refactors / cleanup | ✅ |
| Historical audit reports not modified | ✅ — `docs/phase-3-integration-report.md` untouched |
| STOP on ambiguity — ask Lead Engineer | ✅ — see Section 4 for the one decision point and its resolution |

---

## 2. Environment & Artifacts

- Backend: `ys-api` — Laravel 12, PostgreSQL (test DB `ys_api_test`)
- Frontend: `ys-web` — Next.js, Vitest (node environment), TypeScript strict, ESLint
- Baseline (Phase 2A): backend 417 tests / 2323 assertions; frontend 40 tests
- Phase 3 verdict being remediated: **C — operational, 5 P1 / 4 P2 / 6 P3 / 4 INFO**

---

## 3. Verification Gates

| Gate | Command | Result |
|---|---|---|
| Backend suite | `php artisan test` | ✅ **439 passed / 2414 assertions** (22 new) |
| Frontend suite | `npx vitest run` | ✅ **65 passed / 15 files** (25 new) |
| TypeScript | `npx tsc --noEmit` | ✅ clean |
| ESLint | `npx eslint <changed files>` | ✅ clean |
| Production build | `npm run build` | ✅ exit 0, 79/79 static pages (fetch warnings expected — API not running at build time; pages fall back) |

---

## 4. Summary of Findings & Decisions

| ID | Defect | Root cause | Status | Evidence |
|---|---|---|---|---|
| INT-001 | Menus contract failure | Frontend invented `name_en/name_ar`; loaded `data.items` while admin API returns raw models with `rootItems`; list page typed `title/items_count` that don't exist | **VERIFIED FIXED** | MenuTest 13, contract test 6, tsc clean |
| INT-002 | Homepage section types 8 vs 5 | **Inverted**: the public homepage renders `services/process/capabilities` sections, the backend `Rule::in` list omitted them | **VERIFIED FIXED** | HomepageSectionTest 5 |
| INT-003 | FAQ publishing lifecycle | Form never sent `status` → create action defaulted to `draft` → FAQ invisible publicly | **VERIFIED FIXED** | FaqStatusTest 4, contract test 2 |
| INT-004 | Role permission mapping | `permissions.ts` mapped Timeline/Feature Flags → `manage_settings`; docblock falsely claimed the real permissions don't exist | **VERIFIED FIXED** | core-permissions.test 4 (backend already pinned by PermissionCoverageTest) |
| INT-005 | Header search shell | SearchModal rendered an empty-state only; zero fetch logic | **VERIFIED FIXED** | search-state.test 13 |

**Decision point (resolved from code, per rule 6):** the Phase 3 audit noted the public `Menu` type declared `items` while the admin API returns `rootItems`. Tracing the PUBLIC endpoint proved it uses `MenuResource` → `items` with localized `title` (`ys-api/app/Http/Resources/Public/MenuResource.php`, `MenuItemResource.php`) — the public contract was **correct all along** (Footer/layout consume it correctly). Only the **admin** surface was broken. No public change was made.

---

## 5. INT-001 — Menus Contract (VERIFIED FIXED)

**Finding (from Phase 3):** `MenuForm` sent `name_en/name_ar` (no such columns — backend requires single `name`), and read `data.items` on edit while the admin API returns raw models with nested `rootItems` → editing never showed existing items; `menus/page.tsx` typed `{title, items_count}` against `{name, rootItems}` → list showed blank names and 0 items. Zero backend menu tests existed.

**Root cause:** the frontend was written against an imagined contract instead of the backend's (menus + separate menu-items resources).

**Remediation:**
- `ys-web/app/admin/menus/MenuForm.tsx` — rewritten: single `name` field; edit-load flattens `rootItems`+`children` (preserving `parent_id`); multi-step save (menu POST/PUT → item POST/PUT/DELETE per diff); on partial item failure it shows a count and navigates to the edit page so state is reviewable — never a silent inconsistency.
- `ys-web/lib/admin/menuItems.ts` (new) — pure `buildMenuSavePlan()` / `flattenMenuItems()` (node-testable).
- `ys-web/app/admin/menus/page.tsx` — contract-true rows: `name` + item count computed from `rootItems` (+children).
- `ys-api/tests/Feature/Admin/MenuTest.php` (new, 13 tests) — list/create/422 name/duplicate location/update/delete cascade/403 authorization; item lifecycle incl. `javascript:` URL rejection and parent persistence.
- `MenuFactory`, `MenuItemFactory` (new); `HasFactory` added to Menu/MenuItem models.

**Residual limitation (documented):** the form preserves existing hierarchies via `parent_id` but has no parent picker — new items are always root-level. This matches the pre-existing admin UI capability and is not a regression.

---

## 6. INT-002 — Homepage Section Types (VERIFIED FIXED)

**Finding (from Phase 3):** `HomepageSectionForm` offers 8 types, backend `Rule::in` accepts 5.

**Trace result (direction inverted):** the public homepage (`ys-web/app/[locale]/(public)/page.tsx:56-100`) actively looks up sections of type `hero, why_choose, products, services, process, capabilities, cta` — and `CapabilitiesSection`/`ServicesSection`/`HowWeWorkSection` are designed to render a CMS section when present. The backend simply never let admins create 3 of those. `stats` exists on both sides and is rendered nowhere — kept as-is (not a contract failure).

**Remediation (backend completion, not form trimming):**
- `ys-api/app/Http/Controllers/Admin/HomepageSectionController.php` — `TYPES` extended to `[hero, stats, why_choose, capabilities, services, products, process, cta]` (8 = 8), with a comment tying the list to the public page.
- `ys-api/tests/Feature/Admin/HomepageSectionTest.php` (new, 5 tests) — every rendered type creates (201); unknown type still 422; type update; 403 without `manage_homepage`; public endpoint returns only enabled+ordered.

---

## 7. INT-003 — FAQ Publishing Lifecycle (VERIFIED FIXED)

**Finding (from Phase 3):** `FaqForm` has no status field; `CreateFaqAction` defaulted omitted status to `draft`; the public endpoint only returns `published` → FAQs created in admin never appeared on the public page.

**Platform-convention check:** the faqs table default is `published` (`2025_01_01_000017…` migration comment), `FaqFactory` uses `published`, and `CmsSeeder` seeds `published` — the only outlier was the action's `?? 'draft'`. The backend's three-state lifecycle (draft/published/archived) is enforced by `Rule::in`, with no dedicated publish endpoints → a status select is the natural surface.

**Remediation:**
- `ys-web/lib/admin/faq.ts` (new) — `FAQ_STATUSES`, `DEFAULT_FAQ_STATUS = 'published'` (single source of truth).
- `ys-web/app/admin/faq/FaqForm.tsx` — status select (default published), always sent on save.
- `ys-web/app/admin/faq/[id]/page.tsx` — `status` now loaded into `initialData` (a draft could previously have been silently republished on edit).
- `ys-api/app/Domains/Cms/Actions/CreateFaqAction.php` — omitted status now defaults to `published`, matching the schema default/seeder/factory.
- `ys-api/tests/Feature/Admin/FaqStatusTest.php` (new, 4 tests) — create-without-status → published; draft stays hidden publicly; publish/unpublish round-trip via public endpoint; invalid status 422.
- `ys-web/tests/contracts/admin-faq-status.test.ts` (new) — pins default and the exact backend status set.

---

## 8. INT-004 — Role Permission Mapping (VERIFIED FIXED)

**Finding (from Phase 3):** `permissions.ts:29-30` mapped Timeline and Feature Flags to `manage_settings`; the docblock claimed `manage_timeline`/`manage_feature_flags` don't exist — verified false (TimelineController:27,46,78,99 and FeatureFlagController:24,42,80,115 authorize them).

**Re-verification performed:** every `authorize()` call across all backend controllers (24 unique strings) compared against `Permission.php` enum and all 21 UI groups — only Timeline and Feature Flags were wrong; the other 19 groups match exactly.

**Remediation:**
- `ys-web/modules/core/permissions.ts` — Timeline → `['manage_timeline']`, Feature Flags → `['manage_feature_flags']`; stale docblock rewritten to state the real contract.
- `ys-web/tests/contracts/core-permissions.test.ts` (new, 4 tests) — pins both mappings, ensures `manage_settings` no longer appears for them, keeps Settings on `manage_settings`, and every group non-empty.
- Backend side was already pinned by `PermissionCoverageTest` (`manage_settings` alone → 403 on both resources); still green.

---

## 9. INT-005 — Header Search Wiring (VERIFIED FIXED)

**Finding (from Phase 3):** the SearchModal in `Header.tsx` was a UI shell — input bound to state, permanent "Start typing…" empty state, zero fetch logic; `api.search()` had zero callers; backend `/public/search` (full-text, `throttle:search`, `q` min 2) was fully implemented.

**Remediation:**
- `ys-web/lib/search/state.ts` (new, pure) — reducer state machine (`idle → loading → results/empty/error`), `shouldFetchQuery()` (no empty/short/duplicate queries), `SEARCH_DEBOUNCE_MS = 300`, `SEARCH_MIN_QUERY_LENGTH = 2`, `buildSearchUrl()` mirroring `client.ts`, `ARROW`/`SET_ACTIVE` selection math.
- `ys-web/components/layout/Header.tsx` — SearchModal wired: debounced live fetch via `api.search()` (uncached, `revalidate: 0`), request-sequence guard for stale-response cancellation (the client's `request()` has no AbortSignal plumbing), loading spinner, no-results / error / results states, ↑/↓/Enter/Esc keyboard navigation, hover selection, click navigates via router, reset on open/close, combobox ARIA pattern.
- `ys-web/tests/contracts/search-state.test.ts` (new, 13 tests) — fetch gating, lifecycle transitions, selection bounds, constants, URL parity with the client.

**Client contract unchanged** — `api.search()` was already correct; only its first caller was added.

---

## 10. Regression Results

- **Backend full suite**: 439 passed / 2414 assertions (was 417/2323; +22 = 13 Menu + 5 Homepage + 4 FAQ-status). No failures, no skipped.
- **Frontend full suite**: 65 passed across 15 files (was 40; +25 = 6 menu-items + 2 faq-status + 4 permissions + 13 search-state).
- **TypeScript / ESLint / next build**: all clean; build exit 0 with 79/79 static pages.
- Existing contract regressions re-confirmed green: admin FAQ contract (ARCH-001), B2B scoping, permission coverage, XSS sanitization, auth escalation, search pushdown.

---

## 11. Files Changed (Phase 3A only)

Backend (`ys-api`):
- `app/Http/Controllers/Admin/HomepageSectionController.php` (TYPES completion)
- `app/Domains/Cms/Actions/CreateFaqAction.php` (default published)
- `app/Domains/Cms/Models/{Menu,MenuItem,HomepageSection}.php` (HasFactory)
- `database/factories/{MenuFactory,MenuItemFactory,HomepageSectionFactory}.php` (new)
- `tests/Feature/Admin/{MenuTest,HomepageSectionTest,FaqStatusTest}.php` (new)

Frontend (`ys-web`):
- `app/admin/menus/MenuForm.tsx` (rewrite), `app/admin/menus/page.tsx` (contract fix)
- `app/admin/faq/FaqForm.tsx`, `app/admin/faq/[id]/page.tsx` (status)
- `components/layout/Header.tsx` (search wiring)
- `lib/admin/menuItems.ts`, `lib/admin/faq.ts`, `lib/search/state.ts` (new pure modules)
- `tests/contracts/{admin-menu-items,admin-faq-status,core-permissions,search-state}.test.ts` (new)

`types/index.ts` was touched and reverted — the public Menu contract was verified correct and left unchanged (Section 4).

---

## 12. Final Decision

**Decision: B — RELEASE WITH RESERVATIONS.**

Rationale:
- All 5 P1 integration defects are **VERIFIED FIXED** with layered evidence: per-defect regression tests, unchanged contract tests, full-suite re-runs, and green build.
- The remaining known defects are the 4 P2 findings (INT-006 status page `version` undefined, INT-007 `revalidate: 60` on client.ts:31, INT-008 settings-page silent catches, INT-009 docs category update ignoring `product_id`) plus the P3/INFO backlog — all pre-existing, none blocking, none security-related, and none touched by this phase.
- Reservations carried into release: (1) menu item hierarchy has no parent picker (Section 5); (2) P2 items should be scheduled as the immediate next backlog; (3) no end-to-end browser test (this environment runs node-environment contract tests only) — manual smoke of the four admin surfaces (menus, homepage sections, FAQ status, header search) is recommended on staging before production promotion.

---

## 13. Handoff & Next Steps

- **For Lead Engineer**: review this report and the working tree; decide on commit/push of the Phase 3A change set (do not include the pre-existing uncommitted Phase 1A/2A/3 files unless intended).
- Recommended next backlog: Phase 3B = the 4 P2 findings (INT-006..009), each with the same verify-first discipline; then the P3 sweep (INT-010..015) opportunistically.
- No further automation work is performed after this report — this phase ends here.