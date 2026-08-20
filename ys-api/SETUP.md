# YS Systems & Software — Backend Setup Guide

---

## Requirements

| Tool        | Version  |
|-------------|----------|
| PHP         | 8.4+     |
| Composer    | 2.x      |
| PostgreSQL  | 15+      |
| Redis       | 7+       |
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

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null          # set if Redis has a password

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

This runs 12 migrations in order:
1. roles
2. users
3. audit_logs
4. personal_access_tokens
5. settings
6. media
7. products
8. product_releases
9. content tables (docs, roadmap, updates, careers, contact, timeline)
10. feature_flags
11. search vectors (PostgreSQL FTS + GIN indexes)
12. audit_logs RLS (Row-Level Security — immutability at DB level)

---

## Step 5 — Seed Default Data

```bash
php artisan db:seed
```

This creates:
- 5 default roles (super_admin, admin, editor, content_manager, support)
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
│   ├── Product/       Product, ProductRelease, CRUD Actions, Observers
│   ├── Content/       Docs, Roadmap, Updates, Careers, Timeline
│   ├── Operations/    ContactRequest, SubmitContactRequestAction
│   ├── Search/        SearchDriver (interface), PostgresSearchDriver
│   └── System/        AuditLog(immutable), Setting, Media, FeatureFlag
│                      AuditService, FeatureFlagService, MediaUploadService
```

## Key Security Decisions

| Feature              | Implementation                              |
|---------------------|---------------------------------------------|
| Password Hashing     | bcrypt (Laravel default; `BCRYPT_ROUNDS` honored)          |
| Session Tokens       | Sanctum, 8h TTL (30d with remember)        |
| Audit Log Protection | Eloquent override + PostgreSQL RLS          |
| Feature Flags Cache  | Redis with atomic lock (stampede-safe)      |
| Email Delivery       | Async jobs via Redis queue + afterCommit()  |
| File Uploads         | Server-side MIME detection, UUID names      |
| Search               | PostgreSQL FTS with websearch_to_tsquery()  |
| Rate Limiting        | 120/min public · 5/min auth · 3/hr contact |

## API Endpoints Summary

```
GET  /api/v1/health

POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me

GET  /api/v1/public/settings
GET  /api/v1/public/search?q=...
GET  /api/v1/public/products
GET  /api/v1/public/products/{slug}
GET  /api/v1/public/docs
GET  /api/v1/public/docs/{slug}
GET  /api/v1/public/roadmap
GET  /api/v1/public/updates
GET  /api/v1/public/careers
GET  /api/v1/public/careers/{id}
GET  /api/v1/public/timeline
POST /api/v1/public/contact

# Admin (Bearer token required)
CRUD /api/v1/admin/products
CRUD /api/v1/admin/releases
CRUD /api/v1/admin/docs/categories
CRUD /api/v1/admin/docs/articles
CRUD /api/v1/admin/roadmap
CRUD /api/v1/admin/updates
CRUD /api/v1/admin/careers
CRUD /api/v1/admin/timeline
GET  /api/v1/admin/contact-requests
GET  /api/v1/admin/media
POST /api/v1/admin/media
CRUD /api/v1/admin/users
CRUD /api/v1/admin/settings
CRUD /api/v1/admin/feature-flags
GET  /api/v1/admin/audit-logs
```
