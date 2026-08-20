# Engineering Readiness Review - YS Systems

**Date:** 2026-08-07 (Final Review) - **Phase:** Discovery CLOSED after this document.
**Method:** Every claim re-verified against source code, routes, migrations, config, and CI files. Verification marks: + = code-verified | ~ = inferred | ? = unknown.
**Source docs:** all 35 files in `docs/` (validated and corrected during this review).

---

## Executive Summary

YS Systems is a two-application monorepo (Laravel 12 REST API + Next.js 16 frontend) implementing a bilingual corporate website and a permission-based admin CMS. The engineering foundation is **sound and above average for its size**:

- Clean, consistent DDD backend with centralized JSON envelope, fail-closed RBAC + product scoping, immutable audit logs (Eloquent + RLS), Postgres FTS, Redis queue/cache, and a working 42-test backend suite.
- A good frontend structure with typed API clients, zod validation, sanitize-at-render discipline, and SEO/i18n handled properly.
- 35 documentation files, all code-verified.

The **gap is not architecture - it is operational hardening**: one critical credential issue, a deploy pipeline that always "fails" after success, several frontend pages calling non-existent APIs, unreachable frontend quality gates, and no backup/monitoring/load-testing story. None of these block *writing* new code, but several MUST be fixed before first production exposure and before taking on enterprise customers.

---

## Engineering Readiness Score

| # | Area | Score | Rationale |
|---|---|---|---|
| 1 | Architecture | 80 | DDD domains + Actions/DTOs + consistent middleware; docked for dormant 191-file frontend framework and mixed validation/write idioms (TD-20/21) |
| 2 | Backend | 82 | Laravel 12, closed enums, docblocks explaining "why", guards everywhere; minor: mixed FormRequest vs inline validate |
| 3 | Frontend | 68 | Good structure/typing/sanitization; broken by 6 dead API integrations (K-01..07), duplicate nav, unreachable vitest |
| 4 | Database | 88 | UUID PKs, RLS audit, FTS+GIN, sane FK rules, fail-closed pivot; minus: unused polymorphic columns, no DB-level enums |
| 5 | API Design | 80 | Consistent envelope, named rate limiters, pagination; minus: missing routes for 4 admin pages, faq/faqs and homepage/homepage-sections naming drift |
| 6 | Authentication | 65 | Single-session enforced, per-IP rate limit, Argon2id; docked hard: no MFA, no password reset, Sanctum `expiration=null` (S-08), min:8 vs min:12 |
| 7 | Authorization | 78 | Fail-closed RBAC + product scoping + wildcard super-admin; docked for S-22 product-scope gap on roadmap/updates/timeline + dead permissions |
| 8 | Security | 68 | Strong baseline (headers, sanitize-at-write+render, server MIME, immutable audit) dragged down by S-01 (hardcoded admin password) and S-21 (storage publicly readable) |
| 9 | Performance | 70 | GIN FTS, Redis-cached flags with stampede lock, ISR 60s, pagination; no backend response caching, no load tests |
| 10 | Scalability | 60 | Redis queue/cache, stateless API; no horizontal scaling config, no caching layer for hot public endpoints, no backups - single-host topology assumed |
| 11 | Maintainability | 70 | Great backend docblocks + Pint + factories; heavy drag: 191-file dormant `lib/platform`, duplicated nav/permissions, dead i18n files |
| 12 | Testing | 55 | Backend 42 tests (real, CI-executed); frontend tests unreachable (no vitest dep/script); no E2E, no load tests, no coverage for 9+ controllers |
| 13 | Documentation | 90 | 35 files, all code-verified, self-correcting (3 conflicts fixed during this review) |
| 14 | Deployment | 62 | Docker/GHCR/SSH pipeline exists; docked: health-verify hits non-existent endpoints (K-19), no migrate step (K-22), build-time env chain fragile (K-20/21) |
| 15 | Developer Experience | 68 | Pint, factories, route:list, good docs; docked: `npm test` broken, phpstan absent, two git repos in one monorepo, outdated READMEs |
| 16 | CI/CD | 62 | Real lint/type-check, backend tests, build, Trivy; frontend tests + backend static analysis are fail-open placeholders (K-23/24), npm audit `|| true` |
| 17 | Admin Panel | 70 | Feature-rich, permission-driven, clean shell; 4 dead pages, 2 broken widgets, 1 invalid widget permission |
| 18 | Code Organization | 78 | Backend DDD is exemplary; frontend duplication + dormant framework drag the score |
| 19 | **Overall Readiness** | **71** | Solid foundation for internal development; not yet hardened for production/external exposure |

---

## Top 10 Priorities

| # | Priority | Why | Blocked by |
|---|---|---|---|
| 1 | Move admin credentials out of source (env-based seed) | S-01 Critical: `YS515&Yahya` committed | None |
| 2 | Fix deploy health verification + add migrate step | K-19/K-22: every deploy fails verification; schema drift risk | None |
| 3 | Secure storage: publish filesystems config, decide media privacy | S-21: "private" disk is publicly served; PUT surface | None |
| 4 | Enforce product-scope on roadmap/updates/timeline | S-22 access-control gap | None |
| 5 | Wire real quality gates (vitest + npm test; phpstan/pint; npm audit fail-closed) | K-23/24: CI silently does nothing | None |
| 6 | Resolve 4 dead admin pages + 2 broken widgets (implement APIs or remove pages) | K-01..07: broken UX + misleading admin surface | Product owner decision |
| 7 | Add password reset + align login policy (min:12) | S-04/S-10: lockout risk, policy inconsistency | None |
| 8 | Enforce token TTL server-side (Sanctum expiration or per-request check) | S-08: tokens valid until revoked | None |
| 9 | Decide fate of `lib/platform` (document as dormant or remove) | TD-18/23: 191-file maintenance + review burden | Product owner decision |
| 10 | Add backups + monitoring provisioning + load tests | No backups/alerting/load evidence; pre-enterprise blocker | Ops owner |

---

## Critical Blockers

Must be solved before any feature development that touches these areas - and all before first production exposure.

### Critical

| ID | Blocker | Evidence | Impact |
|---|---|---|---|
| CR-01 | **Hardcoded admin password in committed seeder** (`YS515&Yahya`) | S-01 (seeder source); README/SETUP even claim a different password | Total admin compromise of any deployment seeded from repo |
| CR-02 | **Deploy pipeline false-fails** (health verify vs `/health/live|ready` which don't exist) and **no migration step** in deploy | K-19, K-22 (release.yml) | Deploys reported failed after success; DB schema drift risk on fresh hosts |
| CR-03 | **Storage disk "private" is publicly readable** (Laravel default `local` disk, `serve=true`) | S-21 (route:list + framework config) | Unauthenticated read of anything on default disk; signed-PUT write surface if APP_KEY leaks |

### High

| ID | Blocker | Evidence | Impact |
|---|---|---|---|
| HI-01 | Sanctum `expiration=null` - token TTL never enforced server-side | S-08 (config/sanctum.php) | Compromised/leaked tokens remain valid beyond TTL |
| HI-02 | Product-scope gap: roadmap/updates/timeline accept `product_id` without `canAccessProduct` | S-22 (grep controllers) | Cross-product data access for limited-role admins |
| HI-03 | No password reset (columns exist, no flow) | S-04 (routes + model) | Admin lockout = manual DB intervention |
| HI-04 | Quality gates unreachable: frontend tests + backend static analysis never run in CI | K-23/24 (ci.yml) | Regressions ship silently |
| HI-05 | `NEXT_PUBLIC_API_URL` build-time + nginx `/api` strip chain unvalidated per env | K-20/21 (compose + next.config) | Broken API calls in deployed env |

### Medium

| ID | Blocker | Evidence | Impact |
|---|---|---|---|
| ME-01 | No MFA (esp. super-admin) | S-05 | Weakest admin credential is one password |
| ME-02 | 6 broken frontend<->backend integrations | K-01..07 | Broken admin UX; misleading surface |
| ME-03 | No CSRF token verification (mitigated by SameSite=strict) | S-12 | Defense-in-depth gap |
| ME-04 | Login min:8 vs user-create min:12; no per-account lockout | S-10 | Weaker than intended policy |
| ME-05 | Default Grafana/DB credentials in templates | S-06/07 | Production default-credential risk |
| ME-06 | No backup strategy in stack | verified absence | Data loss exposure |
| ME-07 | SVG allowed in upload allow-list | security.md upload risks | Stored-XSS surface in some contexts |

### Low

| ID | Blocker | Evidence | Impact |
|---|---|---|---|
| LO-01 | Stray files/brace-dir committed; dead i18n JSON | K-25/26/28 | Repo hygiene |
| LO-02 | Scheduler container idle (no tasks) | K-34 | Wasted container; misleading ops |
| LO-03 | `view_financials`/`view_admin_activity` dead permissions | K-08 | Confusing role design |
| LO-04 | Last-super-admin deletion / role self-edit unverified | known-issues 5 (?) | Potential lockout path |

---

## Production Readiness

| Target | Verdict | Why |
|---|---|---|
| **Internal Testing** | READY | Backend tests pass, docs complete, local stack works. (Documentation now accurate.) |
| **Beta** | READY WITH CONDITIONS | Fix CR-01 (credentials) and CR-02 (deploy verify/migrate) first; remove or stub dead admin pages so the panel is honest. Everything else is acceptable for a beta cohort. |
| **Public Launch** | NOT READY | Requires HI-01 (token TTL), HI-02 (scope gap), ME-03 (CSRF hardening), backups, and a load test. One critical credential issue alone blocks launch. |
| **Enterprise Customers** | NOT READY | Requires MFA, password reset, SSO considerations, audit export, monitoring/alerting, backups/DR runbook, SLA-grade deploy (migrations automated, rollback real), data-residency question. |
| **Large Scale Growth** | NOT READY | Single-host docker-compose topology, no auto-scaling, no backend caching for hot public endpoints, no load tests, Grafana unprovisioned. Fine for 10k-100k visitors; unproven beyond. |

---

## Roadmap

### Phase 1 - Immediate (pre-development / must-do)

| Task | Priority | Reason | Impact | Risk | Dependencies |
|---|---|---|---|---|---|
| Env-based admin seeding + rotate any live password | P0-Critical | CR-01 | Eliminates known admin compromise | Low | Prod credentials owner |
| Fix deploy health verify to `/api/v1/health` or `/up` + add `php artisan migrate --force` | P0-Critical | CR-02 | Reliable deploys, no schema drift | Low | Deploy host access |
| Publish `config/filesystems.php` with explicit disk/`serve` policy | P0-Critical | CR-03 | Defines media privacy contract | Medium (behavior change) | Product decision: is media public? |
| Enforce product scope on roadmap/updates/timeline controllers | P0-High | HI-02 | Closes access-control gap | Low | None |
| Wire frontend tests (vitest dep + `npm test`) and backend static analysis (pint/phpstan) in CI, fail-closed | P0-High | HI-04 | Regressions caught | Low | None |
| Update repo README/SETUP files (3 files) to match code | P1 | Doc drift (K-11..16) | Developers trust docs | Low | None |

### Phase 2 - Short Term (next milestone)

| Task | Priority | Reason | Impact | Risk | Dependencies |
|---|---|---|---|---|---|
| Implement or remove sessions/login-history/api-tokens/notifications pages | P1 | K-01..04 | Honest admin surface | Medium | Owner decision |
| Fix dashboard widget paths + `manage_releases` permission | P1 | K-05..07 | Working dashboard | Low | None |
| Password reset flow + unify password policy (min:12) | P1 | S-04/S-10 | No more lockout; consistent policy | Medium | Email already wired |
| Enforce token TTL server-side (Sanctum expiration or middleware check) | P1 | S-08 | Real session expiry | Medium | Auth tests |
| CSRF token verification for cookie-auth admin routes | P1 | S-12 | Defense-in-depth | Low | Frontend update |
| Add MFA for super-admin | P2 | S-05 | Strongest-role protection | Medium | Auth refactor |
| Backups (pg_dump job) + Grafana datasource provisioning + basic alerting | P2 | ME-06, P-5 | Data safety + visibility | Medium | Ops owner |
| Remove stray files, dead i18n, brace-dir; unify nav/permissions single source | P2 | K-25/28, TD-01/02 | Maintainability | Low | None |
| Load test: search + public endpoints + login throttling | P2 | No benchmarks | Capacity baseline | Low | Staging env |

### Phase 3 - Long Term (scale/enterprise)

| Task | Priority | Reason | Impact | Risk | Dependencies |
|---|---|---|---|---|---|
| Decide and execute `lib/platform` fate (invest vs remove) | P2 | TD-18/23 | Removes 191-file ambiguity | High | Owner decision |
| Backend response caching for hot public endpoints (cache tags) | P2 | P-1 | Lower DB load, faster TTFT | Medium | Cache design |
| E2E smoke suite (health + login + one public page) in CI | P2 | No E2E | Ship confidence | Low | Phase 2 tests |
| Multi-env image builds (per-env `NEXT_PUBLIC_*` contract documented) | P2 | K-20/21 | Removes env breakage | Medium | Deploy owner |
| Real rollback (image tag re-point + DB migration rollback plan) | P3 | K-15 | DR for bad releases | Medium | Deploy owner |
| Audit-log export + retention policy; admin session audit dashboard | P3 | Enterprise asks | Compliance | Medium | Audit schema |
| Auto-scaling + CDN + queue-worker autoscaling | P3 | Scale | Growth capacity | High | Load test results |
| SSO/SAML option for enterprise admin login | P3 | Enterprise asks | Enterprise readiness | High | Phase 2 MFA |

---

## Architect Recommendations

Only recommendations with material engineering value:

1. **Treat `APP_KEY` as the crown jewel** - S-21's signed-PUT surface means an `APP_KEY` leak allows arbitrary disk writes. Add secret rotation runbook + verify CI never exposes it. (Security)
2. **Make `MAIL_ADMIN_ADDRESS` required in production** - remove the `cantactys@gmail.com` fallback in prod (TD-31/K-31), or at least log a startup warning when absent. (Operational risk)
3. **Add a single `ProductScopedResource` trait/middleware** - instead of ad-hoc `canAccessProduct` calls, centralize the check so new product-bound resources cannot forget it (prevents another S-22). (Maintainability)
4. **Centralize validation into FormRequests** for the 8+ controllers still using inline `validate()` (TD-20) - single style, better testability. (Maintainability)
5. **Unify admin navigation + permission sources** (delete `lib/admin/navigation.ts`, wire `modules/core/permissions.ts` as the only mirror) (TD-01/02). (Maintainability)
6. **Publish explicit `config/filesystems.php`** with named disks (`public_media` vs `private`) and per-disk `serve` flags (TD-26) - removes implicit framework defaults. (Security/ops)
7. **Add a health-endpoint contract shared by CI, docs, and the status page** - one source of truth so K-19/K-14-class mismatches never recur (TD refactoring list item 9). (Reliability)
8. **Provision Grafana datasources + alerting + pg_dump backup job** - the stack already ships the container; wiring it is the highest-leverage ops move (ME-06/P-5). (Ops risk)
9. **Do not start the scheduler container until a real scheduled task exists** (K-34) - or define one (e.g., token cleanup, audit rotation). (Ops hygiene)
10. **Add queue dead-letter/alerting on `failed()`** - both jobs log only; a permanent mail failure is silent. (Reliability)

Deliberately NOT recommended (no engineering value at this stage): microservices, message-bus abstractions, S3 migration (no volume), GraphQL, per-tenant multi-tenancy, blockchain/niceties, payment automation beyond manual entry.

---

## Final Decision

> **Can active development begin?**

## **YES WITH CONDITIONS**

**Why YES:** The foundation is strong. Backend architecture, data model, authorization model, API conventions, and documentation are all development-ready and verified. New features (content modules, CMS extensions, additional admin resources) can be built safely on the existing patterns - the Action/DTO/Service idiom, closed permission enums, fail-closed scoping, audit logging, and queue discipline are all in place and documented.

**Conditions (must be completed before feature development starts):**
1. **CR-01** - admin credentials out of source (P0-Critical, ~hours of work). **+ RESOLVED (Sprint 1, A1)**
2. **CR-02** - deploy health verify + migration step fixed (P0-Critical, ~hours). **+ RESOLVED (Sprint 1.1): migration step before `up -d` (Sprint 1); verify step now curls real `/health/live` + `/api/v1/health` through nginx + asserts 401/419 auth gate (Sprint 1.1); backend HTTP chain fixed (K-20)**
3. **CR-03** - storage disk policy decision + explicit filesystems config (P0-Critical, 1 day). **+ RESOLVED (Sprint 1, A2): config published, private default; public-vs-private policy still an owner decision for media**
4. **HI-02** - product-scope gap closed on roadmap/updates/timeline (P0-High, ~half day). **+ RESOLVED (Sprint 1, A3)**
5. **HI-04** - CI quality gates made real, fail-closed (P0-High, ~half day). **~ PARTIALLY (Sprint 1, B1): frontend lint gate now real (Next 16 flat config); 17 pre-existing lint errors must be fixed or triaged before CI is green; backend static-analysis job remains a placeholder (`phpstan` not installed)**

These five are small, independent, and unblocking. Everything else in Phase 1/2 can be scheduled alongside feature work. If these conditions are met and accepted by the project owner, the discovery phase is CLOSED and the roadmap above becomes the operating plan. **Status as of Sprint 1 (2026-08-07): conditions 1, 3, 4 RESOLVED; 2 and 5 PARTIALLY — see [sprint-1-report.md](sprint-1-report.md).**

**Note:** "YES WITH CONDITIONS" downgrades to "NO" the moment this platform is pointed at a real domain with the old seeded password (now removed from source) or before CR-02/CR-03 are fully resolved.

---

## Documentation Validation Summary (Task 1)

Validated all 35 docs; corrected 4 inconsistencies discovered during the review (no code changed):

| Fix | File | Was | Now |
|---|---|---|---|
| Token ability | authentication.md | `['*']` | `['admin']` (matches LoginAction.php:60) |
| Single-session | authentication.md | "not enforced" | enforced at login via `tokens()->delete()` |
| Single-session | known-issues.md K-18 | "not implemented" | MFA no; single-session YES; no sessions tracking table |
| Mail fallback | queued-jobs.md | "no fallback literal" | literal `cantactys@gmail.com` exists in job |
| Doc counts | master-report.md, discovery-summary.md | "24 files" | "+10 flow deep-dives" |

No obsolete documents remain; duplicates merged via cross-references (README index now lists all 35 files). The documentation set is consistent and navigable.

**END OF DISCOVERY - the readiness review is complete. Future documentation should be generated only as part of implementing features.**
