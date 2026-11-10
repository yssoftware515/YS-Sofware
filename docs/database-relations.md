# Database Relations

**Verification:** ✅ relations verified from Eloquent model methods + migration foreign keys (2026-11-10, after Group H cleanup).
**Important:** Group H (`2026_11_10_000001`, `2026_11_10_000002`) dropped the retired domain tables (`products`, `product_releases`, `product_media`, `product_features`, `product_pricing_plans`, `admin_product_access`, `subscriptions`, `careers`, `documentation_categories`, `documentation_articles`, `roadmap_items`, `updates`, `timeline_entries`, `feature_flags`) and the columns `customers.product_id` / `audit_logs.product_id`. Those relations are **removed** below — they are kept only in the historical migration files, which must not be modified.

---

## Entity Relationship Overview (current, post-Group H)

```
roles 1───∞ users                    (users.role_id → roles.id, restrict)

media ∞───1 services                 (services.cover_image_id → media.id, nullOnDelete)
users 1───∞ services                 (services.created_by → users.id, nullOnDelete)

users 1───∞ contact_requests        (handled_by, nullOnDelete)
users 1───∞ audit_logs              (user_id, nullOnDelete)
users 1───∞ media                   (uploaded_by, nullOnDelete)
users 1───∞ settings                (updated_by, nullOnDelete)
users 1───∞ customers               (created_by, nullOnDelete)

customers 1───∞ projects            (customer_id → nullOnDelete)
projects 1───∞ tasks                (project_id → nullOnDelete)
projects 1───∞ milestones           (project_id → nullOnDelete)
contact_requests 1───∞ projects     (contact_request_id → nullOnDelete)

menus 1───∞ menu_items              (menu_id → cascade)
menu_items 1───∞ menu_items         (parent_id, self-FK → cascade)

static_pages ∞───1 media            (cover_media_id → nullOnDelete)
static_pages ∞───1 users            (created_by)

faqs ∞───1 users                    (created_by)

media (polymorphic):                (mediable_type, mediable_id — NO FK constraint)
```

## Relationship Notes (✅ verified)

1. **Row visibility is permission-gated only.** There is **no product-level scoping** and no `admin_product_access` pivot (dropped in Group H). Every admin holding the module permission sees all rows.

2. **Self-referencing FKs** (`documentation_categories.parent_id` was dropped with content tables; `menu_items.parent_id` remains): added via explicit `Schema::table` blocks because `constrained()` fails on Postgres for UUID self-relations (documented in the migration code comments).

3. **media polymorphic relation**: `mediable_type/mediable_id` exist but are **unused by current code** — all current references use the dedicated FK columns (`cover_image_id`, `cover_media_id`) or none. ⚠️ Verified: no model defines a MorphTo for Media.

4. **Delete behaviors** (verified from migrations):
   - cascade: `menu_items.menu_id`, `menu_items.parent_id`
   - restrict: `users.role_id`
   - nullOnDelete: all `created_by`/`author_id`/`updated_by`/`handled_by`/`uploaded_by` FKs; `services.cover_image_id`; `static_pages.cover_media_id`; `projects.customer_id`; `projects.contact_request_id`; `tasks.project_id`; `milestones.project_id`

5. **contact_requests** and **milestones** have no soft deletes (operational records). `projects`, `tasks` use soft deletes.

6. **audit_logs**: insert-only by design — Eloquent `updating`/`deleting` events throw `LogicException`, `save()` on existing model throws, `delete()`/`forceDelete()` throw; PostgreSQL RLS revokes UPDATE/DELETE (two-layer immutability). `product_id` column dropped in Group H.

## Cardinality Table (current)

| From | To | Cardinality | Via | Cascade |
|---|---|---|---|---|
| Role | User | 1:N | users.role_id | restrict |
| User | Service | 1:N | services.created_by | nullOnDelete |
| Media | Service (cover) | 1:1 (optional) | services.cover_image_id | nullOnDelete |
| User | ContactRequest | 1:N | contact_requests.handled_by | nullOnDelete |
| User | AuditLog | 1:N | audit_logs.user_id | nullOnDelete |
| User | Media | 1:N | media.uploaded_by | nullOnDelete |
| User | Settings | 1:N | settings.updated_by | nullOnDelete |
| User | Customer | 1:N | customers.created_by | nullOnDelete |
| Customer | Project | 1:N | projects.customer_id | nullOnDelete |
| ContactRequest | Project | 1:N | projects.contact_request_id | nullOnDelete |
| Project | Task | 1:N | tasks.project_id | nullOnDelete |
| Project | Milestone | 1:N | milestones.project_id | nullOnDelete |
| Menu | MenuItem | 1:N | menu_items.menu_id | cascade |
| MenuItem | MenuItem | 1:N | parent_id | cascade |
| Media | StaticPage (cover) | 1:1 (optional) | static_pages.cover_media_id | nullOnDelete |
| User | StaticPage | 1:N | static_pages.created_by | nullOnDelete |
| User | FAQ | 1:N | faqs.created_by | nullOnDelete |

## Dropped relations (Group H — historical reference only)

The following relations existed in historical migrations and were **dropped** by Group H. They are **not** part of the current schema and must not be recreated:

- `users` ⇄ `products` via `admin_product_access` (N:M pivot) — dropped
- `products` → `product_releases` (1:N) — dropped
- `products` → `roadmap_items` / `updates` / `timeline_entries` / `documentation_categories` (1:N) — dropped
- `documentation_categories` → `documentation_articles` (1:N) — dropped
- `customers` ⇄ `subscriptions` (1:N) — dropped
- `products` ⇄ `subscriptions` (1:N, restrict) — dropped
- Media ⇄ products (polymorphic `product_media`, `product_features`, `product_pricing_plans`) — dropped

## Seeds (✅ verified from seeders)

| Seeder | Content |
|---|---|
| RoleSeeder | 3 roles: super_admin (`*`), admin (10 permissions), support (3 permissions) |
| AdminUserSeeder | Bootstrap super admin from `config/admin.php` (env `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`). Fails closed on blank `ADMIN_PASSWORD` |
| SettingsSeeder | 18 settings: brand(6), social(4), seo(2), contacts(5), system(1) |
| ServicesSeeder | 11 services catalog |
| CmsSeeder | homepage sections, FAQs, menus + items, static pages |

`DatabaseSeeder` runs: RoleSeeder → AdminUserSeeder → SettingsSeeder → ServicesSeeder → CmsSeeder.
