# SEO

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## 1. Foundation (✅ verified)

- **Next.js metadata API** per page (`app/[locale]/(public)/**/page.tsx`).
- **`lib/seo.ts`** — `buildMetadata()` (title, description, canonical, hreflang en/ar, OpenGraph, Twitter), `buildMetadataFromRegistry()`, `breadcrumbJsonLd()`, and a singleton `seoRegistry` for cross-page contributions.
- **Canonical + hreflang** — built from `NEXT_PUBLIC_APP_URL` + locale.

## 2. Structured data (JSON-LD, ✅ verified)

| Schema | Where |
|---|---|
| Organization | `app/[locale]/(public)/layout.tsx` |
| Breadcrumbs | `(public)/layout.tsx` |
| FAQPage | `app/[locale]/(public)/faq/page.tsx` |
| Product-ish JSON-LD | `products/[slug]/page.tsx` |

## 3. Sitemap & robots (✅ verified)

- `app/sitemap.ts` — public routes + documentation articles (`/public/docs` + detail slugs).
- `app/robots.ts` — allows all except `/admin` (disallowed for crawlers).
- Backend `public/robots.txt` — exists (basic).

## 4. Search engine verification + IndexNow (✅ verified)

- `lib/search-verification.ts` — Google/Bing/Yandex verification meta tags from env vars; `submitIndexNow()` posts to `https://api.indexnow.org/indexnow` (protocol key from `NEXT_PUBLIC_INDEXNOW_KEY`).
- ⚠️ IndexNow submission is invoked from the **frontend** — triggered on publish/update events? ❓ Verify call sites: the function exists; whether the admin forms call it after publish is unverified (grep found definition; callers ❓).

## 5. SEO per content type (✅ verified)

| Content | SEO fields |
|---|---|
| Products | `seo_meta` (title_en/ar max 70, description_en/ar max 160) — editable in admin |
| Static pages | `seo_title_en/ar` (max 70), `seo_description_en/ar` (max 160) |
| Documentation articles | title-based metadata (no dedicated SEO fields) |
| Global defaults | settings `default_og_title_en/ar` (seeded) |

## 6. Performance for SEO (✅)

- ISR 60s keeps pages fresh; SSR = crawlable content (no client-side-only rendering of main content).
- Bilingual URLs `/en/...`, `/ar/...` with hreflang — good international SEO setup.

## 7. Gaps & notes

| # | Gap | Status |
|---|---|---|
| SEO-1 | `status`, `releases`, `changelog` pages rely on static copy or composed data — metadata may be generic. `/ecosystem` was removed (permanent 308 redirect to `/products` in `middleware.ts`). | ⚠️ |
| SEO-2 | IndexNow call sites unverified. | ❓ |
| SEO-3 | No XML sitemap for admin (correct — admin is disallowed). | ✅ |
| SEO-4 | No `og:image` per page verified beyond defaults. | ⚠️ |
| SEO-5 | `NEXT_PUBLIC_APP_URL` default `https://ys-systems.com` in `.env.example` — production domain assumed. | ⚠️ confirm with owner |
