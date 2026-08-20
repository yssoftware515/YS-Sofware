# Architecture

**Verification legend:** ✅ verified from code · ⚠️ inferred · ❓ unknown

---

## 1. High-Level Overview

The YS Systems platform is a **two-application monorepo**:

```
                        ┌────────────────────────────┐
                        │         Nginx (:80)        │  docker/nginx
                        │  / → frontend (:3000)      │
                        │  /api/ → backend (:8000)   │
                        │  /storage/ → backend files │
                        └───────────┬────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
   ┌────────▼────────┐   ┌──────────▼──────────┐   ┌────────▼─────────┐
    │  ys-web         │   │  ys-api             │   │  PostgreSQL 16   │
    │  Next.js 16     │   │  Laravel 12         │   │  DB/file-backed  │
    │  App Router     │──▶│  REST API /api/v1   │──▶│  (cache+queue)   │
    │  Public site    │   │  Sanctum + RBAC     │   └──────────────────┘
    │  Admin panel    │   │  Postgres FTS       │
   └─────────────────┘   └─────────┬───────────┘
                                   │
                          ┌────────▼─────────┐
                          │  Queue worker    │  php artisan queue:work
                          │  Scheduler       │  php artisan schedule:work
                          └──────────────────┘
```

✅ Verified from `docker-compose.yml` and both repos.

---

## 2. Backend Architecture (`ys-api`)

### 2.1 Domain-Driven layout

The application code lives under `app/Domains/{Domain}/` with a layered structure:

| Layer | Examples | ✅ verified |
|---|---|---|
| `Models/` | Eloquent models (22 total) | ✅ |
| `Actions/` | `LoginAction`, `CreateProductAction`, … (31) | ✅ |
| `DTOs/` | `LoginDTO`, `CreateProductDTO` (readonly) | ✅ |
| `Enums/` | `Permission`, `ProductIcon` | ✅ |
| `Services/` | `AuditService`, `FeatureFlagService`, `MediaUploadService`, `HtmlSanitizerService` | ✅ |
| `Repositories/` | `PermissionRepository` | ✅ |
| `Contracts/` + `Drivers/` | Search driver abstraction | ✅ |
| `Observers/` | `ProductObserver`, `ProductReleaseObserver` (audit + version sync) | ✅ |
| `Policies/` | `ProductPolicy` | ✅ |

Domains: `Auth`, `Billing`, `Cms`, `Content`, `Operations`, `Product`, `Search`, `System`.

### 2.2 Request lifecycle

```
HTTP request
  → global middleware: SecurityHeaders → ForceJsonResponse → CookieToBearer
  → route middleware:  throttle:X | auth:sanctum + active (EnsureUserIsActive)
  → controller (permission via $this->authorize(...) → Gate/policy)
  → FormRequest validation (admin writes) | inline validate() (some)
  → Action / DTO / Service
  → Eloquent (PostgreSQL)
  → JSON response { success, data, meta } | { success, message, code, errors }
```

✅ Verified from `bootstrap/app.php`, `routes/api.php`, controllers.

### 2.3 API conventions

- **Prefix:** `api/v1` (set in `bootstrap/app.php` via `apiPrefix`).
- **Response success shape:** `{ success: true, data, meta }`.
- **Error shape (all exceptions):** `{ success: false, message, code, errors? }` — rendered centrally in `bootstrap/app.php` with codes `VALIDATION_ERROR` (422), `UNAUTHENTICATED` (401), `HTTP_ERROR`, `SERVER_ERROR` (500). ✅
- **JSON-only:** `ForceJsonResponse` forces `Accept: application/json`. ✅
- **Rate limiting:** named limiters `public` (120/min), `auth` (5/min), `contact` (3/hr), `search` (60/min) registered in `AppServiceProvider`. ✅

### 2.4 Search architecture

`App\Domains\Search\Contracts\SearchDriver` interface with one implementation `PostgresSearchDriver` (PostgreSQL full-text search with `websearch_to_tsquery`, `ts_rank_cd`, generated `tsvector` columns + GIN indexes on products, documentation_articles, careers, updates). Bound as a singleton in `AppServiceProvider` with a documented swap path to Meilisearch. ✅

### 2.5 Async work

- `SendContactRequestNotificationJob` — unique-by-id, 3 tries, mail via queue. ✅
- `SendAdminUserCreatedJob` — admin creation notification. ✅
- Both dispatched with `->afterCommit()`. ✅
- Queue connection: `QUEUE_CONNECTION` (database — jobs table). The stack is DB/file-backed; Redis is NOT deployed (Phase 4A, P1-01). ✅

### 2.6 Health

- `GET /api/v1/health` — checks DB (PDO ping) and cache (write+read), returns `{status: ok|degraded, checks}` — deliberately **no version fingerprint** (pinned by `HealthContractTest`, VULN-xx); 503 on failure. ✅
- `GET /up` — Laravel 12 built-in health route. ✅
- **There are no `/health/live`, `/health/ready`, `/health/startup`, `/health/deep` endpoints** in the backend (the old docs claimed them). ❌ → these names exist only as a frontend `lib/platform/health-endpoints/` abstraction. ✅

---

## 3. Frontend Architecture (`ys-web`)

### 3.1 Application areas

1. **Public site** — `app/[locale]/(public)/*` — server components; locale segment `en|ar`; CMS-driven content fetched at request time with 60s ISR revalidation on GETs.
2. **Admin panel** — `app/admin/*` — client-rendered; guarded by `middleware.ts` (cookie presence) + client-side `AuthProvider` permission checks.
3. **Platform framework** — `lib/platform/` (100 TS files after 2026-08-18 ARCH-006 cleanup: 79 provably-unreachable files removed) — a self-contained, plugin-style framework: `ModuleKernel`, registries (navigation, permissions, widgets, settings, search, SEO, feature flags, scheduler), services (Logger, EventBus, ServiceContainer, SecurityManager, AuditEngine, HealthReporter, PerformanceMonitor, NotificationBus, PlatformConfig), buses (Command/Query), drivers (cache, storage, mail, search), engines (feature flags, dependency graph), health endpoints, secrets, release/recovery/installer/backup/deployments, monitoring, reports, etc.
4. **Modules** — `modules/core/` — the only registered module; registers admin navigation (7 groups), permission groups, and 8 dashboard widgets into the kernel. ✅

### 3.2 Client–server data flow (public)

```
Server Component page.tsx
  → lib/api/client.ts (typed fetch, NEXT_PUBLIC_API_URL)
  → GET /api/v1/public/*  (Accept-Language: en|ar, revalidate 60s)
  → component props → hydration
```

✅ Verified from `lib/api/client.ts`, `app/[locale]/(public)/layout.tsx`.

### 3.3 i18n (important correction)

**next-intl is NOT used** (contrary to `ys-web/SETUP.md`). Actual mechanism:

- Locale routing: `app/[locale]/` + `middleware.ts` redirect to default locale `en`. ✅
- RTL: inline script in `app/layout.tsx` sets `dir`/`lang`. ✅
- Translations: hardcoded EN/AR objects per component; CMS content bilingual via `_en`/`_ar` fields. ✅
- `i18n/messages/en.json` + `ar.json` exist but are **imported nowhere** (dead files). ✅ (grep verified)

### 3.4 State management

- `zustand` — theme store (`lib/stores/theme.ts`).
- `@tanstack/react-query` — admin list/delete hooks (`lib/hooks/useAdminResource.ts`).
- React context — `AuthProvider` (auth state), `PlatformProvider` (kernel boot).

---

## 4. Deployment Architecture

- `docker-compose.yml` services: `frontend`, `backend`, `database` (postgres:16-alpine), `nginx`, `queue-worker`, `scheduler`, plus profiles: `mailhog` (development|staging), `monitoring` (Grafana, production), `backup` (pg_dump one-shot). ✅
- Nginx routes `/` → frontend, `/api/` → backend (**path preserved** since Sprint 1.1, no prefix stripping), `/storage/` → backend storage. Backend image itself serves HTTP :8000 (nginx → php-fpm :9000). ✅
- CI: lint/type-check (frontend), static analysis placeholder (backend), tests (frontend placeholder, backend with Postgres service), build, Trivy scan. ✅
- Release (on `v*` tag or workflow_dispatch): build & push GHCR images (frontend built with `NEXT_PUBLIC_API_URL` build arg), SSH deploy via `docker compose pull && migrate --force && up -d`, then verify `/health/live` (frontend), `/api/v1/health` (backend), and 401/419 on an admin route (Sprint 1.1 — real endpoints, not the old non-existent `/health/ready|live`).

---

## 5. Design Principles (observed in code)

1. **DDD per-domain folders** with Actions/DTOs separation. ✅
2. **Closed-list enums** for permissions and product icons (typo-proof config). ✅
3. **Fail-closed authorization** (product scoping — zero rows = zero access). ✅
4. **Sanitize-at-write** (Purifier) **+ sanitize-at-render** (isomorphic-dompurify) for rich text. ✅
5. **Pluggable drivers** (search, cache, storage, mail). ✅
6. **Immutable audit log** — Eloquent guards + PostgreSQL RLS. ✅
7. **Config via env with sane defaults** (`config/security.php` etc.). ✅
8. **Observability structure** in frontend `lib/platform` (logger, audit, health, reports). ⚠️ Partially implemented; some services exist but aren't wired to real backends.

---

## 6. What the platform is NOT (verified)

- Not a multi-tenant SaaS platform — no tenant model. ✅ (no tenant tables/columns)
- No marketplace/payments — subscriptions are manual-entry records only. ✅
- No real-time features (websockets). ✅ (no laravel-websockets/echo)
- No JWT — Sanctum opaque tokens. ✅ (docs previously claimed JWT)
- No separate auth for public users — the public site has no user accounts. ✅
- No Meilisearch/Typesense — PostgreSQL FTS only (driver ready for swap). ✅
