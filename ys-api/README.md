# YS Systems & Software — Backend API

Laravel 12 · PHP 8.4 · PostgreSQL · Redis · Sanctum

---

## Architecture

```
app/
├── Domains/
│   ├── Auth/
│   │   ├── Actions/         LoginAction
│   │   ├── DTOs/            LoginDTO (readonly)
│   │   ├── Models/          User, Role
│   │   ├── Policies/        ProductPolicy
│   │   └── Repositories/    PermissionRepository (future-swap abstraction)
│   ├── Product/
│   │   ├── Actions/         CreateProductAction, UpdateProductAction, DeleteProductAction
│   │   ├── DTOs/            CreateProductDTO, UpdateProductDTO (readonly)
│   │   ├── Models/          Product, ProductRelease
│   │   └── Observers/       ProductObserver, ProductReleaseObserver (auto audit + version sync)
│   ├── Content/
│   │   ├── Actions/         CreateUpdateAction, PublishUpdateAction, UnpublishUpdateAction,
│   │   │                    CreateCareerAction, UpdateCareerAction,
│   │   │                    CreateTimelineEntryAction, UpdateTimelineEntryAction,
│   │   │                    CreateDocumentationCategoryAction, UpdateDocumentationCategoryAction,
│   │   │                    CreateDocumentationArticleAction, UpdateDocumentationArticleAction,
│   │   │                    CreateRoadmapItemAction, UpdateRoadmapItemAction
│   │   └── Models/          DocumentationCategory, DocumentationArticle, RoadmapItem, Update, Career, TimelineEntry
│   ├── Operations/
│   │   ├── Actions/         SubmitContactRequestAction (with spam scoring)
│   │   └── Models/          ContactRequest
│   └── System/
│       ├── Models/          AuditLog (immutable), Setting, Media, FeatureFlag
│       └── Services/        AuditService, MediaUploadService
├── Http/
│   ├── Controllers/
│   │   ├── Auth/            AuthController
│   │   ├── Admin/           Product, Release, Documentation, Roadmap, Update,
│   │   │                    Career, Timeline, Contact, Media, User, Setting, AuditLog
│   │   └── Public/          Product, Documentation, Roadmap, Update, Career, Timeline, Contact, Setting
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
# Edit: DB_*, REDIS_*, FRONTEND_URL
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

Base URL: `http://localhost:8000/api/v1`

### Auth
| Method | Endpoint       | Auth     |
|--------|---------------|----------|
| POST   | /auth/login   | Public   |
| POST   | /auth/logout  | Required |
| GET    | /auth/me      | Required |

### Public (throttle: 120/min)
| Method | Endpoint                  |
|--------|--------------------------|
| GET    | /public/settings         |
| GET    | /public/products         |
| GET    | /public/products/{slug}  |
| GET    | /public/docs             |
| GET    | /public/docs/{slug}      |
| GET    | /public/roadmap          |
| GET    | /public/updates          |
| GET    | /public/careers          |
| GET    | /public/careers/{id}     |
| GET    | /public/timeline         |
| POST   | /public/contact          | (throttle: 3/hr) |

### Admin (Bearer token required)
| Resource        | Endpoints                                       | Permission              |
|----------------|-------------------------------------------------|-------------------------|
| Products        | CRUD /admin/products                            | manage_products         |
| Releases        | CRUD /admin/releases                            | manage_products         |
| Doc Categories  | CRUD /admin/docs/categories                     | manage_documentation    |
| Doc Articles    | CRUD /admin/docs/articles                       | manage_documentation    |
| Roadmap         | CRUD /admin/roadmap                             | manage_roadmap          |
| Updates         | CRUD + publish/unpublish /admin/updates         | manage_updates          |
| Careers         | CRUD /admin/careers                             | manage_careers          |
| Timeline        | CRUD /admin/timeline                            | manage_settings         |
| Contact         | List/View/Status /admin/contact-requests        | manage_contact_requests |
| Media           | List/Upload/Delete /admin/media                 | manage_media            |
| Users           | CRUD /admin/users                               | manage_users            |
| Settings        | List/View/Update /admin/settings                | manage_settings         |
| Audit Logs      | List /admin/audit-logs                          | view_audit_logs         |

### Response Shape
```json
{ "success": true,  "data": {}, "meta": {} }
{ "success": false, "message": "...", "code": "ERROR_CODE", "errors": {} }
```

---

## Security

- Argon2id password hashing
- Sanctum tokens: 8h default, 30d remember
- Rate limiting: 120/min public · 5/min auth · 3/hr contact
- CSP, X-Frame-Options, HSTS, fingerprint removal
- AuditLog.save() + delete() blocked — immutable by design
- Settings with is_public=false never reach public API
- Media: MIME detection (server-side), double-extension guard, randomized filenames
- Spam scoring on contact submissions

---

## Testing

```bash
php artisan test                        # All tests
php artisan test --testsuite=Feature    # Feature only
php artisan test --testsuite=Unit       # Unit only
php artisan test --coverage             # With coverage report
```

Test suites:
- `tests/Feature/Auth/AuthTest.php`         — Login, logout, me, headers
- `tests/Feature/Admin/ProductTest.php`     — Product CRUD + business rules
- `tests/Feature/Admin/DocumentationTest.php` — Docs categories + articles
- `tests/Feature/Public/PublicEndpointsTest.php` — Public visibility rules, contact
- `tests/Unit/Domains/ActionTest.php`       — Reading time, spam scoring, media security

---

## Database (12 migrations, in order)

```
roles → users → audit_logs → personal_access_tokens
→ settings → media → products → product_releases
→ content_tables (roadmap/docs/updates/careers/contact/timeline)
→ feature_flags
```

---

## Roles & Permissions

| Role            | Key Permissions                                                        |
|-----------------|------------------------------------------------------------------------|
| super_admin     | `*` (wildcard — bypasses all gates via Gate::before)                  |
| admin           | All except manage_users                                                |
| editor          | manage_documentation, manage_updates, manage_roadmap, manage_media    |
| content_manager | manage_documentation, manage_updates, manage_careers                   |
| support         | manage_contact_requests, view_products                                 |

---

## Phase Roadmap

- [x] Phase 1 — Core, Auth, RBAC, Products, Settings, Audit, Security
- [x] Phase 2 — Documentation, Releases, Roadmap, Updates, Careers, Timeline, Contact, Media
- [ ] Phase 3 — Feature Flags UI, Global Search, Email notifications
- [ ] Phase 4 — Security hardening, rate limit tuning, production readiness
