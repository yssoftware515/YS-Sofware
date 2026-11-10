# Features

**Verification:** ✅ verified from `routes/api.php` (68 routes), `RoleSeeder.php`, and controller `authorize()` calls (2026-11-10, after Group H).

---

## Public-facing features (✅ verified)

| Feature | Public API | Notes |
|---|---|---|
| Settings (public) | `GET /public/settings` | `is_public=true` only |
| Services catalog | `GET /public/services`, `GET /public/services/{slug}` | Active services only |
| Global search | `GET /public/search?q=&locale=&limit=&types[]=` | Types: `service`, `page`, `faq`; throttle `search` = 60/min |
| Contact | `POST /public/contact` | Spam-scored, queues admin notification; throttle `contact` = 3/hr |

**Removed public surfaces** (Product catalog, Documentation, Roadmap, Updates, Careers, Timeline and their admin CRUD): routes dropped with the retired domains in Groups A–F/H; see [known-issues.md](known-issues.md) for remaining documentation debt.

### Search contract

- `q` required, 2–200 characters.
- `types[]` optional; when omitted all types are searched. Unknown types → 422.
- `locale` optional (`en`\|`ar`); defaults to request/app locale.
- `limit` optional, 1–50 (default 20).
- Results ordered `service` → `page` → `faq`, then by URL; `meta.total` is a real COUNT per type; `data.grouped` contains one key per matched type.
- Only publicly reachable content is searchable: `services`, `static_pages`, `faqs`.

---

## Admin features (all: `auth:sanctum` + active user; permission per controller)

| Feature | Routes | Permission |
|---|---|---|
| Dashboard stats | `GET /admin/dashboard/stats` | per widget (`view_financials` for money fields) |
| Services | `GET/POST /admin/services`, `GET/PUT|PATCH/DELETE /admin/services/{service}` | `view_services`/`manage_services` |
| Contact Requests | list/show/status/link/convert/unlink | `manage_contact_requests` |
| Customers | `GET/POST /admin/customers`, `GET/PUT|PATCH/DELETE /admin/customers/{customer}`, `PATCH /status` | `view_customers`/`manage_customers` |
| Projects | `GET/POST /admin/projects`, `GET/PUT|PATCH/DELETE /admin/projects/{project}`, `PATCH /status` | `view_projects`/`manage_projects` |
| Tasks | `GET/POST /admin/tasks`, `GET/PUT|PATCH/DELETE /admin/tasks/{task}`, `PATCH /status` | `view_projects`/`manage_projects` |
| Milestones | `GET/POST /admin/milestones`, `GET/PUT|PATCH/DELETE /admin/milestones/{milestone}`, `PATCH /status`, `POST /move` | `view_projects`/`manage_projects` |
| Users | `GET/POST /admin/users`, `GET/PUT|PATCH/DELETE /admin/users/{user}` | `manage_users` |
| Roles | `GET /admin/roles`, `POST /admin/roles`, `GET/PUT|PATCH/DELETE /admin/roles/{role}` | index `manage_users`; write `manage_admins` |
| Settings | `GET /admin/settings`, `GET /admin/settings/{setting}`, `PUT /admin/settings/{setting}` | `manage_settings` |
| Audit Logs | `GET /admin/audit-logs` | `view_audit_logs` |
| Ops / failed jobs | `GET /admin/ops/failed-jobs` | `view_audit_logs` (read-only; payload never returned) |

**Removed admin surfaces:** Products, Releases, Documentation, Roadmap, Updates, Careers, Timeline, Menus, Homepage, FAQs, Media, Feature Flags, Subscriptions — controllers/routes/tables dropped in Groups A–F/H.

---

## Seeded roles (3)

| Role | Summary |
|---|---|
| Super Admin | `['*']` — full access |
| Admin | 10 permissions (everything except `manage_users`/`manage_admins`) |
| Support | 3 permissions (contact requests + customers) |
