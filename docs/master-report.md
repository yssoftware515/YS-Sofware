# Master Report — YS Systems Platform

**Date:** 2026-08-07 · **Phase:** Discovery only (no code changes) · **Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## 1. Platform Overview

YS Systems & Software operates a **bilingual (EN/AR) corporate website with a full admin CMS** built as a two-application monorepo:

- **`ys-api`** — Laravel 12 REST API (`/api/v1`): products, releases, documentation, roadmap, updates, careers, timeline, FAQ, menus, static pages, homepage sections, contact inbox, media library, users & roles, settings, feature flags, audit logs, customers & subscriptions. Auth via Sanctum, RBAC, product-scoped access, Postgres FTS search.
- **`ys-web`** — Next.js 16 frontend: public marketing site (SSR + 60s ISR, `/en` `/ar` RTL) and a permission-filtered admin panel backed by a dormant-but-present `lib/platform` module-kernel framework.
- **Infra** — Docker Compose (nginx, frontend, backend, PostgreSQL 16, Redis 7, queue worker, scheduler, mailhog, Grafana), GitHub Actions CI + release pipelines, GHCR images.

Maturity: feature-complete for content operations; billing is manual-entry only; several admin UI pages lack backend APIs; monitoring/backups/alerting exist only as scaffolding.

## 2. Technology Stack

| Layer | Tech | ✅ |
|---|---|---|
| Backend | Laravel 12, PHP ^8.4, Sanctum 4, mews/purifier, predis | composer.json |
| Database | PostgreSQL 16 (24 tables, UUID PKs, jsonb, FTS+GIN, RLS) | migrations |
| Cache/Queue | Redis 7 (cache + queue), database fallback | compose/.env |
| Frontend | Next.js ^16.2.9, React 19, TS 5.5, Tailwind 3.4, framer-motion, zustand, TanStack Query, zod, dompurify | package.json |
| Infra | Docker Compose, Nginx, Grafana (prod profile), GitHub Actions, GHCR | compose/.github |
| Tests | PHPUnit 11 (42 tests), Vitest (6, unreachable via npm) | files |

## 3. Folder Structure

See [project-structure.md](project-structure.md) — full verified map of both apps. Highlights: backend DDD (`app/Domains/{Auth,Billing,Cms,Content,Operations,Product,Search,System}`), frontend `app/[locale]/(public)`, `app/admin`, `lib/platform` (191 files), `modules/core`.

## 4. Existing Features

See [features.md](features.md). Core: bilingual product catalog + releases, documentation (nested categories, version tags), roadmap, updates (publish/unpublish), careers, timeline, FAQ, static pages, CMS menus, homepage sections, global FTS search, contact form (spam-scored, rate-limited, email-queued), media library (secured uploads), users/roles with product scoping, settings, feature flags, audit logs, customers/subscriptions (manual), SEO (sitemap/hreflang/JSON-LD/IndexNow), i18n EN/AR RTL, admin dashboard with 8 widgets.

## 5. Missing Features (verified absence)

- Password reset / forgot password (columns only)
- Email verification, MFA/2FA
- Backend for: sessions, login-history, api-tokens, notifications pages (frontend pages exist)
- Automated billing/payments (manual entries)
- Real monitoring dashboards/alerting, automated backups, DR runbooks
- Scheduled tasks (scheduler container runs, zero tasks)
- Public user accounts / multi-tenant features (none by design)
- S3/Meilisearch integrations (driver-ready only)

## 6. Security Status

Baseline is **good** (headers, rate limits, sanitization at write+render, fail-closed authz, immutable audit, Argon2id, server-side MIME checks). Top findings (full list: [security.md](security.md)):

- **S-01 (Critical):** hardcoded default admin password `YS515&Yahya` in `AdminUserSeeder.php` (committed source).
- **S-02/S-06/S-07 (High/Med):** default Grafana `admin` password, default DB creds `ys_user/secret` in templates.
- **S-04/S-05 (High):** no password reset, no MFA.
- **S-08 (Med):** Sanctum `expiration=null` — TTL not enforced server-side.
- **S-09 (Med):** admin route guard = cookie presence only.
- **S-11 (Med):** server-side HTML sanitization covers products + doc articles only (frontend renders everything else as plain text — safe today).
- **S-21 (Low-Med):** default disk `local` (`serve=true`) → unauthenticated public read of `storage/app/private`; signed PUT route requires APP_KEY knowledge.
- **S-22 (Low):** product-scope check missing on roadmap/updates/timeline controllers.
- **K-01..K-06:** 6 broken frontend→backend integrations (functional, not privilege issues).

## 7. Architecture Status

- Backend: clean DDD with Actions/DTOs; consistent JSON envelope; centralized middleware; two mixed idioms (FormRequests vs inline validate; Actions vs direct Eloquent) — see TD-20/TD-21.
- Frontend: healthy App Router structure; i18n is custom and undocumented-in-repo; `lib/platform` is a large parallel framework (dormant) — biggest architectural open question.
- Auth/Authorization: solid RBAC + fail-closed product scoping; frontend mirrors permissions in two places (drift risk).

## 8. Documentation Status

Old docs: 4/6 files outdated or misleading (JWT, MFA, health endpoints, auto-rollback, kernel mislocation). **Regenerated from scratch** (24 base files + 10 flow deep-dives in readiness review, all code-verified). Repo `README.md`/`SETUP.md` (3 files) remain outdated — flagged, owner to update.

## 9. Technical Debt

Top items ([technical-debt.md](technical-debt.md)): duplicated admin nav + permission lists; dead `i18n/messages/*.json`; `PermissionRepository` unused; ~~unused permissions (`view_financials`, `view_admin_activity`)~~ — resolved (`view_admin_activity` removed, `view_financials` wired + regression-tested); stray files/dirs committed (`replied`, `cls`, `id`, brace-named dir, test-command artifacts); mixed validation/write idioms; un-published `filesystems.php` config; dormant 191-file platform framework; frontend tests unreachable (no vitest dep/script); CI placeholder jobs; 2 git repos inside one monorepo.

## 10. Code Quality

- Backend: good — consistent shapes, closed enums, guards, docblocks explaining *why*; 42 tests pass coverage of core flows; Pint-formatable; N+1 guards in dev.
- Frontend: good component structure; typed API; sanitization discipline; but duplicated navigation, dead i18n files, no lint-blocking test pipeline; platform framework lacks integration tests with real APIs.
- Overall: above-average for a small team; the main risks are *drift* (docs/README, duplicated definitions) and *unreachable tooling* (vitest, phpstan absent).

## 11. Frontend ↔ Backend Consistency

| Type | Findings |
|---|---|
| Missing APIs | `/admin/sessions`, `/admin/login-history`, `/admin/api-tokens`, `/admin/notifications` (+`read-all`) — frontend pages, no routes (K-01..K-04) |
| Wrong paths | Dashboard widgets `/admin/faq` → `/admin/faqs`; `/admin/homepage` → `/admin/homepage-sections` (K-05/K-06) |
| Permission mismatches | Widget `manage_releases` (K-07); `manage_users` on roles index vs `manage_admins` (K-30) |
| Route mismatches | `/api/` nginx strip vs `NEXT_PUBLIC_API_URL` with `/api/v1` (K-20); CI health `/health/ready|live` vs backend `/api/v1/health` (K-19) |
| Data mismatches | README credentials/migration counts (K-11/K-12); health response shape (K-13) |
| Validations | Backend min:12 user creation vs min:8 login; frontend zod mirrors most shapes but no shared contract | ⚠️ |
| Unused APIs | ~~`view_financials`, `view_admin_activity`~~ — resolved (`view_admin_activity` removed, `view_financials` wired); `GET /up` used by nothing in app code | ✅ |

## 12. Performance Observations

- Good: GIN-indexed FTS, Redis-cached flags with stampede lock, ISR 60s, pagination, indexed hot paths, image optimization.
- Gaps: no backend response caching; `latestRelease` per-product query risk; dashboard 8 parallel fetches (2 always fail); Grafana unprovisioned; no load tests (P-1..P-8).

## 13. Risks

1. **Credential hygiene** (S-01, S-06, S-07) — source-visible admin password + default service creds.
2. **Deploy verification broken** (K-19) — every release deploy job fails at health check despite success.
3. **Docker API URL chain fragile** (K-20/K-21) — build-time env + nginx strip + dev default path = environment-dependent breakage.
4. **Dormant framework liability** (TD-23) — 191 files of unintegrated platform code (maintenance + security review burden).
5. **Documentation drift** — 3 committed README/SETUP files now out of date vs regenerated docs.
6. **Unreachable quality gates** — frontend tests & backend static analysis effectively never run in CI (K-23/K-24).
7. **Sessions/token model** — no server-side expiry; token TTL issuance-only (S-08).
8. **Product-scope gap** on roadmap/updates/timeline (S-22).
9. **Single-source-of-truth debt** — three nav/permission definitions; dead i18n files.
10. **No backups/monitoring** in production stack (only Grafana container).

## 14. Recommended Priorities (report only — not executed)

1. **P0 — Credentials:** rotate/seed admin password from env; force change on first login; change Grafana/DB defaults before any production use.
2. **P0 — Deploy reliability:** align CI health verify with real endpoints (`/api/v1/health` or `/up`); add explicit `php artisan migrate --force` step; document env-specific `NEXT_PUBLIC_API_URL` + nginx path contract.
3. **P1 — Fix broken integrations:** backend endpoints (or remove pages) for sessions/login-history/api-tokens/notifications; fix widget IDs/permission.
4. **P1 — Security hardening:** password reset flow; server-side token expiry enforcement; per-account lockout; MFA (at least for super admins); remove SVG from upload allow-list or serve safely.
5. **P1 — Docs sync:** update the three committed README/SETUP files to match code + new docs.
6. **P2 — Quality gates:** add vitest to package.json + `npm test`; wire real backend static analysis (phpstan/pint) into CI; make npm audit fail-on-high not `|| true`.
7. **P2 — Debt cleanup:** remove stray files; unify nav/permission sources; decide `lib/platform` fate; wire or delete `i18n/messages`.
8. **P3 — Ops:** provision Grafana dashboards + alerting; add backup strategy (pg_dump job); implement scheduled tasks or remove scheduler.

## 15. Questions for the Project Owner (❓)

1. Is `lib/platform` intended as the future architecture, or legacy scaffolding to be removed/ignored?
2. Are sessions / login-history / API-tokens / notifications planned backend features? If not, should the admin pages be removed?
3. What is the actual production topology (hosts, TLS termination, domain, DB hosting)? Where do migrations run in deploy?
4. Should health endpoints follow the old planned scheme (`/health/live`, `/ready`, `/startup`, `/deep`) or the current `/api/v1/health`?
5. Was `admin@ys-systems.com` / `YS515&Yahya` ever used in a live environment? (Rotation requirement.)
6. Who owns the Grafana/monitoring requirement, and what metrics matter?
7. Should the `/status` page and dashboard "System Status" widget reflect real health data?
8. Are the seeded demo products/FAQs/menus placeholders or real company content?
9. What is the release cadence and who operates releases (tag-based)?
10. Is `cantactys@gmail.com` (mail admin fallback) correct for production notifications?
