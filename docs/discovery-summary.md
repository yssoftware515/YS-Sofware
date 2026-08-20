# Discovery Summary

**Phase:** Discovery only — no implementation, no refactoring, no bug fixes, no configuration changes.
**Date:** 2026-08-07
**What changed:** only the `docs/` tree (deleted 6 outdated files + `ys-web/docs/FRONTEND_STRUCTURE.md`; generated 24 new files + 10 flow deep-dives during readiness review). The platform remains functionally identical.

---

## What was inspected

| Area | Coverage |
|---|---|
| Root | `.env.example`, `docker-compose.yml`, `docker/nginx/*`, `.github/workflows/*` — full read |
| ys-api | `bootstrap/app.php`, `routes/api.php`, all 22 migrations, all 22 models, 6 seeders (+1 fragment), 4 middleware, config files (security/sanctum/cors/mail/purifier), AppServiceProvider, AuthServiceProvider, AuthController, UserController (partial), jobs, Search domain, System services, tests (5 files/42 methods), composer.json, README/SETUP, git state, stray files |
| ys-web | package.json, next.config.ts, middleware.ts, tailwind config, i18n mechanism, lib/api clients, admin pages (all), public pages, modules/core, lib/platform (structure + key files), tests, env files, SETUP.md, docs/FRONTEND_STRUCTURE.md |
| Runtime | `php artisan route:list --json` (authoritative route table), vendor framework config (filesystems/serve behavior), git ls-files/check-ignore (env tracking) |

## Key facts confirmed during discovery

1. **Stack:** Laravel 12 / PHP 8.4 / PostgreSQL 16 / Redis 7 / Sanctum (backend); Next.js 16 / React 19 / TypeScript 5.5 / Tailwind 3.4 (frontend); Nginx; GitHub Actions CI+CD; Docker Compose.
2. **API:** 100% mapped — 3 auth, 18 public, ~75 admin routes, plus `/health`, `/up`, storage serving.
3. **Auth:** HttpOnly cookie `ys_admin_token` (Sanctum PAT), 8h/30d issuance TTL, `SameSite=strict`.
4. **RBAC:** 5 seeded roles, 18 permission strings + `*`; fail-closed product scoping via `admin_product_access`.
5. **Data:** 24 tables; immutable audit logs (Eloquent + RLS); Postgres FTS with GIN.
6. **Doc status:** 4 of 6 old docs partially/completely outdated; regenerated.
7. **Frontend↔backend:** 6 broken API integrations (sessions, login-history, api-tokens, notifications, faq widget, homepage widget) + 1 invalid widget permission; 2 CI jobs are placeholders; release health-verify targets non-existent endpoints.
8. **Security posture:** solid baseline; hardcoded admin password in seeder (S-01) is the top item; no MFA/reset; storage disk public-read by default (Laravel 12 defaults).

## Statements that could NOT be verified (❓)

- Production deployment environment details (hosts, TLS, DNS, secrets presence).
- Whether `docker compose pull/up` in deploy includes manual migrations (no migrate step).
- Intended scope of `lib/platform` framework.
- Whether planned backend features exist for sessions/login-history/api-tokens/notifications pages.
- IndexNow submission call sites.
- `storage:link` handling inside the backend image.
- Frontend `NEXT_PUBLIC_API_URL` behavior per environment behind nginx (build-time inlining).
- Status page / system-status widget intent (static today).

## Deliverables

24 documents in `docs/` (see [README.md](README.md) index), including this summary, [documentation-report.md](documentation-report.md), and the [master-report.md](master-report.md) with prioritized recommendations and owner questions.
