# Sprint 2 — Company Platform Evolution

**Period:** 2026-08-08
**Scope:** company platform evolution — services showcase, richer product catalogs, "What do you need?" contact flow, admin management UIs. No CRM/ERP/lead/revenue systems were introduced (explicitly out of scope).
**Ground truth:** every status below re-verified against source, routes, and live test runs during this closeout. Verification marks: `+` = code-verified/live-verified · `~` = partially · `?` = unknown/open.

---

## SPRINT 2 VERDICT: **GO**

Backend 60/60 tests (158 assertions) green, Pint clean on touched files, `php artisan test` re-run after frontend-side bug fixes, frontend `tsc` clean, `next build` successful (83 pages incl. all new routes), ESLint unchanged at the 17 documented pre-existing errors (none introduced by Sprint 2). Public + admin live endpoints smoke-tested against the running local API (migrations applied to dev DB, seed data verified through the public API JSON).

---

## Sprint goals delivered

| Goal | Status |
|---|---|
| §2 — Public `/services` index + detail pages (bilingual, JSON-LD, safe description rendering) | + RESOLVED |
| §3 — Public product detail upgrade (value proposition band, target audience, logo, product/documentation/support URLs, features, pricing plans, media gallery, JSON-LD SoftwareApplication) | + RESOLVED |
| §4 — "What do you need?" picker on the contact page (13 request types, bilingual; lands in contact_requests.request_type) | + RESOLVED |
| §5 — Admin products form upgrade (value proposition, target audience, product links, logo, features, pricing plans, media attachments) | + RESOLVED |
| §6 — Admin services CRUD (list/filter/status/pricing, full form, delete guard for active) + permissions `view_services`/`manage_services` | + RESOLVED |
| §7 — Admin contact-requests (list w/ status + request_type filters, detail w/ status actions, auto read-marking) | + RESOLVED |
| §8 — Nav/header/sitemap/breadcrumbs/Widget updates for the new surfaces | + RESOLVED |
| §9 — Testing: backend regression + new Service/Contact/Product tests | + RESOLVED |
| §10 — Verification (integration gate, security gate, funding guard) | + RESOLVED (see below) |
| No CRM/ERP/leads/revenue systems build, no fabricated data, prices never float | + preserved |

---

## 1. Data model (backend, all verified)

Six new migrations (`database/migrations/2026_08_08_00000{1..6}`):

| Migration | Purpose |
|---|---|
| `000001` | `products` catalog columns: `value_proposition_en/ar`, `target_audience_en/ar`, `logo_image_id` (FK media), `product_url`, `documentation_url`, `support_url` |
| `000002` | `product_media` pivot (`media_id`, `kind` hero/gallery/screenshot, `sort_order`) |
| `000003` | `product_features` (`title_en/ar`, `description_en/ar`, `sort_order`) |
| `000004` | `product_pricing_plans` (`name_en/ar`, `pricing_type`, `price` decimal(12,2), `currency`, `billing_cycle`, `is_featured`) |
| `000005` | `services` (bilingual names/descriptions, `category`, `pricing_type`, `starting_price` decimal(12,2), `currency`, `billing_cycle`, `status`, `is_featured`) |
| `000006` | `contact_requests.request_type` (nullable, index) |

Models (+ observers, scopes, constants): `ProductMedia` (KINDS), `ProductFeature`, `ProductPricingPlan` (PRICING_TYPES + CYCLES), `Service` (STATUSES + PRICING_TYPES + BILLING_CYCLES), `ServiceObserver` (audited via `AuthServiceProvider`), `Product` relations `logoImage`/`mediaAttachments`/`features`/`pricingPlans` + scopes. `ContactRequest::REQUEST_TYPES` (13 entries) + `request_type` fillable + `isNew()`.

## 2. Backend services & API (admin + public)

- Actions/DTOs: `CreateProductAction`/`UpdateProductAction` with SQL-injecting `SyncProductRelationsAction` (full-replace features/pricing/media; money normalized to 2-dp strings via `number_format`); DTOs `CreateProductDTO`/`UpdateProductDTO` (sanitized `long_desc` via `HtmlSanitizerService`; `toArray()` **excludes** nested lists — handled separately).
- Requests: `Create/UpdateProductRequest` (bilingual required, features max 50, pricing max 20, media max 50, `pricing_type`/`kind` validated against model constants, URLs must pass `url` rule); `Create/UpdateServiceRequest` (bilingual, slug unique + lowercase via `prepareForValidation()`, price `min:0 max:9999999999`, currency 3 chars). **Bug fixed this sprint:** `UpdateServiceRequest` had `currency_cc` instead of `currency`; `update()` in `ServiceController` now applies the same money/currency normalization as `store()`.
- Controllers:
  - `Admin\ServiceController` — index (filters: status, category, search; paginated), store (201, default `inactive`), show, update, destroy (422 if `active`).
  - `Public\ServiceController` — index (only `active`, ordered, localized cover) and show by `slug`.
  - `Admin\ProductController` — eager loads every nested relation for index/show/update.
  - `Public\ProductController::show` — loads `coverImage, logoImage, features, pricingPlans, mediaAttachments.media, latestRelease`.
  - `Public\ContactController` — `request_type` validated against `REQUEST_TYPES`.
  - `Admin\ContactRequestController::index` — `status`, `type`, `request_type`, `search` filters; `show` auto-marks `new` → `read` (audited); `updateStatus` (only `new|read|replied|archived`, writes `handled_by`/`handled_at`, audited).
- Resources: `Admin\ServiceResource` (cover_image + creator, all bilingual fields); `Public\ServiceResource`/`Public\ServiceDetailResource` (localized, plain-text description — never HTML); `Admin\ProductResource` extended (all new fields incl. features/pricing/media with `whenLoaded` null-guards); `Public\ProductDetailResource` extended (localized value prop/audience/links/features/plans/media).
- Routes (`routes/api.php`): `apiResource('services', ...)` under admin group; `GET public/services` + `public/services/{slug}`; existing contact routes unchanged.
- Settings: `SettingsSeeder` adds `contacts.whatsapp_number` + `whatsapp_display` (public).
- Permissions: `Permission.php` gains `view_services`/`manage_services` (verified), Admin role seeded with both; gates verified in `AuthServiceProvider`.

## 3. Frontend implementation

### Public
- `types/index.ts`: extended `ProductDetail` (`value_proposition`, `target_audience`, `logo_image`, URLs, `features`, `pricing_plans`, `media`), new `PublicFeature/PublicPricingPlan/PublicMediaItem`, `Service/ServiceDetail`, `REQUEST_TYPES` + `ContactFormData.request_type`, `PublicSettings.contacts` whatsapp fields. *(Fixed: `media: PublicMedia[]` → `PublicMediaItem[]`.)*
- `lib/api/client.ts`: `services()`, `service()`.
- `app/[locale]/(public)/services/page.tsx`: hero + responsive grid, cover image/fallback initials, pricing label (e.g. "Starting at 5,000 USD"), featured badge, empty state, localized metadata.
- `app/[locale]/(public)/services/[slug]/page.tsx`: localized detail, description rendered as safe pre-wrap text, JSON-LD `Service` + `Offer` (only when real price), pricing sidebar, bilingual CTA to contact form.
- `app/[locale]/(public)/products/[slug]/page.tsx` (upgraded): logo, status badge, version chip, CTA row (Launch/product_url + docs/support links), JSON-LD `SoftwareApplication` w/ offer availability tied to status, value-prop band, overview + sanitized long description, latest release + target bugs sidebar, features grid, pricing display incl. "Custom Quote"/"Free", media gallery.
- `ContactClient.tsx` (rewritten): "What do you need?" picker grid (13 types, aria-pressed), WhatsApp deep link from `whatsapp_number` (sanitized digits + encoded message), bilingual labels, success/error states.

### Admin
- `app/admin/services/{page,new,[id]}` + `components/admin/ServiceForm.tsx`: full bilingual form + cover image via media picker, price/currency normalized (auto-uppercase currency), searchable list w/ status badges.
- `app/admin/contact-requests/{page,[id]}` + `lib/admin/api.ts` `adminPatch`: status filter + type filter, detail with auto-read, workbook actions.
- `app/admin/products/[id]` extended (loads all new fields), `components/admin/ProductForm.tsx` (new sections: value prop, audience, links, cover/logo pickers via `MediaPickerModal`, features, pricing plans, media).
- `components/admin/MediaPickerModal.tsx`: searchable media-library picker (no second upload system).
- `modules/core/navigation.ts`, `widgets.ts` (Services + Inquiries widgets), `permissions.ts` (Services group with `view_services`/`manage_services` — verified against `Permission.php`).
- Header + breadcrumbs + sitemap updated for `/services`; dynamic services sitemap entries.

## 4. Verification (this sprint, all executed)

- Backend: `php artisan test` → **60 passed (158 assertions)**; re-run green after the `currency`/money fixes.
- Backend Pint: `vendor/bin/pint` on touched files — passed.
- Backend migrations applied to live local dev DB; public endpoints smoke-tested: `GET /api/v1/public/services` (200), `GET /api/v1/public/services/custom-development` (200, `starting_price` returned `"5000.00"`), `GET /api/v1/public/products/ys-matrix` (200, full extended JSON), contact POST validated + stored.
- Frontend: `tsc --noEmit` clean; `next build` OK (83 routes, standalone); eslint only documents the 17 pre-existing errors/7 warnings (not introduced here).
- Integration gate (§10): exercised services/products admin CRUD + contact flow live; guard rails (authorization 403 via missing permission, delete guards, validation 422s) re-confirmed by the automated test suite.

## 5. Security & data guard

- No new auth permissions beyond `view_services`/`manage_services`; all admin routes sit behind the existing admin middleware + `authorize()` checks.
- Public endpoints never expose `_en/_ar` raw dual columns raw counts to unknown internal fields; `request_type` validated against an allowlist (not free text).
- Localized contacts sanitized at DTO layer once (`HtmlSanitizerService`); long desc rendered only via sanitize helper on the frontend.
- URL fields strictly validated (`url` rule, external links open with `noopener` + only `https://` for CTA/CTR).
- Money values never float: `number_format(…, 2, '.', '')` strings both sides; `price` capped at 9999999999.
- Requirements: no CRM/ERP/leads/revenue pipeline, no fabricated pricing/testimonials/stats (all data admin-entered and truthful), no backend in frontend.

## 5. Files changed/created (Sprint 2)

Backend (`ys-api/`):
- Migrations: `2026_08_08_000001..000006` (catalog fields, product_media, product_features, product_pricing_plans, services, contact_requests.request_type)
- Models/DTOs/Actions: `Product` (extended), `ProductMedia`, `ProductFeature`, `ProductPricingPlan`, `Service`, `ServiceObserver` (new), `Create/UpdateProduct(DTO|Action)`, `SyncProductRelationsAction`, `SubmitContactRequestAction` (extended), `ContactRequest` (extended)
- Requests/Controllers/Resources: `Create/UpdateProductRequest` (extended), `Create/UpdateServiceRequest` (new), `ServiceController` (admin + public), `ContactController` (public), `ContactRequestController` (extended), `ProductController` admin/public (eager loads), `Admin/ProductResource`, `Public/ProductDetailResource`, `Admin/ServiceResource`, `Public/ServiceResource`, `Public/ServiceDetailResource`
- Settings/Routes/Permissions: `SettingsSeeder`, `routes/api.php`, `Enums/Permission.php`, `RoleSeeder`, `AuthServiceProvider`
- Tests: `ProductTest` extended, `ServiceTest` (new), `ContactTest` (new)

Frontend (`ys-web/`):
- `types/index.ts`, `lib/api/client.ts` (+`adminPatch` in `lib/admin/api.ts`), `modules/core/{navigation,widgets,permissions}.ts`
- Public: `app/[locale]/(public)/services/{page.tsx,[slug]/page.tsx}` (new), `.../products/[slug]/page.tsx` (upgraded), `.../contact/ContactClient.tsx` (rewritten), `.../layout.tsx` breadcrumbs, `components/layout/Header.tsx`, `app/sitemap.ts`
- Admin: `app/admin/services/{page,new,[id]}`, `app/admin/contact-requests/{page,[id]}`, `app/admin/products/[id]` (extended), `components/admin/{ServiceForm,ProductForm,MediaPickerModal}.tsx` (new; ProductForm upgraded)

## 6. Known follow-ups (not Sprint-blocking)

1. Frontend ESLint backlog (17 pre-existing errors) — unchanged, owner backlog.
2. `docs/FRONTEND_STRUCTURE.md` was deleted in an earlier session (was tracked in git; now untracked) — no Sprint-2 action.
3. `NEXT_PUBLIC_API_URL` repo var must be set for deployment (unchanged from Sprint 1).
4. Localization via `Accept-Language` is honored by backend resources through `app()->getLocale()`; the local dev API defaults to `en`, matching the existing platform behavior (all public resources) — no change.
5. The 4 dead admin pages (`sessions`, `login-history`, `api-tokens`, `notifications`) remain without backend routes — owner decision pending (Sprint 1 carry-over).

---

## Scope guard

- No CRM/ERP/leads/email automation/revenue submitting systems, no multi-tenant SaaS hosting, no auth redesign, no chat.
- No SLO/fake pricing stats; every number shown is admin-entered through the new forms.
- No new media system (media picker reuses existing `/admin/media`).