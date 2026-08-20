# Sprint 3 Report — Corporate Experience, Brand Positioning & Conversion

**Status:** ✅ **COMPLETE**
**Date:** 2026-08-08
**Scope:** Frontend public experience (`ys-web`), truthfulness/content fixes, one documented backend seeder update (content only, no schema/API change)

---

## 1. Verdict

**COMPLETE** — all Phase A–G work delivered, verified by build + typecheck + lint + backend test suite + live smoke tests (en/ar).

---

## 2. Problem

The public site read as a warehouse for products/software, not a technology company with a clear offer. Content that violated corporate truthfulness rules:
- Hero claimed **"Trusted by 1,000+ businesses"** with a fake initials avatar cluster and a hardcoded **"3 Products · One Ecosystem"** count — none real.
- No "What We Do" / Services preview / process on the homepage; CTA copy was generic.
- **Ecosystem page hardcoded two non-existent products** (YS-Clinic, YS-Nexus) as "Coming Soon" — fabricated.
- **Status page claimed "All systems operational"** for services we do not monitor (Storage, Email, Website) — fabricated.
- **FAQ seeded+fallback content** referenced a non-existent product "Vortex Trader_Y"; footer menu linked to it too.
- "Software Products Company" sole positioning (SaaS-only framing) — contradicted the corporate brief ("digital technology company" breadth).

## 3. Solution Summary

### Homepage (Phase B) — `ys-web/app/[locale]/(public)/page.tsx`
New section order: **Hero → What We Do → Products → Services → Why Choose → How We Work → Final CTA**; homepage now fetches real `api.services` on the server.

- **`HeroSection.tsx`** (client): removed fake trust claims + avatar cluster + hardcoded count. New fallback copy: badge **"Digital Technology Company"**, headline "Technology for / Real Business / Problems", subline = products + custom platforms + AI. Real capability chips replace the fake trust bar; a **live product count** line renders only when the API truly returned products (never invents numbers). Primary CTA → **Start a Project** → `/contact`, secondary → **View Our Services** → `/services`.
- **NEW `CapabilitiesSection.tsx`** (server) — "What We Do": products / custom platforms / AI & automation / design, CMS-extensible via new zod schema.
- **NEW `ServicesSection.tsx`** (server) — featured or first 3 **real services** from API with honest pricing labels; hidden when no services exist.
- **NEW `HowWeWorkSection.tsx`** (server) — 5-step truthful process (Tell us → Scope & Quote → Build & Review → Testing → Launch & Support).
- **`CTASection.tsx`** — closing CTA **"Have an idea? Let's build it."** + automatic **WhatsApp button** (built only from admin-managed `settings.contacts.whatsapp_number` — never hardcoded).

### Navigation & conversion (Header)
- CTA renamed **"Get Started" → "Start a Project"** + **Contact** added to the nav (en/ar); designed to make `/products`, `/services`, `/contact` the three explicit paths.

### Services experience
- **Service detail** now answers "what happens next": 3-step honest process strip + **Start the Conversation** CTA — no invented promises.

### Truth/spability (content violations fixed)
- **Ecosystem**: removed fabricated YS-Clinic/YS-Nexus; "Coming Soon" renders only at real planned products from the API (section hidden otherwise).
- **Status**: replaced fabricated all-green list with a real-time backend `/health` probe (database/cache/API status), honest fallback when unreachable. "Real-time" claims for unmonitored services removed.
- **FAQ**: both frontend fallback and backend `CmsSeeder` now reference real products.
- **Footer product menu** (CmsSeeder): fake "Vortex Trader_Y" entry replaced with real products + cleanup query so legacy fabricated entries get deleted on re-seed.
- **About copy**: CTA reframed **"Have an idea? Let's build it."** (en+ar).

### CMS / settings
- New homepage section types (capabilities, services, process) registered in Super Admin's section editor; zod schemas added in `lib/cms/schemas.ts` for capabilities/process.

### SEO
- Homepage OpenGraph title/description updated to corporate positioning (en/ar).

## 4. Engineering — Truthful Content (defaulted "no fabrication" rule)
No fabricated counts, clients, testimonials, or availability claims introduced anywhere in the public site. WhatsApp numbers and contact values derive from backend settings exclusively; *anything that cannot be proven is either removed or labeled honestly* (status: known coverage gap shown on the page itself).

## 5. Testing

| Check | Command | Result |
|---|---|---|
| Backend unit suite | `php artisan test` (ys-api) | ✅ 60 passed — 158 assertions |
| Frontend typecheck | `npx tsc --noEmit` | ✅ clean |
| Production build | `npm run build` | ✅ 83 routes compiled |
| ESLint | `npm run lint` | ✅ 17 errors (all pre-existing baseline) — 0 new |
| Manual smoke (dev, en/ar) | `next dev` + live API | ✅ homepage renders all 6 home sections, service detail shows "What happens next" CTA, status shows real probe results, FAQ/ecosystem/about show zero fabricated claims |

## 6. Known issues (pre-existing, out of scope)
1. **Frontend ESLint baseline**: 17 errors pre-existing (PlatformProvider setState-in-effect, SearchMockModal, etc.) — unchanged by this sprint.
2. **Backend locale**: public API returns EN strings in `title` etc. when `Accept-Language: ar` is sent (backend reads `app()->getLocale()`, never the header) — the multilingual CMS fields exist but the site serves EN titles for sections in AR. Pre-existing, functional for tokens (frontend fallback copy handles AR reasonably). **Fix recommended as future sprint** (set locale middleware). Emerging as `docs/known-issues.md`.
3. **4 admin pages added earlier** (`/admin/sessions`, `login-history`, `api-tokens`, `notifications`) — dead routes/unusable; untouched per §24; flagged in technical-debt.
4. **Status page** only covers API/database/cache via `/health`; storage/email/site availability are not yet monitored — now part of the design since those services are not measurable.

## 6. Changed / created files

### Frontend (`ys-web/` root)
| File | Change |
|---|---|
| `app/[locale]/(public)/page.tsx` | homepage: new section order, services fetch, new components |
| `components/sections/HeroSection.tsx` | removed fake trust content; corporate copy + live count |
| `app/[locale]/(public)/about/page.tsx` | CTA copy refresh (en/ar) |
| `app/[locale]/(public)/ecosystem/page.tsx` | removed fabricated planned products, real-only rendering |
| `app/[locale]/(public)/faq/page.tsx` | removed "Vortex Trader_Y" refs |
| `app/[locale]/(public)/status/page.tsx` | real health-based status page |
| `app/[locale]/(public)/services/[slug]/page.tsx` | added "What happens next" strip + CTA |
| `components/layout/Header.tsx` | CTA "Start a Project", Contact nav item |
| `components/sections/CTASection.tsx` | corporate copy + WhatsApp (can be disabled) |
| `lib/cms/schemas.ts` | + `capabilitiesItem/Schema`, `process*Schema` |
| `app/admin/homepage/HomepageSectionForm.tsx` | new section types (capabilities/services/process) |

### New files
- `components/sections/CapabilitiesSection.tsx`
- `components/sections/ServicesSection.tsx`
- `components/sections/HowWeWorkSection.tsx`

### Backend (`ys-api`) — no new logic
- `database/seeders/CmsSeeder.php` — corporate hero + CTA copy, real products in FAQ/footer, cleanup of fabricated Vortex links, footer delete legacy loop
  *(The seeder update ran against dev DB; no migration created, no data type change.)*

## 7. What is NOT in this sprint (scope dogma)
- NO questionnaire/adaptive project wizard
- NO message-driven moderation (moderation/new-cycles only)
- NO new permission/role changes
- NO CRM/lead pipeline
- NO AI integration (flagged as future opportunity in section)