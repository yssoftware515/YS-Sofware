# Phase 4 — Production Readiness Report (read-only audit)

**Scope:** read-only audit of the entire tree (ys-api, ys-web, docker-compose, docs, ops) for release-blocking correctness, security, and configuration issues.
**Method:** code inspection with `file:line` evidence, cross-checked against docs and runtime configs. No files modified.
**Date:** 2026-08-18

## Executive summary

The system is **close to release-ready** (verdict: **B — conditional pass**). One configuration landmine (P1-01) can silently turn the frontend into a ghost site in production and must be fixed before the first production deploy. Tenant scoping is correctly enforced in queries and actions, with one write-path escape (INT-009) that must be closed. Frontend error surfaces are the weakest area: several admin pages swallow failures and render an empty/healthy-looking UI, and the default `revalidate` semantics of the API client are inverted. Backups exist but are operator-triggered only; there is no scheduled backup job.

## Findings

| ID | Severity | Title | Evidence | Status |
|---|---|---|---|---|
| P1-01 | 🔴 High | Redis landmine: `FeatureFlagService` hard-depends on `Redis::` while compose/env point cache/session/queue at redis; PHP extensions not guaranteed | `FeatureFlagService.php` uses `Redis::get/put/forget/lock`; compose wires `REDIS_*`; `.env.example` sets `CACHE_STORE=redis`, `SESSION_DRIVER=redis`, `QUEUE_CONNECTION=redis` | OPEN |
| INT-006 | 🟡 Medium | `GET /api/v1/status` leaks `version` fingerprint | `StatusController.php` returned `version`; `HealthContractTest` pins `checks` shape | OPEN |
| INT-007 | 🟡 Medium | `lib/api/client.ts` `next` merge is inverted: requests pass `options.next` **first**, so a default `{ revalidate: 60 }` on fallback is silently overwritten; admin requests pass it **last** and would default to 60s revalidation | `client.ts` request/adminRequest | OPEN |
| INT-008 | 🟡 Medium | `settings/page.tsx` swallows load/save failures (empty selects + silent `onSubmit` catch) | `settings/page.tsx` `catch {}` | OPEN |
| INT-009 | 🔴 High | Tenant write escape: `UpdateDocumentationCategoryAction` updates any category by id without asserting it belongs to the acting tenant; controller does not validate `product_id` | `UpdateDocumentationCategoryAction.php` `Category::findOrFail`, `DocumentationController.php@updateCategory` | OPEN |
| P2-05 | 🟡 Medium | Milestone reorder not transactional; `category_id`/`is_active` scoping happens in the query, not per-row | `MilestoneController.php@move` | OPEN |
| P2-06 | 🟡 Medium | Dashboard audit-count query unbounded (recount on every request); `audit_logs.created_at` lacks an index | `DashboardService.php`, `AuditLog` model, `audit_logs` migration | OPEN |
| P2-07 | 🟡 Medium | No OPcache in production image | `Dockerfile` runner stage (no `opcache` ext) | OPEN |
| P3-04 | 🟢 Low | `audit-logs/page.tsx` silently renders an empty table on API failure | `audit-logs/page.tsx` `catch {}` → `[]` | OPEN |
| P8 | 🟢 Low | `.env.example` ships redis defaults + debug-friendly flags (a copy-paste trap) | `.env.example` | OPEN |
| P9 | 🟢 Low | `queue-worker`/`scheduler` lack the storage volume (log/cache loss on restart); backup is one-shot only, no scheduled task; no `routes/console.php` | `docker-compose.yml`, `ops/backup/backup.sh` | PARTIAL |

## Cross-cutting verification (passed)

- Tenant scoping: `product_id`/`category_id`/`milestone_id`/`is_active` filters enforced in admin queries (verified pattern across controllers/actions, except INT-009).
- Health contract: `{status, checks}`, 503 on failure — matches frontend `lib/platform/health-endpoints/`.
- Money is decimal-string, pagination meta preserved, proxy.ts only (no middleware), bilingual contract intact, audit behavior intact, permissions intact (Phase 1–3 verified, not re-opened).
- Redis vs. reality: compose DID wire `REDIS_*` correctly; docs (deployment.md) admitted effective drivers were file/file/database. The real failure mode was the hard `Redis::` dependency + `.env.example` traps.

## Release recommendation (pre-fix)

Verdict **B — conditional**: ship only after P1-01 and INT-009 are fixed and the full regression gates re-run (backend 439+ tests, frontend 65+ tests, tsc, eslint, next build, Docker build).