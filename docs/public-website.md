# Public Website

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## 1. Overview

The public website is the `app/[locale]/(public)/` area of `ys-web`. It is **server-rendered** (React Server Components) and bilingual (`en` default, `ar` with RTL). All content is CMS-driven from the backend API with 60s ISR revalidation.

## 2. Public pages (✅ verified)

| Route | Page | Data source |
|---|---|---|
| `/{locale}` | Homepage — Hero, WhyChoose, Products, CTA | `/public/homepage-sections`, `/public/products`, `/public/settings` |
| `/{locale}/about` | About | `/public/pages/about` (JSON section blocks) |
| `/{locale}/products` | Products listing | `/public/products` |
| `/{locale}/products/[slug]` | Product detail | `/public/products/{slug}` (long_desc sanitized) |
| `/{locale}/contact` | Contact form | `POST /public/contact` (client component) |
| `/{locale}/docs` + `[slug]` | Documentation | `/public/docs`, `/public/docs/{slug}` (article content sanitized) |
| `/{locale}/roadmap` | Roadmap | `/public/roadmap` |
| `/{locale}/updates` | Updates | `/public/updates` |
| `/{locale}/releases` | Releases | product releases data |
| `/{locale}/changelog` | Changelog | updates data |
| `/{locale}/careers` | Careers | `/public/careers` |
| `/{locale}/faq` | FAQ | `/public/faqs` |
| `/{locale}/security` | Security page | `/public/pages/security` |
| `/{locale}/status` | Status page | live `/health` probe (db/cache), honest fallback |
| `/{locale}/privacy` | Privacy | `/public/pages/privacy` |
| `/{locale}/terms` | Terms | `/public/pages/terms` |
| `/{locale}/cookie-policy` | Cookie policy | `/public/pages/cookie-policy` |

## 3. Layout & shell (✅ verified)

- `app/[locale]/(public)/layout.tsx` — public shell: `Header` (glass navbar, CMS-menu-driven nav, theme + locale switchers, Cmd+K search), `Footer` (CMS menus), JSON-LD (organization + breadcrumbs).
- `app/[locale]/layout.tsx` — locale validation (`en|ar`), `ThemeProvider`, `LocaleSync`.
- `app/layout.tsx` — root: fonts (DM Sans/Space Grotesk/DM Mono), inline `dir`/`lang` script, metadata.
- `app/[locale]/(public)/loading.tsx` + `error.tsx` for fallback states.

## 4. Homepage sections (✅ CMS `homepage_sections` seeded)

hero (sort 10), stats (20), why_choose (30), products (40), cta (50). Rendered by `HeroSection`, `ProductsSection`, `WhyChooseSection`, `CTASection` (`components/sections/`), validated client-side with zod schemas (`lib/cms/schemas.ts`).

## 5. i18n mechanism (✅ verified — important correction)

- **Not** next-intl (outdated `ys-web/SETUP.md` claim).
- `middleware.ts` redirects unprefixed paths to `/en/...`.
- `app/layout.tsx` sets `dir`/`lang` pre-hydration.
- Component-level hardcoded EN/AR fallback objects; CMS content provides bilingual values from API (`_en`/`_ar` fields).
- `Accept-Language` header sent on every API call.
- `i18n/messages/{en,ar}.json` exist but are unused (dead files).

## 6. Search UX (✅ verified)

`SearchModal` (components/shared) — Cmd/Ctrl+K on desktop; calls `GET /public/search?q=&locale=&limit=&types[]=`, groups results by type (`groupedByType()`), shows product/article/career/update results.

## 7. Contact form (✅ verified)

`contact/ContactClient.tsx` — client validation, `POST /public/contact`, rate-limited 3/hr/IP, spam-scored server-side; queues admin notification email.

## 8. SEO on public site (see seo.md)

- `metadata` per page via `lib/seo.ts` (`buildMetadata`, canonical, hreflang, OG/Twitter).
- JSON-LD: organization, breadcrumbs, FAQ schema.
- `sitemap.ts` (incl. docs articles), `robots.ts` (disallow `/admin`), search-engine verification meta tags, IndexNow submission on updates.

## 9. Assets (✅ verified)

`public/branding/` — hero webp (desktop/mobile), logos, product images (ys-matrix, vortex, ys-medical, ys-sports), social/icon/apple/favicon, illustrations (unused ⚠️). `next.config.ts` `images.remotePatterns` allows the API origin `/storage/**` (product covers from backend media storage).

## 10. Notes

- Status page is static copy — not connected to `/api/v1/health` or real uptime metrics. ⚠️
- `releases`, `changelog`, `status` pages are mostly static or client-side composed from products/updates APIs — no dedicated public endpoints for them.
- `/ecosystem` was removed — `middleware.ts` permanently (308) redirects it (and locale-prefixed forms) to `/products`.
- Cookie consent banner (`CookieConsent`) — client component; cookies: theme (`ys-theme`) + consent. ⚠️ No cookie value for admin token on public pages (backend sets it only on admin login).
