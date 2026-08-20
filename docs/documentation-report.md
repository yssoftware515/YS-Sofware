# Documentation Accuracy Report (OLD docs vs. Implementation)

**Date:** 2026-08-07
**Method:** every statement in the previous `docs/` tree was compared against the actual source code (`ys-api/`, `ys-web/`), config files, `artisan route:list`, seeders, and migrations.

---

## Previous documentation inventory

The old docs folder contained 6 files:

```
docs/
├── index.md                        (32 lines)
├── architecture/overview.md        (51 lines)
├── development/getting-started.md  (65 lines)
├── operations/monitoring.md        (43 lines)
├── deployment/pipeline.md          (42 lines)
└── security/overview.md            (45 lines)
```

Additionally, `ys-web/docs/FRONTEND_STRUCTURE.md` (315 lines) existed inside the frontend repo, and the per-repo `README.md` / `SETUP.md` files contained technical claims.

---

## Verdict per document

### 1. `docs/index.md` — ❌ Completely outdated

| Claim | Reality | Verdict |
|---|---|---|
| "enterprise-grade application platform ... modular architecture with a powerful kernel, service container, registries, SDK" | The product is a corporate website + admin CMS. A `lib/platform` framework exists in the frontend but most of it is dormant | ❌ |
| Documentation sections list (modules/, sdk/, infrastructure/, troubleshooting/, backup-recovery/, api/, contributing/) | ❌ Only 4 of 13 listed sections existed (architecture, development, deployment, operations, security = 5/13); modules/, sdk/, infrastructure/, troubleshooting/, backup-recovery/, api/, contributing/ did not exist | ❌ |
| Quick link "Health Endpoints (`../ys-web/lib/platform/health-endpoints/`)" | ✅ Path exists (3 files) — one correct reference | ⚠️ partial |

### 2. `docs/architecture/overview.md` — ⚠️ Partially outdated (fundamentally misleading)

| Claim | Reality | Verdict |
|---|---|---|
| "Modular, kernel-based architecture" with ModuleKernel, Registries, Services, Subscription Hub | ✅ ModuleKernel, registries, services exist — **but in `ys-web/lib/platform`, a frontend framework, not the platform's core**. The backend (the real core) is Laravel + DDD domains — entirely absent from the doc | ❌ |
| ServiceContainer DI | ✅ exists (frontend lib) | ⚠️ |
| EventBus | ✅ exists (frontend lib) | ⚠️ |
| HealthEndpointProvider | ✅ exists (frontend lib) | ⚠️ |
| EnvironmentManager, SecretsManager, ReleaseManager, RecoveryManager, InstallationWizard | ✅ exist as files in frontend lib/platform | ⚠️ |
| Data layer "PostgreSQL | Redis | File Storage" | ✅ accurate | ✅ |
| "Platform Center (Admin UI + Health + Monitoring + Management)" | Partially — admin UI exists; health/monitoring/management are framework code, not wired | ⚠️ |
| Omission of: Laravel API, public website, CMS, billing, RBAC, products | — | ❌ (huge gap) |

### 3. `docs/development/getting-started.md` — ⚠️ Partially outdated

| Claim | Reality | Verdict |
|---|---|---|
| Prereqs Node 20+, PHP 8.4+, Composer 2, PostgreSQL 16, Redis 7, Docker | ✅ | ✅ |
| Frontend `npm install`, `.env.local.example → .env.local` | ✅ | ✅ |
| Backend composer install, key:generate | ✅ | ✅ |
| Frontend `http://localhost:3000`, backend `http://localhost:8000` | ✅ | ✅ |
| Health: `http://localhost:8000/health/live` | ❌ real: `/api/v1/health` | ❌ |
| `docker compose --profile development up -d` | ✅ (mailhog profile) | ✅ |
| Project structure block | ✅ accurate | ✅ |
| Doc describes itself as "Enterprise documentation" of "YS Platform" | Misleading framing | ❌ |

### 4. `docs/operations/monitoring.md` — ❌ Completely outdated (mostly fabricated)

| Claim | Reality | Verdict |
|---|---|---|
| `/health/live`, `/health/ready`, `/health/startup`, `/health/deep` | ❌ none exist in backend (only `/api/v1/health`, `/up`); names exist only as frontend lib abstractions | ❌ |
| MonitoringCenter, PerformanceCenter, HealthReporter, PlatformReports | ✅ exist as frontend lib files (monitoring/, performance/, HealthReporter.ts, reports/) | ⚠️ |
| Alerting thresholds (CPU > 90% etc.) | ❌ no code implementing alerts | ❌ |
| Backups daily / storage / config / retention 30 days | ❌ no backup jobs or config in code | ❌ |
| DR: RTO 4h, RPO 1h, versioned plans, simulations | ❌ nothing in backend; `lib/platform/recovery` + `backup` exist as unintegrated frontend code | ⚠️/❌ |

### 5. `docs/deployment/pipeline.md` — ⚠️ Partially outdated

| Claim | Reality | Verdict |
|---|---|---|
| CI jobs: lint/typecheck, backend static analysis, frontend tests, backend tests (PostgreSQL), build, Trivy | ✅ all exist in ci.yml | ✅ |
| Release on tag: build & push images, deploy, rollback validation | ✅ exists in release.yml | ✅ |
| GHCR publishing | ✅ | ✅ |
| Health endpoints verify deployment | ⚠️ verify step uses `/health/ready` + `/health/live` — **do not exist** → verify always fails | ❌ |
| **"If deployment fails, rollback workflow triggers automatically"** | ❌ `rollback-ready` only prints a warning; no automatic rollback | ❌ |
| Environments dev/staging/production | ✅ (profiles + GitHub environments) | ✅ |

### 6. `docs/security/overview.md` — ⚠️ Partially outdated (overstates)

| Claim | Reality | Verdict |
|---|---|---|
| "JWT-based authentication via Laravel Sanctum" | ❌ Sanctum **opaque personal-access tokens**, not JWT | ❌ |
| Password policy (min length, complexity) | ⚠️ min 8 (login) / min 12 (user creation); no complexity | ⚠️ |
| Session management with configurable timeouts | ⚠️ 8h/30d TTL at issuance only; no server-side expiry | ⚠️ |
| MFA-ready infrastructure | ❌ no MFA code | ❌ |
| RBAC, permission middleware on all routes, module-level isolation | ✅ RBAC + per-controller authorize() | ✅ |
| Feature flags for gradual rollout | ✅ FeatureFlagService | ✅ |
| Session security: max lifetime, idle timeout, single session mode, MFA enforcement | ⚠️ lifetime only; no idle/single-session/MFA | ⚠️/❌ |
| HTTP headers CSP/nosniff/frame-ancestors/HSTS/referrer | ✅ all implemented (backend + frontend) | ✅ |
| SecretsManager centralized, masking, rotation, env/docker/vault providers | ⚠️ frontend lib has SecretsManager; vault/docker are **type literals only**, no masking/rotation verified | ⚠️ |
| `securityReview.run()` | ✅ exists (frontend lib/platform/reviews/SecurityReview.ts) | ✅ |

### 7. `ys-web/docs/FRONTEND_STRUCTURE.md` — ⚠️ Partially outdated

- Accurately maps HeroSection, design tokens, data flow (✅), but its tree **predates** `modules/`, `lib/platform/`, `tests/`, `i18n` changes; it claims `i18n/messages/*.json` hold "static translation strings" (unused); it says nothing about the platform kernel. Self-admits staleness.

### 8. `ys-api/README.md` + `SETUP.md`, `ys-web/SETUP.md` — ⚠️ Partially outdated (kept, see note)

| File | Issue |
|---|---|
| ys-api/README.md | Admin password wrong (K-11); "12 migrations" → 22 (K-12); omits CookieToBearer, Cms/Billing/Role controllers; Phase 3 roadmap items (feature flags UI, global search, email notifications) actually shipped |
| ys-api/SETUP.md | Password wrong (K-11); 12 migrations (K-12); health response shape wrong (K-13); Horizon instructions (not installed); "Redis queue" vs local database driver |
| ys-web/SETUP.md | Claims next-intl (K-16) — custom i18n; tree missing many pages |

**Note:** these files are committed repository documentation. Per the discovery mandate, the `docs/` tree was regenerated; the repo README/SETUP files were **not deleted** (they belong to the repos' committed history) — they are flagged here and in [known-issues.md](known-issues.md) for the owner to update.

---

## Overall verdict

| File | Verdict |
|---|---|
| docs/index.md | ❌ Completely outdated |
| docs/architecture/overview.md | ❌ Completely outdated (kernel exists but mislocated; entire product omitted) |
| docs/development/getting-started.md | ⚠️ Partially outdated (health endpoint wrong) |
| docs/operations/monitoring.md | ❌ Completely outdated |
| docs/deployment/pipeline.md | ⚠️ Partially outdated (rollback + health endpoints wrong) |
| docs/security/overview.md | ⚠️ Partially outdated (JWT/MFA/secret claims wrong or overstated) |
| ys-web/docs/FRONTEND_STRUCTURE.md | ⚠️ Partially outdated |

**Action taken (per mandate):** all 6 files in `docs/` and `ys-web/docs/FRONTEND_STRUCTURE.md` were **deleted** and replaced with the fully regenerated documentation set (24 files) that describes the actual implementation. This regeneration is the only change made to the platform — no code, config, or data was modified.
