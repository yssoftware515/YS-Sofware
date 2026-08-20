# Database Relations

**Verification:** ✅ relations verified from Eloquent model methods + migration foreign keys.

## Entity Relationship Overview

```
roles 1───∞ users                    (users.role_id → roles.id, restrict)
users ∞───∞ products                (pivot: admin_product_access, cascade both sides)

media ∞───1 products                (products.cover_image_id → media.id, nullOnDelete)
users 1───∞ products                (products.created_by → users.id, nullOnDelete)
products 1───∞ product_releases     (product_releases.product_id → products.id, cascade)
users 1───∞ product_releases        (created_by)

products 1───∞ roadmap_items        (product_id, nullOnDelete)  [nullable]
products 1───∞ updates              (product_id, nullOnDelete)  [nullable]
users 1───∞ updates                 (author_id, nullOnDelete)
products 1───∞ timeline_entries     (product_id, nullOnDelete)  [nullable]

products 1───∞ documentation_categories (product_id, nullOnDelete) [nullable]
documentation_categories 1───∞ documentation_categories (parent_id, self-FK, nullOnDelete)
documentation_categories 1───∞ documentation_articles (category_id → cascade)
users 1───∞ documentation_articles (author_id, nullOnDelete)

users 1───∞ contact_requests        (handled_by, nullOnDelete)
users 1───∞ audit_logs              (user_id, nullOnDelete)
users 1───∞ media                   (uploaded_by, nullOnDelete)
users 1───∞ settings                (updated_by, nullOnDelete)
users 1───∞ feature_flags           (updated_by, nullOnDelete)
users 1───∞ customers / subscriptions (created_by, nullOnDelete)

customers 1───∞ subscriptions       (customer_id → cascade)
products 1───∞ subscriptions        (product_id → restrict)

menus 1───∞ menu_items              (menu_id → cascade)
menu_items 1───∞ menu_items         (parent_id, self-FK → cascade)

static_pages ∞───1 media            (cover_media_id → nullOnDelete)
static_pages ∞───1 users            (created_by)

faqs ∞───1 users                    (created_by)
careers ∞───1 users                 (created_by)
roadmap_items ∞───1 users           (created_by)

media (polymorphic):                (mediable_type, mediable_id — NO FK constraint)
```

## Relationship Notes (✅ verified)

1. **users ↔ products — `admin_product_access`**: the product-scoping pivot. Semantics: *super admin bypasses; zero rows = zero access* (fail-closed). Backfilled in data migration 2026_07_31_000004 (all users × all products).

2. **Self-referencing FKs** (documentation_categories.parent_id, menu_items.parent_id): added via explicit `Schema::table` blocks because `constrained()` fails on Postgres for UUID self-relations (documented in the migration code comments).

3. **products.current_version**: denormalized, kept in sync by `ProductReleaseObserver` (not an FK).

4. **media polymorphic relation**: `mediable_type/mediable_id` exist but are **unused by current code** — all current references use the dedicated FK columns (`cover_image_id`, `cover_media_id`) or none. ⚠️ Verified: no model defines a MorphTo for Media.

5. **Delete behaviors** (verified from migrations):
   - cascade: product_releases.product_id, documentation_articles.category_id, menu_items.menu_id, admin_product_access both sides, subscriptions.customer_id, menu_items.parent_id
   - restrict: users.role_id, subscriptions.product_id
   - nullOnDelete: all `created_by`/`author_id`/`updated_by`/`handled_by`/`uploaded_by` FKs; products.cover_image_id; static_pages.cover_media_id; optional product_id FKs on content tables

6. **timeline_entries** and **contact_requests** have no soft deletes (operational records).

7. **audit_logs**: insert-only by design — Eloquent `updating`/`deleting` events throw `LogicException`, `save()` on existing model throws, `delete()`/`forceDelete()` throw; PostgreSQL RLS revokes UPDATE/DELETE (two-layer immutability).

## Cardinality Table

| From | To | Cardinality | Via | Cascade |
|---|---|---|---|---|
| Role | User | 1:N | users.role_id | restrict |
| User | Product | N:M | admin_product_access | cascade |
| Product | ProductRelease | 1:N | product_releases.product_id | cascade |
| Product | RoadmapItem | 1:N | roadmap_items.product_id | nullOnDelete |
| Product | Update | 1:N | updates.product_id | nullOnDelete |
| Product | TimelineEntry | 1:N | timeline_entries.product_id | nullOnDelete |
| Product | DocumentationCategory | 1:N | documentation_categories.product_id | nullOnDelete |
| DocumentationCategory | DocumentationArticle | 1:N | documentation_articles.category_id | cascade |
| DocumentationCategory | DocumentationCategory | 1:N | parent_id | nullOnDelete |
| Menu | MenuItem | 1:N | menu_items.menu_id | cascade |
| MenuItem | MenuItem | 1:N | parent_id | cascade |
| Customer | Subscription | 1:N | subscriptions.customer_id | cascade |
| Product | Subscription | 1:N | subscriptions.product_id | restrict |
| User | AuditLog | 1:N | audit_logs.user_id | nullOnDelete |
| Media | Product (cover) | 1:1 (optional) | products.cover_image_id | nullOnDelete |
| Media | StaticPage (cover) | 1:1 (optional) | static_pages.cover_media_id | nullOnDelete |
