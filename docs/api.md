# API Reference

**Verification:** ✅ every route below verified via `php artisan route:list --json` and `routes/api.php` (2026-08-07).
Base URL: `http://localhost:8000/api/v1` (or `NEXT_PUBLIC_API_URL`).

Response envelope — success: `{ "success": true, "data": …, "meta": … }`; error: `{ "success": false, "message": "…", "code": "…", "errors": {} }`.

---

## 1. Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | DB + cache check → `{status: ok\|degraded, version, checks}`; 503 on failure |
| GET | `/up` | — | Laravel built-in health route (no JSON shape) |

## 2. Auth (throttle: `auth` = 5/min per IP)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | `{email, password, remember?}` → `{user, token, expires_at}`; sets HttpOnly cookie `ys_admin_token`; 401 INVALID_CREDENTIALS, 403 ACCOUNT_DISABLED, 429 RATE_LIMIT_EXCEEDED |
| POST | `/auth/logout` | Bearer/cookie | Revokes current token; clears cookie |
| GET | `/auth/me` | Bearer/cookie | `{user}` incl. `role` |

## 3. Public (throttle: `public` = 120/min per IP, except search & contact)

| Method | Path | Description |
|---|---|---|
| GET | `/public/settings` | Public settings (is_public=true only) |
| GET | `/public/products` | Active/beta/planned products |
| GET | `/public/products/{slug}` | Product detail + releases |
| GET | `/public/docs` | Documentation index (categories + published articles) |
| GET | `/public/docs/{slug}` | Article detail (published only; 404 otherwise) |
| GET | `/public/roadmap` | Public roadmap items |
| GET | `/public/updates` | Published updates |
| GET | `/public/careers` | Open careers |
| GET | `/public/careers/{career}` | Career detail (open only; 404 otherwise) |
| GET | `/public/timeline` | Public timeline entries |
| GET | `/public/pages` | Published static pages |
| GET | `/public/pages/{slug}` | Static page detail |
| GET | `/public/faqs` | Published FAQs (`?category=`) |
| GET | `/public/menus` | All active menus |
| GET | `/public/menus/{location}` | Menu by location (header, footer_*) |
| GET | `/public/homepage-sections` | Enabled homepage sections |
| GET | `/public/search?q=&locale=&limit=&types[]=` | Global search (throttle: `search` = 60/min); types: product, article, career, update |
| POST | `/public/contact` | `{name, email, subject?, message, type?}` (throttle: `contact` = 3/hr); spam-scored, queues admin notification |

## 4. Admin (all: auth:sanctum + active; permission per controller `authorize()`)

### Products & Releases (manage_products; product-scoped via canAccessProduct)

| Method | Path | Description |
|---|---|---|
| GET/POST | `/admin/products` | List (paginated) / create |
| GET/PUT|PATCH/DELETE | `/admin/products/{product}` | Show / update / delete (soft; active products cannot be deleted → 422) |
| GET/POST | `/admin/releases` | List / create |
| GET/PUT|PATCH/DELETE | `/admin/releases/{release}` | Show / update / delete |

### Documentation (manage_documentation; product-scoped)

| Method | Path | Description |
|---|---|---|
| GET/POST | `/admin/docs/categories` | List / create category |
| PUT/DELETE | `/admin/docs/categories/{category}` | Update / delete (no articles, not self-parent) |
| GET/POST | `/admin/docs/articles` | List / create article |
| GET/PUT/DELETE | `/admin/docs/articles/{article}` | Show / update / delete |

### Roadmap (manage_roadmap)

| Method | Path |
|---|---|
| GET/POST | `/admin/roadmap` |
| GET/PUT|PATCH/DELETE | `/admin/roadmap/{roadmapItem}` |

### Updates (manage_updates)

| Method | Path | Description |
|---|---|---|
| GET/POST | `/admin/updates` | List / create |
| GET/PUT|PATCH/DELETE | `/admin/updates/{update}` | Show / update / delete |
| POST | `/admin/updates/{update}/publish` | Publish (sets published_at) |
| POST | `/admin/updates/{update}/unpublish` | Unpublish |

### Careers (manage_careers)

| Method | Path |
|---|---|
| GET/POST | `/admin/careers` |
| GET/PUT|PATCH/DELETE | `/admin/careers/{career}` |

### Timeline (manage_timeline)

| Method | Path |
|---|---|
| GET/POST | `/admin/timeline` |
| PUT/DELETE | `/admin/timeline/{timelineEntry}` |

### Contact Requests (manage_contact_requests)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/contact-requests` | List (status/type filters) |
| GET | `/admin/contact-requests/{contactRequest}` | Detail |
| PATCH | `/admin/contact-requests/{contactRequest}/status` | `{status: new\|read\|replied\|archived}` |

### Media (manage_media)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/media` | List (type filter) |
| POST | `/admin/media` | multipart upload (`file`, `alt_text_en/ar`) |
| DELETE | `/admin/media/{medium}` | Delete file + soft-delete row |

### Users (manage_users; syncProducts: manage_admins)

| Method | Path |
|---|---|
| GET/POST | `/admin/users` |
| GET/PUT|PATCH/DELETE | `/admin/users/{user}` |
| PUT | `/admin/users/{user}/products` | Sync product access `{product_ids: []}` |

### Roles (manage_admins for create/update; manage_users for index)

| Method | Path |
|---|---|
| GET | `/admin/roles` |
| POST | `/admin/roles` |
| GET/PUT|PATCH/DELETE | `/admin/roles/{role}` |

### Billing (manage_subscriptions)

| Method | Path |
|---|---|
| GET/POST | `/admin/customers` |
| GET/PUT|PATCH/DELETE | `/admin/customers/{customer}` |
| GET/POST | `/admin/subscriptions` |
| GET/PUT|PATCH/DELETE | `/admin/subscriptions/{subscription}` |

### Projects (manage_projects)

| Method | Path |
|---|---|
| GET/POST | `/admin/projects` |
| GET/PUT|PATCH/DELETE | `/admin/projects/{project}` |
| PATCH | `/admin/projects/{project}/status` |

Customer and project payloads expose the creator as an object `creator` (`{id, name}` when the relation is loaded, else `null`); the legacy bare `created_by` key is never sent.

### Settings (manage_settings)

| Method | Path |
|---|---|
| GET | `/admin/settings` |
| GET | `/admin/settings/{setting}` |
| PUT | `/admin/settings/{setting}` |

### Feature Flags (manage_feature_flags)

| Method | Path |
|---|---|
| GET/POST | `/admin/feature-flags` |
| PUT/DELETE | `/admin/feature-flags/{featureFlag}` |

### CMS — Static Pages (manage_static_pages)

| Method | Path |
|---|---|
| GET/POST | `/admin/static-pages` |
| GET/PUT|PATCH/DELETE | `/admin/static-pages/{static_page}` |

### CMS — FAQs (manage_faqs)

FAQ payloads (admin) are bilingual by field: `question_en`/`question_ar`, `answer_en`/`answer_ar`, `highlight_en`/`highlight_ar` + `category`, `status`, `sort_order`, `creator` (`{id, name}` when the relation is loaded, else `null`), `created_at`, `updated_at`, `deleted_at`. The public contract (`/public/faqs`) remains localized single-language `question`/`answer`.

| Method | Path |
|---|---|
| GET/POST | `/admin/faqs` |
| GET/PUT/DELETE | `/admin/faqs/{faq}` |

### CMS — Menus (manage_menus)

| Method | Path |
|---|---|
| GET/POST | `/admin/menus` |
| GET/PUT/DELETE | `/admin/menus/{menu}` |
| POST | `/admin/menu-items` |
| PUT/DELETE | `/admin/menu-items/{menuItem}` |

### CMS — Homepage Sections (manage_homepage)

| Method | Path |
|---|---|
| GET/POST | `/admin/homepage-sections` |
| GET/PUT/DELETE | `/admin/homepage-sections/{section}` |

### Audit Logs (view_audit_logs)

| Method | Path |
|---|---|
| GET | `/admin/audit-logs` | Paginated audit trail |
| GET | `/admin/ops/failed-jobs` | Failed queue jobs (read-only; `view_audit_logs`; payload never returned, exception = first line only, no retry/delete) |

## 5. Other routes (✅ verified via route:list)

- `GET sanctum/csrf-cookie` (web group — Sanctum SPA helper)
- `storage/{path}` GET/PUT are **NOT registered** (Sprint 1.1: stale route cache removed; `/storage/*` is served statically by the backend nginx from `public/storage`)

## 6. Frontend ↔ backend integration gaps (resolved)

Previously documented gaps no longer exist in the current tree:

- The four admin pages that called non-existent routes (`/admin/sessions`, `/admin/login-history`, `/admin/api-tokens`, `/admin/notifications`) were **removed from the frontend** — no frontend code calls those endpoints anymore (K-01..K-04 → RESOLVED).
- The two dashboard widget path mismatches (`faq` → `/admin/faq` vs backend `/admin/faqs`; `homepage` → `/admin/homepage` vs `/admin/homepage-sections`) were fixed via `apiPath` (K-05, K-06 → RESOLVED).
- The widget gate `manage_releases` was aligned to the backend's `manage_products` (K-07 → RESOLVED).

The only remaining known integration gap is the dead `i18n/messages/*.json` files (K-28, unused by the custom i18n). See [known-issues.md](known-issues.md) for full analysis.
