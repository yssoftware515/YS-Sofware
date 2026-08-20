# Phase 2A Report — Architecture & API Contract Remediation

**Date:** 2026-08-18 · **Scope:** confirmed Phase 2 findings ARCH-001..006, ARCH-009 · **Method:** code as source of truth; smallest clean changes; no new dependencies; Phase 1 security freeze respected (no auth/RLS/super-admin/subscription-isolation changes).

---

## 1. Executive Summary

All seven confirmed Phase 2 findings were remediated with minimal, contract-preserving changes, each pinned by new regression tests (18 backend + 19 frontend). Full verification is green: **backend 417 tests / 2323 assertions**, **frontend 40 tests**, `tsc --noEmit`, `eslint .`, and a **Next.js production build** all pass. Dead platform scaffolding (79 of 179 `lib/platform` files) was removed with an evidence-backed import graph and build-level proof. The Phase 2 report's ARCH-009 claim (that `manage_settings` was canonical for timeline/feature-flags) was **found to be incorrect in code** — dedicated permissions exist and are enforced; the bug was in the frontend navigation, now fixed. **Recommendation: READY** (no production blockers).

## 2. Findings Addressed

| Finding | Status | Remediation |
|---|---|---|
| ARCH-001 — Admin FAQ API returns raw models (no `question_en`/`question_ar`/`answer_*` on the wire); frontend crash on `question`/`answer` | ✅ | `Admin\FaqResource` on all four controller paths; contract tests |
| ARCH-002 — Customers/projects expose `created_by` (bare name); frontend reads it (never present) | ✅ | `creator` object `{id, name}` on the wire; `created_by` removed; contract tests |
| ARCH-003 — `/health` + dashboard health logic duplicated (controller :361-383 vs `routes/api.php`) | ✅ | `HealthCheckService` single source; `DashboardService` extraction; tests |
| ARCH-004 — Project validation duplicated (controller + `ProjectController@validate`), form semantic unvalidated | ✅ | `ProjectService::validate` + scoping asserts; tests |
| ARCH-005 — Admin API client untyped; repaired contracts not enforced at runtime | ✅ | zod schemas in `lib/schemas/admin.ts`, validated in `adminFetch`/`adminList`/`useAdminList`; pages repaired; contract tests |
| ARCH-006 — `lib/platform` contains provably unreachable scaffolding | ✅ | 79 files deleted (evidence §10) |
| ARCH-009 — nav permission mismatch | ✅ | `navigation.ts` → `manage_timeline` / `manage_feature_flags` (report's claim corrected) |

## 3. Exact Files Changed

**Backend (ys-api)**
- New: `app/Http/Resources/Admin/FaqResource.php`, `app/Domains/System/Services/HealthCheckService.php`, `app/Domains/System/Services/DashboardService.php`, `app/Domains/Operations/Services/ProjectService.php`
- Modified: `app/Http/Controllers/Admin/FaqController.php` (all 4 responses → FaqResource), `ProjectController.php` (payload `creator` object + `creator:id,name` loads; slimmed — 4 private methods removed, unused imports removed), `DashboardController.php` (rewritten thin, 28 lines, injects DashboardService), `routes/api.php` (`/health` closure uses HealthCheckService)

**Frontend (ys-web)**
- New: `lib/schemas/admin.ts`, `tests/contracts/admin-faq.test.ts`, `admin-customer.test.ts`, `admin-project.test.ts`, `api-client.test.ts`
- Modified: `lib/admin/api.ts` (FetchOptions `schema?: ZodType<T>`; parse body.data; adminList per-item parse), `lib/hooks/useAdminResource.ts` (useAdminList schema opt), `app/admin/faq/page.tsx`, `app/admin/faq/[id]/page.tsx` (rewritten — direct `question_en` mapping, `(data as any)` casts removed), `app/admin/customers/[id]/page.tsx`, `app/admin/projects/[id]/page.tsx`, `modules/core/navigation.ts`

**Docs** — see §11.

## 4. Architecture Decisions

1. **Admin FAQ contract is bilingual-by-field** (`question_en/ar`, `answer_en/ar`, `highlight_en/ar`) via a dedicated `Admin\FaqResource`. The **public** contract (`Public\FaqResource`, localized `question`/`answer`) is **unchanged** — code proved the two surfaces serve different consumers.
2. **Canonical creator contract:** `creator` object `{id, name}`, `null` when relation not loaded; `created_by` never on the wire (matches the 6 existing Admin resources that already used `creator`).
3. **Service extraction** followed the existing convention (`final class` + docblocks; cross-domain services in `App\Domains\System\Services` like `AuditService`). `HealthCheckService::checks()` is the single source for DB+cache probing; `DashboardService::stats()` owns the full metrics/health/attention/recent logic. HTTP semantics preserved exactly (same 422/403 aborts, same payload keys).
4. **Frontend runtime validation:** one zod schema per repaired contract, shared by the API client (`adminFetch`/`adminList`) and hooks (`useAdminList`), so any future backend contract drift fails loudly. Pages consume inferred types — no page-local API types remain for the repaired contracts.
5. **ARCH-006 deletion criterion:** a file was deleted only if **provably unreachable** — zero inbound imports from outside `lib/platform`, zero from within reachable files (transitive closure), no dynamic/side-effect imports, no config/root-file references. Reachability was computed by a scripted import-graph walk over all 195 external TS/TSX files (app/components/modules/lib/tests/types) plus root/config scan; `lib/platform` went 179 → 100 files.

## 5. API Contract Changes

- `GET/POST /admin/faqs`, `GET/PUT/DELETE /admin/faqs/{faq}` → items now `{id, question_en, question_ar, answer_en, answer_ar, highlight_en, highlight_ar, category, status, sort_order, creator|null, created_at, updated_at, deleted_at}`.
- Customers and projects (list/show/store/update) → `creator` object replaces bare-name `created_by` (removed). Store responses include the creator (relation loaded).
- `/health` and dashboard health payload shape unchanged (`{status, version, checks}` / `health` block) — implementation moved to `HealthCheckService`, shape pinned by `HealthContractTest` and `DashboardServiceTest`.
- **No other endpoint payloads or status codes changed.** Pagination caps, filters, throttles untouched.

## 6. Tests Added / Updated

**Backend (18 new, all green):**
- `tests/Feature/Admin/FaqContractTest.php` — 3: index payload shape + no localized `question`/`answer` keys; show with `creator`; store response contract.
- `tests/Feature/Admin/CreatorContractTest.php` — 4: customer show; project show; project index rows (`creator` present, `created_by` absent); project store includes creator.
- `tests/Feature/Admin/ProjectServiceTest.php` — 7: validation accept/reject (incl. expected-completion-before-start message), 422 request/customer mismatch, unlinked project allowed, scoped customer 403, global customer allowed for super admin, scoped project 403.
- `tests/Feature/Admin/DashboardServiceTest.php` — 3: super-admin stats envelope; scoped-admin gating (no cross-scope leakage); health block matches public `/health` contract.
- Affected pre-existing suites re-run: 110 tests green (ProjectTest, ProjectLifecycleTest, DashboardTest, HealthContractTest, ContactRequestProjectTest, B2BProductScopingTest, XssSanitizationTest, CustomerOperationsTest, CustomerIdentityTest, PermissionCoverageTest, ContactRequestCustomerTest).

**Frontend (19 new, all green):** `tests/contracts/` — admin-faq (5), admin-customer (5), admin-project (4), api-client (5, fetch stubbed via `vi.stubGlobal`). The tests pin: schema shapes, acceptance of valid wire payloads, rejection of missing required fields, stripping of the legacy `created_by` key (zod drops unknown keys — pages typed as `AdminCustomerDetail` cannot read it at compile time), client validation behavior.

**Intentional test notes:** no pre-existing tests were weakened or deleted. `creator` is legitimately optional on the wire (relation not always loaded), so tests assert absence of `created_by` on parsed output rather than parse rejection.

## 7. Full Verification Results

| Check | Result |
|---|---|
| Backend full suite `php artisan test` | ✅ 417 passed / 2323 assertions |
| Backend targeted suites (11 classes) | ✅ 110 passed |
| `php -l` on all changed PHP files | ✅ |
| Frontend full suite `npx vitest run` | ✅ 40 passed / 11 files |
| `npm run type-check` (`tsc --noEmit`) | ✅ exit 0 |
| `npm run lint` (`eslint .`) | ✅ exit 0 |
| `npm run build` (Next.js production build, Next 16) | ✅ exit 0 |
| Post-deletion verification (after ARCH-006) | ✅ type-check/lint/tests/build re-run green |
| Cross-check: nav permissions vs backend `authorize()` calls | ✅ all 20 nav permissions exist as gates; timeline/feature-flags fixed |
| Grep: `created_by` in ys-web | ✅ only in regression tests (asserting absence) |
| Grep: admin FAQ `question`/`answer` misuse | ✅ none |
| Grep: duplicate health implementations | ✅ none (`HealthCheckService` single source) |
| Grep: page-local types duplicating repaired contracts | ✅ none for FAQ/CustomerDetail/ProjectDetail |

## 8. Remaining Findings

- **SEC-06 (production infrastructure verification)** remains `PENDING PRODUCTION INFRASTRUCTURE VERIFICATION` — no claim of production verification is made from repo evidence.
- Historical audit/sprint reports still describe the pre-Phase-2A state (e.g., `security-audit-report-deep.md` VULN-10, `technical-debt.md` TD-18 "191 files", `performance.md` P-8). Kept as audit trail; living docs updated (§11).

## 9. Deferred Findings (out of Phase 2A scope)

- Local API interfaces remain in `app/admin/contact-requests/*` (×2), `app/admin/customers/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/users/page.tsx` — contracts not part of the repaired set (ARCH-001/002/005). Candidate for a future "schema-ize all admin contracts" pass.
- `manage_releases` widget permission (widgets.ts) still not a backend permission (releases gated by `manage_products`) — pre-existing, unchanged.
- `view_admin_activity` / `view_financials` gates still have no controller call sites (granted to `admin` role; dashboard financials deliberately remain gated by `view_projects`/`view_customers` per existing behavior) — pre-existing, unchanged.
- The 4 admin pages calling non-existent APIs (`sessions`, `login-history`, `api-tokens`, `notifications`) and 2 wrong dashboard widget paths (`/admin/faq`, `/admin/homepage`) — pre-existing, tracked in `known-issues.md`.

## 10. Files Deleted + Deletion Evidence

**79 files deleted from `ys-web/lib/platform/` (179 → 100).** Full list captured at `C:\Users\yehia\AppData\Local\Temp\opencode\arch006-deleted.txt` and visible in `git status` (D entries). Evidence method: scripted import-graph walk (`platform-graph.ps1`) — seeds = every import of `lib/platform` from all 195 external TS/TSX files; BFS through internal imports resolving `.ts`/`.tsx`/`index.*`; supplemented by scans for dynamic `import()` (static strings), template-literal/backtick imports, side-effect imports (`import './x'`), root/config files (next/vitest/tsconfig/package), `scripts/`, and non-TS files. Zero references found for any deleted file. Deleted categories: `adapters/` (16), `hooks/` (10), `sdk/` (3), `cli/` (2), `testing/` (2), `security/csrf.ts`, all unused `*/index.ts` barrels incl. the root `index.ts` (35). **All 100 remaining files are reachable from app code or `tests/platform/*`.** Proof: full type-check, lint, 40-test suite, and production build all green after deletion (any false negative would have failed compilation).

## 11. Documentation Updated / Deleted

Updated (living docs only; historical reports intentionally left as audit trail):
- `docs/api.md` — Timeline → `manage_timeline`, Feature Flags → `manage_feature_flags`; added FAQ contract note (bilingual fields + unchanged public contract); added missing Projects section + `creator` contract note.
- `docs/roles-permissions.md` — permission catalog split (`manage_settings`/`manage_timeline`/`manage_feature_flags`); admin role list corrected (adds manage_timeline, manage_feature_flags, view_financials); gate list corrected to "every enum value has a gate"; nav cross-check marked ✅ 2026-08-18.
- `docs/authorization.md` — Layer 2 gates paragraph corrected (all 28 gates defined; view-variants via `hasAnyPermission`).
- `docs/features.md` — timeline/feature-flags permission columns corrected.
- `docs/frontend.md` — `lib/platform` 191→100 files + cleanup note; reality-check updated (every remaining file reachable); vitest/scripts claim corrected (declared in package.json); stale `lib/admin/navigation.ts` claim removed (file does not exist; `modules/core/navigation.ts` is the single source).
- `docs/architecture.md` — platform framework file count corrected.

Deleted: none.

## 12. Security Regression Status

Phase 1 security freeze honored — **no changes** to auth, Sanctum, cookies, idle timeout, CSP/JSON-LD, super-admin model, role protections, or subscription isolation. All security regression suites green in the full run: `UserPrivilegeEscalationTest`, `RoleAccessTest`, `SubscriptionTest`, `PermissionCoverageTest`, `XssSanitizationTest`, `RequireTlsTest`, `TrustedProxyRateLimitTest` (subset of the 417). `PermissionCoverageTest` continues to assert that every permission granted to seeded roles has a gate — still green after the timeline/feature-flags nav fix. SEC-06 unchanged (pending production infrastructure).

## 13. Production Blockers

**None.** No schema migrations were added; no deployment steps changed; no dependencies added; production build succeeds. Remaining known issues (§9) are pre-existing feature gaps, not blockers.

## 14. Final Recommendation

**READY.**

Phase 2A remediated all confirmed findings with evidence-backed changes and pinned every repair with regression tests on both sides of the contract. The one factual error in the Phase 2 report (ARCH-009) was discovered by code inspection and corrected rather than propagated. The Phase 1A change set and this Phase 2A change set remain **uncommitted** in the working tree (114 files changed total) — committing is the next step, per the Lead Engineer's commit policy.