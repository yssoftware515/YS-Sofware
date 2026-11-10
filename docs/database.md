# Database

**Verification:** ✅ all tables/columns verified from `ys-api/database/migrations/` (52 migrations, 2025-01-01 → 2026-11-10, incl. Group H cleanup).

PostgreSQL 16 (docker) · UUID primary keys everywhere · jsonb for flexible data · timestamps standard.

## Migration Overview

| # | Migration | Tables/Effects |
|---|---|---|
| 000001 | `create_roles_table` | `roles` |
| 000002 | `create_users_table` | `users` |
| 000003 | `create_audit_logs_table` | `audit_logs` |
| 000004 | `create_personal_access_tokens_table` | `personal_access_tokens` (uuidMorphs) |
| 000005 | `create_settings_table` | `settings` |
| 000006 | `create_media_table` | `media` |
| 000007 | `create_products_table` | `products` — **DROPPED** by Group H (2026_11_10_000001) |
| 000008 | `create_product_releases_table` | `product_releases` — **DROPPED** by Group H |
| 000009 | `create_content_tables` | `roadmap_items`, `updates`, `documentation_categories`, `documentation_articles`, `contact_requests`, `careers`, `timeline_entries` — `careers`, `timeline_entries`, `documentation_*`, `roadmap_items`, `updates` **DROPPED** by Group H (`contact_requests` retained) |
| 000010 | `create_feature_flags_table` | `feature_flags` — **DROPPED** by Group H |
| 000011 | `add_search_vectors` | +`search_vector_en/ar` on retired tables (vectors dropped with their tables by Group H) |
| 000012 | `audit_logs_row_level_security` | RLS enabled+forced on `audit_logs`; UPDATE/DELETE revoked |
| 000013 | `create_static_pages_table` | `static_pages` |
| 000014 | `create_faqs_table` | `faqs` |
| 000015 | `create_menus_tables` | `menus`, `menu_items` |
| 000016 | `create_homepage_sections_table` | `homepage_sections` |
| 2026_06_27 | `create_jobs_table` | `jobs` (Laravel queue) |
| 2026_08_08 | `create_failed_jobs_table` | `failed_jobs` (queue dead-letter records, uuid) |
| 2026_07_26 | `add_icon_key_and_brand_color_to_products` | +`products.icon_key`, `products.brand_color` |
| 2026_07_31_000001 | `create_admin_product_access_table` | `admin_product_access` — **DROPPED** by Group H |
| 2026_07_31_000002 | `create_customers_table` | `customers` (retained; `product_id` column dropped by Group H) |
| 2026_07_31_000003 | `create_subscriptions_table` | `subscriptions` — **DROPPED** by Group H |
| 2026_07_31_000004 | `backfill_admin_product_access` | Data migration (historical; no-op `down()`); its target tables dropped by Group H |
| 2026_11_10_000001 | `drop_retired_domain_tables` | Drops the 14 retired domain tables (products, subscriptions, content, feature flags) — irreversible |
| 2026_11_10_000002 | `drop_product_id_columns` | Drops `customers.product_id` and `audit_logs.product_id` — irreversible |

Total tables: **14 app tables** + `personal_access_tokens`, `jobs`, `cache`, `sessions`, `failed_jobs`, `job_batches` (system).

## Table Details

### roles
`id` uuid PK · `name` string · `slug` string **UNIQUE** · `permissions` jsonb default `[]` · `description` nullable · timestamps

### users
`id` uuid PK · `role_id` FK→roles **restrict** · `name` · `email` **UNIQUE** · `password` · `is_active` bool default true · `last_login_at` ts nullable · `last_login_ip` varchar(45) nullable · `password_reset_token` nullable · `password_reset_expires_at` ts nullable · `remember_token` nullable · `deleted_at` (soft) · index (`email`,`is_active`)

### audit_logs (immutable)
`id` uuid PK · `user_id` FK→users **nullOnDelete** nullable · `action` string · `resource_type` string · `resource_id` uuid nullable · `old_values` jsonb nullable · `new_values` jsonb nullable · `ip_address` varchar(45) nullable · `user_agent` text nullable · `context` jsonb nullable · `created_at` only (no updated_at/deleted_at). Indexes: (`resource_type`,`resource_id`), (`user_id`,`created_at`), `action`. **RLS: insert+select only; UPDATE/DELETE revoked; Eloquent layer throws too.**

### personal_access_tokens
`id` bigint PK · `tokenable_type`+`tokenable_id` uuidMorphs (indexed) · `name` · `token` varchar(64) **UNIQUE** · `abilities` text nullable · `last_used_at` nullable · `expires_at` nullable · timestamps

### settings
`id` uuid PK · `group` string default `system` (brand|social|seo|contacts|system|content) · `key` **UNIQUE** · `value` jsonb nullable · `description` nullable · `is_public` bool default false · `content_version` tinyint default 1 · `updated_by` FK→users nullOnDelete nullable · timestamps. Indexes: `group`, (`group`,`is_public`)

### media
`id` uuid PK · `disk` default `local` · `path` · `filename` · `original_name` · `mime_type` varchar(100) · `size` bigint unsigned · `alt_text_en/ar` nullable · `mediable_type` + `mediable_id` uuid nullable (polymorphic) · `uploaded_by` FK→users nullOnDelete nullable · timestamps + `deleted_at`. Index (`mediable_type`,`mediable_id`)

### contact_requests
`id` uuid PK · `name` · `email` · `subject` nullable · `message` text · `type` default `general` · `status` default `new` (new|read|replied|archived) · `ip_address` varchar(45) nullable · `user_agent` text nullable · `spam_score` float default 0.0 · `handled_by` FK→users nullable · `handled_at` ts nullable · timestamps (no soft deletes). Indexes (`status`,`type`), `created_at`

### static_pages
`id` uuid PK · `slug` **UNIQUE** · `title_en/ar` · `excerpt_en/ar` nullable · `content_en/ar` longtext nullable · `seo_title_en/ar` varchar(70) nullable · `seo_description_en/ar` varchar(160) nullable · `cover_media_id` FK→media nullable · `status` default `draft` (draft|published|archived) · `published_at` nullable · `sort_order` default 0 · `created_by` FK nullable · timestamps + `deleted_at`. Indexes `status`, `slug`

### faqs
`id` uuid PK · `question_en/ar` · `answer_en/ar` · `category` nullable · `status` default `published` · `sort_order` default 0 · `created_by` FK nullable · timestamps + `deleted_at`. Indexes `status`, `category`

### menus
`id` uuid PK · `name` · `location` **UNIQUE** (header|footer_products|footer_company|footer_resources|footer_legal) · `is_active` bool default true · timestamps

### menu_items
`id` uuid PK · `menu_id` FK→menus **cascade** · `parent_id` **self-FK** nullable (cascade) · `title_en/ar` · `url` · `icon` nullable · `target` default `_self` · `sort_order` default 0 · `is_active` bool default true · timestamps. Indexes `menu_id`, `parent_id`

### homepage_sections
`id` uuid PK · `type` (hero|stats|why_choose|products|cta) · `title_en/ar` nullable · `subtitle_en/ar` nullable · `content` jsonb nullable · `is_enabled` bool default true · `sort_order` default 0 · timestamps. Indexes `type`, `is_enabled`

### jobs
Standard Laravel queue table (`id` bigint, `queue` indexed, `payload` longtext, `attempts`, `reserved_at`, `available_at`, `created_at`)

### admin_product_access (pivot)
`id` uuid PK · `user_id` FK→users **cascade** · `product_id` FK→products **cascade** · timestamps · **UNIQUE (`user_id`,`product_id`)** · index `user_id`

### customers
`id` uuid PK · `name` · `email` **UNIQUE** (+index) · `company` nullable · `phone` nullable · `notes` nullable · `created_by` FK nullable · timestamps

## Full-Text Search Columns (generated, migration 000011)

The search vectors/GIN indexes lived on the retired tables (`products`, `documentation_articles`, `careers`, `updates`) and were dropped together with those tables by Group H. Active search (`service`, `page`, `faq`) now uses bounded `ILIKE` queries via `PostgresSearchDriver` (see [search-pipeline.md](search-pipeline.md)).

## Seeds (✅ verified from seeders)

| Seeder | Content |
|---|---|
| RoleSeeder | 3 roles: super_admin (`*`), admin (10 permissions), support (3 permissions) |
| AdminUserSeeder | Bootstrap super admin created from `config/admin.php` (env `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`). Fails closed on blank `ADMIN_PASSWORD` — no account is created. No credential literal in source |
| SettingsSeeder | 18 settings: brand(6), social(4), seo(2), contacts(5), system(1: maintenance_mode=false) |
| CmsSeeder | 5 homepage sections, 6 FAQs, 5 menus + items, 5 static pages (about, privacy, terms, cookie-policy, security) |

`DatabaseSeeder` runs: RoleSeeder → AdminUserSeeder → SettingsSeeder → CmsSeeder. (The former `SettingsSeeder_ADDITIONS.php` merge-fragment for `content`-group settings was deleted in Sprint 1.1 — it was never a runnable seeder; if the `content` group is wanted it must be added to `SettingsSeeder`.)
