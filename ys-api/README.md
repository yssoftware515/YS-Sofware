# YS Systems & Software — Backend API

Laravel 12 · PHP 8.4 · PostgreSQL · Sanctum

---

## Architecture

```
app/
├── Domains/
│   ├── Auth/
│   │   ├── Actions/         LoginAction, ...
│   │   ├── DTOs/            LoginDTO (readonly)
│   │   ├── Models/          User, Role
│   │   ├── Policies/        (none — gate-based authorization)
│   │   └── Repositories/    PermissionRepository
│   ├── Operations/
│   │   ├── Actions/         SubmitContactRequestAction (spam scoring), ...
│   │   └── Models/          Customer, Project, Task, Milestone, ContactRequest
│   ├── Search/
│   │   ├── Contracts/       SearchDriver
│   │   ├── Drivers/         PostgresSearchDriver
│   │   ├── DTOs/            SearchResult
│   │   ├── Enums/           SearchType, SearchLocale
│   │   ├── Rules/           SearchRules
│   │   └── Services/        SearchService
│   ├── Services/
│   │   ├── Actions/         ...
│   │   ├── DTOs/            ...
│   │   ├── Enums/           ServicePricingType, ServiceBillingCycle, ServiceStatus
│   │   ├── Models/          Service
│   │   └── Observers/       ServiceObserver (audit)
│   └── System/
│       ├── Models/          AuditLog (immutable), Setting, Media
│       └── Services/        AuditService, MediaUploadService, HtmlSanitizerService,
│                            DashboardService, HealthCheckService, SafeUrl (Rule)
├── Http/
│   ├── Controllers/
│   │   ├── Auth/            AuthController
│   │   ├── Admin/           Services, ContactRequests, Customers, Projects, Tasks,
│   │   │                    Milestones, Users, Roles, Settings, AuditLogs, FailedJobs
│   │   └── Public/          Settings, Services, Search, Contact
│   ├── Middleware/          SecurityHeaders, EnsureUserIsActive, ForceJsonResponse
│   └── Requests/            FormRequests per domain
├── Exceptions/              Handler (consistent JSON), Auth exceptions
└── Providers/               AppServiceProvider, AuthServiceProvider (all gates + observers)
```

---

## Setup

```bash
git clone <repo> && cd ys-api
composer install
cp .env.example .env
# Edit: DB_*, APP_*, FRONTEND_URL, CACHE_STORE=file|array, QUEUE_CONNECTION=database|sync
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

Bootstrap admin (created by `AdminUserSeeder` from env, fails closed when unset):
- Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before running `php artisan db:seed`
- Defaults: `ADMIN_EMAIL=admin@ys-systems.com`, `ADMIN_NAME=YS Admin`; password has no default — a blank
  `ADMIN_PASSWORD` skips admin creation entirely (fail closed), never a known/committed credential
**Change the password immediately after first login.**

---

## API Reference

Base URL: `http://localhost:8000/api/v1` (or `NEXT_PUBLIC_API_URL`)

### Auth
| Method | Endpoint       | Auth     |
|--------|---------------|----------|
| POST   | /auth/login   | Public   |
| POST   | /auth/logout  | Required |
| GET    | /auth/me      | Required |
| POST   | /auth/change-password | Required |
| POST   | /auth/forgot-password | Public |
| POST   | /auth/reset-password  | Public |

### Public (throttle: 120/min, except search & contact)
| Method | Endpoint                  |
|--------|--------------------------|
| GET    | /public/settings         |
| GET    | /public/services         |
| GET    | /public/services/{slug}  |
| GET    | /public/search           | (throttle: search = 60/min; types: service, page, faq) |
| POST   | /public/contact          | (throttle: contact = 3/hr) |

### Admin (Bearer token required)
| Resource        | Endpoints                                       | Permission              |
|----------------|-------------------------------------------------|-------------------------|
| Dashboard      | GET /admin/dashboard/stats                      | per widget (view_financials for money) |
| Services       | CRUD /admin/services                            | view_services / manage_services |
| Contact        | List/View/Status/Link/Convert /admin/contact-requests | manage_contact_requests |
| Customers      | CRUD /admin/customers                           | view_customers / manage_customers |
| Projects       | CRUD /admin/projects                            | view_projects / manage_projects |
| Tasks          | CRUD /admin/tasks                               | view_projects / manage_projects |
| Milestones     | CRUD + move /admin/milestones                   | view_projects / manage_projects |
| Users          | CRUD /admin/users                               | manage_users |
| Roles          | CRUD /admin/roles                               | manage_users (read) / manage_admins (write) |
| Settings       | List/View/Update /admin/settings                | manage_settings |
| Audit Logs     | List /admin/audit-logs                          | view_audit_logs |
| Failed Jobs    | GET /admin/ops/failed-jobs                      | view_audit_logs (read-only) |

### Response Shape
```json
{ "success": true,  "data": {}, "meta": {} }
{ "success": false, "message": "...", "code": "ERROR_CODE", "errors": {} }
```

---

## Removed surfaces (Group H)

The Product, Subscription, Content (documentation/roadmap/updates/careers/timeline) and Feature Flag domains were removed. Their routes, tables, controllers, and permissions no longer exist:
- Dropped tables: `products`, `product_releases`, `product_media`, `product_features`, `product_pricing_plans`, `admin_product_access`, `subscriptions`, `careers`, `documentation_categories`, `documentation_articles`, `roadmap_items`, `updates`, `timeline_entries`, `feature_flags`
- Dropped columns: `customers.product_id`, `audit_logs.product_id`
- Removed permission: `manage_products`, `view_products`, `manage_documentation`, `manage_roadmap`, `manage_updates`, `manage_careers`, `manage_media`, `manage_timeline`, `manage_feature_flags`, `manage_faqs`, `manage_menus`, `manage_homepage`, `manage_static_pages`, `manage_subscriptions`
- Row visibility is now permission-gated only (no product-level scoping).
- Group H migrations (`2026_11_10_000001`, `2026_11_10_000002`) are **irreversible by design** (`down()` throws `RuntimeException`). Rollback is not supported — restore from a database backup if applied in error.

---

## Testing

```bash
php artisan test                        # All tests (359 passed / 1313 assertions)
php artisan test --testsuite=Feature    # Feature only
php artisan test --testsuite=Unit       # Unit only
```

Test suites cover: Auth, Services, ContactRequests, Customers, Projects, Tasks, Milestones, Users, Roles, Settings, AuditLogs, Search, Public endpoints, Security.

---

## Database (current, post-Group H)

Retained tables: `users`, `roles`, `services`, `customers`, `projects`, `tasks`, `milestones`,
`contact_requests`, `audit_logs`, `media`, `settings`, `menus`, `menu_items`, `static_pages`,
`faqs`, `personal_access_tokens`, plus system tables `jobs`, `cache`, `sessions`, `failed_jobs`.

Seeded: 3 roles (super_admin `*`, admin 10 permissions, support 3 permissions), 11 services,
default settings, homepage sections, FAQs, menus, static pages.

---

## Roles & Permissions

| Role            | Key Permissions                                                        |
|-----------------|------------------------------------------------------------------------|
| super_admin     | `*` (wildcard — bypasses all gates via Gate::before)                  |
| admin           | manage_settings, manage_contact_requests, view_audit_logs, view_services, manage_services, view_customers, manage_customers, view_projects, manage_projects, view_financials |
| support         | manage_contact_requests, view_customers, manage_customers |

Permission checks fail closed; the `Permission` enum is a closed list validated by role requests.
Row visibility is permission-gated only — no product-level scoping.
