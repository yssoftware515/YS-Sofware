# YS Systems & Software — Platform Documentation

**Platform:** YS Systems corporate website + admin CMS platform
**Generated:** 2026-08-07 (Discovery Phase — regenerated from scratch; +10 flow deep-dives + final readiness review)
**Source of truth:** The source code (`ys-api/`, `ys-web/`). All statements are marked:

- ✅ Verified from source code / runtime configuration
- ⚠️ Inferred (reason given)
- ❓ Unknown

---

## What this platform is

The YS Systems platform is a **bilingual (EN/AR) corporate website with an admin CMS**:

- **`ys-api/`** — Laravel 12 backend (REST API, PostgreSQL, Redis, Sanctum auth, RBAC)
- **`ys-web/`** — Next.js 16 frontend (public marketing site + admin panel)
- **`docker/`** — Nginx reverse proxy configuration
- **`.github/workflows/`** — CI and release pipelines (GitHub Actions)
- **`docker-compose.yml`** — full local/cloud stack (frontend, backend, PostgreSQL 16, Redis 7, nginx, queue worker, scheduler, Mailhog dev, Grafana)

The platform provides public-facing content (products, documentation, roadmap, updates, careers, FAQ, static pages, contact form, search) and a permission-based admin CMS (products, releases, docs, roadmap, updates, careers, timeline, contact requests, media, users, roles, settings, feature flags, static pages, FAQs, menus, homepage sections, audit logs, customers, subscriptions).

---

## Documentation Index

| Document | Contents |
|---|---|
| [architecture.md](architecture.md) | System architecture, design, data flow |
| [project-structure.md](project-structure.md) | Full folder map of both applications |
| [backend.md](backend.md) | Laravel API: domains, controllers, services, middleware |
| [frontend.md](frontend.md) | Next.js frontend: pages, components, lib, platform framework |
| [database.md](database.md) | All 29 migrations: tables, columns, constraints |
| [database-relations.md](database-relations.md) | Entity relationships diagram + notes |
| [api.md](api.md) | Complete verified API route reference |
| [authentication.md](authentication.md) | Auth flow, tokens, cookies, rate limits |
| [authorization.md](authorization.md) | Gates, policies, product-scoping, fail-closed model |
| [roles-permissions.md](roles-permissions.md) | Roles, permission catalog, seed data |
| [features.md](features.md) | Every implemented feature, per module |
| [admin-panel.md](admin-panel.md) | Admin UI routes, nav, widgets, platform kernel usage |
| [public-website.md](public-website.md) | Public site pages, i18n, CMS-driven content |
| [configuration.md](configuration.md) | Every config file and env variable |
| [deployment.md](deployment.md) | Docker, CI/CD pipelines, environments |
| [security.md](security.md) | Security review — findings and risk levels |
| [performance.md](performance.md) | Performance observations, caching, search |
| [seo.md](seo.md) | SEO: metadata, sitemap, robots, structured data, IndexNow |
| [dependencies.md](dependencies.md) | Frontend + backend dependency inventory |
| [known-issues.md](known-issues.md) | Known bugs, broken integrations, mismatches |
| [technical-debt.md](technical-debt.md) | Duplication, dead code, architecture smells |
| [documentation-report.md](documentation-report.md) | Accuracy report of the OLD docs vs. code |
| [discovery-summary.md](discovery-summary.md) | Discovery process summary + unknowns |
| [master-report.md](master-report.md) | Master report (15 sections, project-owner questions) |
| [engineering-readiness-review.md](engineering-readiness-review.md) | **Final review:** scores, blockers, roadmap, GO/NO-GO decision |
| [sprint-1-report.md](sprint-1-report.md) | **Sprint 1:** stabilization fix log, verification results, updated-files
list |
| [sprint-2-report.md](sprint-2-report.md) | **Sprint 2:** company platform evolution — services, catalogs, contacts, verification |
| [sprint-3-report.md](sprint-3-report.md) | **Sprint 3:** corporate experience — homepage rebuild, truthful content, conversion |
| [sprint-4-report.md](sprint-4-report.md) | **Sprint 4:** customer request experience (3-path form) + API localization foundation |
| [sprint-5-report.md](sprint-5-report.md) | **Sprint 5:** operations — nav permission fixes, honest dashboard, media protection, admin noindex |
| **Flow deep-dives** | |
| [login-flow.md](login-flow.md) | LoginAction: rate limits, single-session revocation, token TTL |
| [queued-jobs.md](queued-jobs.md) | The 2 queue jobs: unique ids, afterCommit, backoff, retry |
| [audit-service.md](audit-service.md) | AuditService + Product/ProductRelease observers |
| [media-upload-flow.md](media-upload-flow.md) | Media upload pipeline: validation, storage, delete, audit |
| [contact-request-flow.md](contact-request-flow.md) | Contact form: spam scoring, race-condition guards |
| [search-pipeline.md](search-pipeline.md) | Public search: SearchDriver, Postgres FTS, result DTOs |
| [release-lifecycle.md](release-lifecycle.md) | current_version auto-sync rules (create/publish/delete) |
| [email-notifications.md](email-notifications.md) | **Correction:** no Notification classes; Mail::send + 2 blades |
| [async-patterns.md](async-patterns.md) | Developer reference: the 3-async-guard pattern, async audit |
| [backup-and-recovery.md](backup-and-recovery.md) | **Sprint 11:** backup service, retention, restore runbook, RPO/RTO, drills |
| [monitoring.md](monitoring.md) | **Sprint 11:** real signals (healthchecks, failed-jobs, watchdog), alert catalogue, honest gaps |
| [verification-notes.md](verification-notes.md) | How facts were verified + tooling reliability caveats |
| [sprint-11-report.md](sprint-11-report.md) | **Sprint 11:** backup, observability & failure recovery — verdict + verification |

---

## Quick Facts

| Fact | Value | Verification |
|---|---|---|
| Backend | Laravel 12 (PHP ^8.4) | ✅ composer.json |
| Frontend | Next.js ^16.2.9 (React 19, TS 5.5) | ✅ package.json |
| Database | PostgreSQL 16 (docker-compose), migrations for 24 tables | ✅ |
| Cache/Queue | Redis 7 | ✅ docker-compose.yml |
| Auth | Sanctum personal-access tokens via HttpOnly cookie (`ys_admin_token`) | ✅ |
| API base path | `/api/v1` | ✅ bootstrap/app.php |
| Health endpoints | `GET /api/v1/health` and `GET /up` | ✅ routes + artisan |
| Migrations | 39 (incl. `jobs`, `failed_jobs`) | ✅ database/migrations |
| Tests | Backend 188 (23 files); Frontend 6 Vitest platform tests | ✅ |
| Default admin | `admin@ys-systems.com` — see [security.md](security.md) finding S-01 | ✅ seeder |
| i18n | Custom EN/AR routing (`[locale]`), **not** next-intl | ✅ code |
