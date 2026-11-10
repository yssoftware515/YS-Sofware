# YS Systems & Software — Backend Setup Guide

---

## Requirements

| Tool        | Version  |
|-------------|----------|
| PHP         | 8.4+     |
| Composer    | 2.x      |
| PostgreSQL  | 15+      |
| Git         | any      |

---

## Step 1 — Clone & Install

```bash
git clone <your-repo-url> ys-api
cd ys-api
composer install
```

---

## Step 2 — Environment Setup

```bash
cp .env.example .env
php artisan key:generate
```

Then edit `.env` with your values:

```env
# Required changes
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ys_api
DB_USERNAME=your_postgres_user
DB_PASSWORD=your_postgres_password

FRONTEND_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000

MAIL_MAILER=smtp             # or 'log' for local development
MAIL_HOST=your_smtp_host
MAIL_PORT=587
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_password
MAIL_FROM_ADDRESS=no-reply@ys-systems.com
```

---

## Step 3 — Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Run these SQL commands:
CREATE DATABASE ys_api;
CREATE DATABASE ys_api_test;   -- for running tests

# Exit
\q
```

---

## Step 4 — Run Migrations

```bash
php artisan migrate
```

This runs migrations in order (current, post-Group H):
1. roles
2. users
3. audit_logs (RLS enabled — immutability at DB level)
4. personal_access_tokens
5. settings
6. media
7. services
8. customers
9. contact_requests
10. projects
11. tasks
12. milestones
13. menus / menu_items
14. static_pages
15. faqs
16. search vectors (retired tables dropped by Group H; active search uses bounded ILIKE via PostgresSearchDriver)
17. jobs, cache, sessions, failed_jobs (system tables)

Group H (`2026_11_10_000001`, `2026_11_10_000002`) dropped the retired domain tables and the `customers.product_id` / `audit_logs.product_id` columns. Those migrations are **irreversible by design** (`down()` throws `RuntimeException`).

---

## Step 5 — Seed Default Data

```bash
php artisan db:seed
```

This creates:
- 3 default roles (super_admin `*`, admin 10 permissions, support 3 permissions)
- 1 super admin account (only if `ADMIN_PASSWORD` is set in the environment — the seeder fails closed on a blank value)
- Default company settings

**Bootstrap admin credentials — environment-driven (never committed):**
```
ADMIN_NAME=YS Admin        (default)
ADMIN_EMAIL=admin@ys-systems.com   (default)
ADMIN_PASSWORD=<set yours in .env — REQUIRED>
```
Without a non-empty `ADMIN_PASSWORD`, `AdminUserSeeder` skips admin creation entirely and reports a warning.

⚠️  CHANGE THE PASSWORD IMMEDIATELY after first login.

---

## Step 6 — Storage Setup

```bash
php artisan storage:link
```

Then set correct permissions on the storage folder:

```bash
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache   # Linux/production
```

---

## Step 7 — Start Development Server

```bash
php artisan serve
```

API available at: `http://localhost:8000/api/v1`

---

## Step 8 — Start Queue Worker (Required for emails)

```bash
# Development
php artisan queue:work redis --queue=default

# Production (with Laravel Horizon)
php artisan horizon
```

---

## Step 9 — Verify Everything Works

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Expected response:
# {"success":true,"data":{"status":"ok","version":"1.0.0","checks":{"database":"ok","redis":"ok"}}}
```

---

## Step 10 — Run Tests

```bash
# Set test database in phpunit.xml (already configured as ys_api_test)
php artisan migrate --env=testing

# Run all tests
php artisan test

# Run with coverage
php artisan test --coverage
```

---

## Nginx Configuration (Production)

```nginx
server {
    listen 80;
    server_name api.ys-systems.com;
    root /var/www/ys-api/public;

    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Block PHP execution in media uploads directory
    location /storage/media/ {
        location ~* \.(php|php3|php4|php5|phtml|pl|py|rb|sh|bash|exe)$ {
            return 403;
        }
        add_header X-Content-Type-Options "nosniff";
        add_header Content-Security-Policy "default-src 'none'";
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

---

## Laravel Horizon (Production Queue)

```bash
# Install Horizon
composer require laravel/horizon
php artisan horizon:install

# Start Horizon
php artisan horizon

# Supervisor config: /etc/supervisor/conf.d/horizon.conf
# [program:horizon]
# command=php /var/www/ys-api/artisan horizon
# autostart=true
# autorestart=true
# user=www-data
```

---

## Architecture Overview

```
Domain-Driven Design (DDD)
├── Domains/
│   ├── Auth/          User, Role, LoginAction, LoginDTO, PermissionRepository
│   ├── Operations/    Customer, Project, Task, Milestone, ContactRequest (+ actions)
│   ├── Search/        SearchDriver (interface), PostgresSearchDriver, SearchService
│   ├── Services/      Service, ServiceObserver (audit)
│   └── System/        AuditLog (immutable), Setting, Media
│                      AuditService, MediaUploadService, HtmlSanitizerService, DashboardService
```

## Key Security Decisions

| Feature              | Implementation                              |
|---------------------|---------------------------------------------|
| Password Hashing     | bcrypt (Laravel default; `BCRYPT_ROUNDS` honored)          |
| Session Tokens       | Sanctum, 8h TTL (30d with remember)        |
| Audit Log Protection | Eloquent override + PostgreSQL RLS          |
| Feature Flags        | Removed with the Feature Flag domain (Group F/H) |
| Email Delivery       | Async jobs via database queue driver + afterCommit() |
| File Uploads         | Server-side MIME detection, UUID names      |
| Search               | Bounded ILIKE per type via PostgresSearchDriver (services, static_pages, faqs) |
| Rate Limiting        | 120/min public · 5/min auth · 3/hr contact |

## API Endpoints Summary

```
GET  /api/v1/health

POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me

GET  /api/v1/public/settings
GET  /api/v1/public/services
GET  /api/v1/public/services/{slug}
GET  /api/v1/public/search?q=...&types[]=service|page|faq
POST /api/v1/public/contact

# Admin (Bearer token required)
GET/POST  /api/v1/admin/services
GET/PUT/PATCH/DELETE  /api/v1/admin/services/{service}
GET  /api/v1/admin/contact-requests
GET  /api/v1/admin/contact-requests/{id}
PATCH  /api/v1/admin/contact-requests/{id}/status
GET/POST  /api/v1/admin/customers
GET/PUT/PATCH/DELETE  /api/v1/admin/customers/{customer}
GET/POST  /api/v1/admin/projects
GET/PUT/PATCH/DELETE  /api/v1/admin/projects/{project}
GET/POST  /api/v1/admin/tasks
GET/PUT/PATCH/DELETE  /api/v1/admin/tasks/{task}
GET/POST  /api/v1/admin/milestones
GET/PUT/PATCH/DELETE  /api/v1/admin/milestones/{milestone}
POST  /api/v1/admin/milestones/{milestone}/move
GET  /api/v1/admin/dashboard/stats
GET/POST  /api/v1/admin/users
GET/PUT/PATCH/DELETE  /api/v1/admin/users/{user}
GET  /api/v1/admin/roles
POST  /api/v1/admin/roles
GET/PUT/PATCH/DELETE  /api/v1/admin/roles/{role}
GET  /api/v1/admin/settings
GET  /api/v1/admin/settings/{setting}
PUT  /api/v1/admin/settings/{setting}
GET  /api/v1/admin/audit-logs
GET  /api/v1/admin/ops/failed-jobs
GET  /api/v1/admin/media
POST /api/v1/admin/media
CRUD /api/v1/admin/users
CRUD /api/v1/admin/settings
CRUD /api/v1/admin/feature-flags
GET  /api/v1/admin/audit-logs
```
