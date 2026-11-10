# API Reference

**Verification:** every route below is registered in `routes/api.php` and was verified via `php artisan route:list --json` (68 routes, 2026-11-10 — after the Group H cleanup).
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
| POST | `/auth/change-password` | Bearer/cookie | `{current_password, password, password_confirmation}` |
| POST | `/auth/forgot-password` | — | `{email}`; throttled per email/IP; always the same response (no account enumeration) |
| POST | `/auth/reset-password` | — | `{token, email, password, password_confirmation}` |

## 3. Public (throttle: `public` = 120/min per IP, except search & contact)

| Method | Path | Description |
|---|---|---|
| GET | `/public/settings` | Public settings (`is_public=true` only) |
| GET | `/public/services` | Active services catalog |
| GET | `/public/services/{slug}` | Service detail |
| GET | `/public/search?q=&locale=&limit=&types[]=` | Global search (throttle: `search` = 60/min); types: `service`, `page`, `faq` |
| POST | `/public/contact` | `{name, email, subject?, message, type?}` (throttle: `contact` = 3/hr); spam-scored, queues admin notification |

### Search contract

- `q` required, 2–200 characters.
- `types[]` optional; when omitted **all** types are searched. Unknown types are rejected with 422.
- `locale` optional (`en` \| `ar`); defaults to the request/application locale.
- `limit` optional, 1–50 (default 20).
- Results are ordered `service` → `page` → `faq`, then by URL; `meta.total` is a real COUNT per type; `data.grouped` contains one key per matched type.
- Only publicly reachable content is searchable: `services`, `static_pages`, `faqs`.

## 4. Admin (all: auth:sanctum + active; permission per controller `authorize()`)

### Dashboard (view permission per widget)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard/stats` | Dashboard counters and attention lists |

### Services (`view_services` to read, `manage_services` to mutate)

| Method | Path |
|---|---|
| GET/POST | `/admin/services` |
| GET/PUT\|PATCH/DELETE | `/admin/services/{service}` |

### Contact Requests (`manage_contact_requests`)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/contact-requests` | List (status/type filters) |
| GET | `/admin/contact-requests/{contactRequest}` | Detail |
| PATCH | `/admin/contact-requests/{contactRequest}/status` | `{status: new\|read\|replied\|archived}` |
| POST | `/admin/contact-requests/{contactRequest}/convert-customer` | Create (or link) a customer from the request |
| POST | `/admin/contact-requests/{contactRequest}/link-customer` | `{customer_id}` |
| DELETE | `/admin/contact-requests/{contactRequest}/customer` | Unlink |
| POST | `/admin/contact-requests/{contactRequest}/link-project` | `{project_id}` |
| DELETE | `/admin/contact-requests/{contactRequest}/project/{project}` | Unlink project |

### Customers (`view_customers` / `manage_customers`)

| Method | Path |
|---|---|
| GET/POST | `/admin/customers` |
| GET/PUT\|PATCH/DELETE | `/admin/customers/{customer}` |
| PATCH | `/admin/customers/{customer}/status` |

### Projects (`view_projects` / `manage_projects`)

| Method | Path |
|---|---|
| GET/POST | `/admin/projects` |
| GET/PUT\|PATCH/DELETE | `/admin/projects/{project}` |
| PATCH | `/admin/projects/{project}/status` |

### Tasks (`view_projects` / `manage_projects`)

| Method | Path |
|---|---|
| GET/POST | `/admin/tasks` |
| GET/PUT\|PATCH/DELETE | `/admin/tasks/{task}` |
| PATCH | `/admin/tasks/{task}/status` |

### Milestones (`view_projects` / `manage_projects`)

| Method | Path |
|---|---|
| GET/POST | `/admin/milestones` |
| GET/PUT\|PATCH/DELETE | `/admin/milestones/{milestone}` |
| PATCH | `/admin/milestones/{milestone}/status` |
| POST | `/admin/milestones/{milestone}/move` |

`move` swaps the sort order with the adjacent milestone in the same project.

Customer/project/task/milestone payloads expose the creator as an object `creator` (`{id, name}` when the relation is loaded, else `null`); the legacy bare `created_by` key is never sent.

### Users (`manage_users`)

| Method | Path |
|---|---|
| GET/POST | `/admin/users` |
| GET/PUT\|PATCH/DELETE | `/admin/users/{user}` |

### Roles (`manage_admins` for create/update; `manage_users` for index)

| Method | Path |
|---|---|
| GET | `/admin/roles` |
| POST | `/admin/roles` |
| GET/PUT\|PATCH/DELETE | `/admin/roles/{role}` |

### Settings (`manage_settings`)

| Method | Path |
|---|---|
| GET | `/admin/settings` |
| GET | `/admin/settings/{setting}` |
| PUT | `/admin/settings/{setting}` |

### Audit Logs (`view_audit_logs`)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/audit-logs` | Paginated audit trail |
| GET | `/admin/ops/failed-jobs` | Failed queue jobs (read-only; `view_audit_logs`; payload never returned, exception = first line only, no retry/delete) |

## 5. Other routes

- `GET sanctum/csrf-cookie` (web group — Sanctum SPA helper)
- `storage/{path}` GET/PUT are **NOT registered**; `/storage/*` is served statically by the backend nginx from `public/storage`

## 6. Removed surfaces

The Product, Subscription, Content (documentation/roadmap/updates/careers/timeline) and Feature Flag domains were removed from the codebase and their tables dropped by the Group H forward migration. Their public and admin routes no longer exist; see [known-issues.md](known-issues.md) for remaining documentation debt.
