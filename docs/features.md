# Features

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## Public-facing features (✅ verified)

| Feature | Public API | Public UI | Notes |
|---|---|---|---|
| Product catalog | `/public/products`, `/public/products/{slug}` | `products/` + `products/[slug]` | bilingual fields, status, cover image, icon_key, brand_color, releases, featured/ordered scopes |
| Product releases / changelog | (via product detail + `/public/…` releases listing) | `releases/`, `changelog/` | version, type, notes, changelog JSON, published flag |
| Documentation | `/public/docs`, `/public/docs/{slug}` | `docs/` + `docs/[slug]` | categories (nested), articles, version_tag, reading time, searchable |
| Roadmap | `/public/roadmap` | `roadmap/` | status/priority/target version/quarter |
| Updates / changelog posts | `/public/updates` | `updates/` | publish/unpublish, featured, type |
| Careers | `/public/careers`, `/public/careers/{career}` | `careers/` | open only; requirements/responsibilities JSON |
| Timeline | `/public/timeline` | (timeline data used in admin; public endpoint exists) | milestones |
| FAQ | `/public/faqs` | `faq/` | category, published, ordered |
| Static pages | `/public/pages`, `/public/pages/{slug}` | `privacy/`, `terms/`, `cookie-policy/`, `security/`, `about/` | SEO fields, published only |
| Menus | `/public/menus`, `/public/menus/{location}` | Header/Footer | 5 locations, nested items |
| Homepage sections | `/public/homepage-sections` | Homepage | 5 types: hero, stats, why_choose, products, cta |
| Global search | `/public/search` | SearchModal (Cmd+K) | Postgres FTS, 4 types, locale-aware |
| Contact form | `/public/contact` | `contact/` | spam scoring, rate limit 3/hr, queues admin email |
| Settings exposure | `/public/settings` | header/footer/footer metadata | is_public=true only |
| Status page | — | `status/` (static) | ⚠️ static page — not wired to real metrics |
| SEO | — | sitemap.xml, robots.txt, JSON-LD, hreflang, IndexNow | see seo.md |
| i18n | — | `/en` `/ar` with RTL | custom mechanism (no next-intl) |

## Admin CMS features (✅ verified)

| Feature | Admin routes | Permission |
|---|---|---|
| Products CRUD (+ icon/brand color, cover, SEO, featured) | `/admin/products` | manage_products (+product scope) |
| Releases CRUD | `/admin/releases` | manage_products (+product scope) |
| Documentation categories/articles CRUD | `/admin/docs/*` | manage_documentation (+product scope) |
| Roadmap CRUD | `/admin/roadmap` | manage_roadmap |
| Updates CRUD + publish/unpublish | `/admin/updates` | manage_updates |
| Careers CRUD | `/admin/careers` | manage_careers |
| Timeline CRUD | `/admin/timeline` | manage_timeline |
| Contact requests inbox + status workflow | `/admin/contact-requests` | manage_contact_requests |
| Media library (upload/list/delete) | `/admin/media` | manage_media |
| Users CRUD + product access sync | `/admin/users` (+`/{id}/products`) | manage_users / manage_admins |
| Roles CRUD (permission picker) | `/admin/roles` | manage_admins (index: manage_users) |
| Settings management | `/admin/settings` | manage_settings |
| Feature flags CRUD | `/admin/feature-flags` | manage_feature_flags |
| Static pages CRUD | `/admin/static-pages` | manage_static_pages |
| FAQs CRUD | `/admin/faqs` | manage_faqs |
| Menus + menu items CRUD | `/admin/menus`, `/admin/menu-items` | manage_menus |
| Homepage sections CRUD | `/admin/homepage-sections` | manage_homepage |
| Audit log viewer | `/admin/audit-logs` | view_audit_logs |
| Customers directory (type/status/archive, search & filters) | `/admin/customers` | view_customers / manage_customers |
| Projects CRUD (scope, schedule, services, recorded value) | `/admin/projects` | view_projects / manage_projects |
| Contact request ↔ customer linking (link/convert/unlink) | `/admin/contact-requests/{id}` | manage_contact_requests + manage_customers |
| Subscriptions CRUD (manual entry) | `/admin/subscriptions` | manage_subscriptions |
| Dashboard with widget stats | `/admin/dashboard` | UI-gated |

## System-level features (✅ verified)

| Feature | Implementation |
|---|---|
| Audit logging | AuditService + immutable AuditLog (Eloquent + RLS) |
| Feature flags | FeatureFlagService (Redis cache, env+targeting) |
| Media upload security | server-side MIME sniff, blocked ext, double-ext guard, UUID names |
| HTML sanitization | Purifier `cms` profile at write; dompurify at render |
| Search | Postgres FTS (websearch_to_tsquery + ts_rank_cd) |
| Queue/async email | 2 jobs, afterCommit dispatch, Redis/database driver |
| Dead-letter observability | `failed_jobs` table + `GET /api/v1/admin/ops/failed-jobs` (read-only, `view_audit_logs`) |
| Scheduler | `php artisan schedule:work` in docker (⚠️ no scheduled tasks defined in code — verify `routes/console.php` absence: none exists) |
| Rate limiting | 4 named limiters |
| Security headers | CSP + HSTS + nosniff + etc. (backend + frontend) |

## Platform framework (frontend `lib/platform`) — ⚠️ mostly dormant

Module kernel, registries, buses, drivers (cache/storage/mail/search/queue/scheduler), secrets manager, release/recovery/installer/backup/deployments managers, health endpoints, monitoring/performance/reports/reviews, CLI/generator/SDK. Only: kernel boot + navigation/permission/widget registries + health indicator are actually consumed by the running admin app. ❓ Confirm intended scope with project owner.

## Missing / promised-but-absent features (✅ verified absence)

| Feature | Status |
|---|---|
| Password reset / forgot password | ❌ no endpoint, no UI (columns exist) |
| Email verification | ❌ unused (`email_verified_at` present) |
| MFA / 2FA | ❌ not implemented |
| Notifications center | ❌ frontend page only — no backend |
| Active sessions / login history / API tokens pages | ❌ frontend pages only — no backend |
| Subscription billing automation | ❌ manual entries only (`is_manual_entry=true` default) |
| Payments integration | ❌ none |
| Real monitoring integration (Grafana datasources) | ❌ Grafana container only, no provisioning |
| Real alerting (CPU/memory/disk thresholds) | ❌ claimed in old docs — not in code |
| Backups (daily, retention 30d) | ⚠️ Sprint 11: dedicated one-shot compose service (`backup`) — `pg_dump -Fc` + verify + retention (`BACKUP_RETENTION`). Run nightly via host cron (see backup-and-recovery.md). ❌ automatic scheduling inside Docker (host cron required) still external |
| S3 storage driver | ❌ `filesystems` default local only (no S3 config in `config/filesystems.php` — default Laravel has it, but no env wiring verified) |
| Meilisearch | ❌ driver interface ready, no implementation |
| Public user accounts | ❌ none (admin-only auth) |
| Multi-language admin UI | ❌ English-only (labels EN/AR exist in nav but UI strings are EN) |
