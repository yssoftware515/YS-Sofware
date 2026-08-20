# Sprint 4 Report — Customer Request Experience & Localization Foundation

**Status:** ✅ **COMPLETE**
**Date:** 2026-08-08
**Sprint goal:** Turn the generic contact form into a structured **customer request experience** (3 intent paths) and fix the **non-functional API localization** (Accept-Language was ignored by the backend).

---

## What was delivered

### 1. API localization foundation (Phase B)

Before this sprint, the backend read `app()->getLocale()` which was **always `en`** — every public resource (products, services, homepage sections, FAQ, menus, careers…) returned English even when the client sent `Accept-Language: ar`. The frontend never suffered because it sends `?locale`-style hints per path, but any API consumer got English-only.

- **New middleware** `ys-api/app/Http/Middleware/ResolveLocale.php` (registered globally in `bootstrap/app.php`), which:
  - parses `Accept-Language` per RFC 9110 (q-values, region variants like `ar-EG`, multiple ranges),
  - accepts **only** the supported whitelist `en | ar`,
  - falls back to the default locale when nothing matches (`fr`, `*`, malformed headers),
  - **never passes an unvalidated value into `app()->setLocale()`**.
- All public resources now genuinely localize for API clients that send the header.

### 2. Structured project request experience (Phases C & D)

The one-size-fits-all contact form is replaced by a **3-path experience** on the public contact page:

1. **I know what I need** — type picker (existing `REQUEST_TYPES`, unchanged set), a **small set of contextual optional questions per type** (e.g. website → "already have a website?", AI → "what process should it improve?"), budget range, expected timeline, company name, contact preference (email / WhatsApp + number), project description.
2. **I have an idea** — free-form description of the rough idea plus contact details.
3. **I'd rather talk first** — one-tap WhatsApp (built from `settings.contacts.whatsapp_number`, never hardcoded, prefilled message without sensitive data) and email cards.

Customers can switch paths at any time; a success screen offers a WhatsApp follow-up CTA.

### 3. Backend data model extensions (Phase C)

`contact_requests` gains **5 new columns** (migration `2026_08_08_000007_add_project_request_fields_to_contact_requests_table.php`): `company_name`, `contact_preference` (`email|whatsapp`), `phone`, `budget_range` (bounded enum), `timeline` (bounded enum), plus a **`details` JSON column** for the contextual answers. Validation is strict:

- `phone` is **required when WhatsApp** is the preferred channel (`required_if`),
- budget/timeline values restricted to the existing `BUDGET_RANGES`/`TIMELINES` enums on the model (no second vocabulary invented),
- `details` values are free-form strings, capped at 500 chars each, 64 keys max; **nested arrays rejected**,
- all legacy fields (subject, type, request_type) remain accepted — the API stayed backward-compatible.

### 4. Admin improvements (Phase E)

- **Status lifecycle** upgraded from `new|read|replied|archived` to `new → reviewing → contacted → in_progress → completed` (+`archived`). Legacy rows (`read`/`replied`) are normalized to **reviewing** in the UI and on the backend (`ContactRequest::normalizeStatus()`), so no old data looks "unknown".
- Opening a request auto-marks it `new → reviewing` (previously `new → read`).
- List & detail pages show company, preferred contact channel, phone (with `wa.me` deep link), budget, timeline, and a **Contextual Answers** block (all rendered via React text nodes — XSS-safe).
- **Search finally works**: the admin UI already sent `?search=` but the backend ignored it — the endpoint now filters by name/email/company/message.

### 5. No scope creep (explicitly confirmed out-of-scope)

- ❌ **No CRM** — request storage remains in `contact_requests`; no leads/pipeline/assignment machinery was added.
- ❌ **No AI** — no AI integration, classification, or auto-replies.
- ❌ **No questionnaire engine / form builder** — the contextual questions are 1–2 static optional inputs per type, not a conditional engine.

---

## Verification

| Check | Result |
|---|---|
| Backend test suite | ✅ **71 tests / 189 assertions** (was 60/158 — +11 tests) |
| New tests added | `LocaleMiddlewareTest` (8 tests: q-values, region variants, fallbacks), Contact filled-field tests, invalid enum rejection, WhatsApp-missing-phone rejection, lifecycle status update |
| Pint on changed files | ✅ fixed (repo-wide CRLF noise is pre-existing, untouched) |
| `next build` | ✅ 0 errors, all routes |
| `tsc --noEmit` | ✅ clean |
| ESLint | ✅ only the 17 pre-existing errors (baseline, zero new) |
| Live API verification | ✅ `Accept-Language: ar` now returns Arabic products/homepage sections; `fr` falls back to English |
| Dev DB | ✅ migrated (rollback-tolerant `down()` with `DROP COLUMN IF EXISTS`) |

---

## Files changed

**Backend (`ys-api/`)**
- `app/Http/Middleware/ResolveLocale.php` — **new**: Accept-Language → whitelisted locale
- `bootstrap/app.php` — register ResolveLocale globally
- `app/Domains/Operations/Models/ContactRequest.php` — +`CONTACT_PREFERENCES`, `BUDGET_RANGES`, `TIMELINES`, `STATUSES`, `normalizeStatus()`, fillable/casts
- `app/Domains/Operations/Actions/SubmitContactRequestAction.php` — persists new fields
- `app/Http/Controllers/Public/ContactController.php` — strict validation for new fields
- `app/Http/Controllers/Admin/ContactRequestController.php` — search support, lifecycle auto-mark push, statuses
- `database/migrations/2026_08_08_000007_add_project_request_fields_to_contact_requests_table.php` — **new**
- `tests/Feature/Localization/LocaleMiddlewareTest.php` — **new**
- `tests/Feature/Public/ContactTest.php`, `tests/Feature/Public/PublicEndpointsTest.php` — extended/updated

**Frontend (`ys-web/`)**
- `app/[locale]/(public)/contact/ContactClient.tsx` — **rewritten**: 3-path request experience
- `types/index.ts` — new shared constants (budget/timeline/preferences), expanded `ContactFormData`
- `lib/api/client.ts` — contact POST now carries a correct `Accept-Language`
- `app/admin/contact-requests/page.tsx` + `[id]/page.tsx` — lifecycle, new fields, details

**Docs**
- `docs/sprint-4-report.md` — **this report**
- `docs/README.md`, `docs/database.md` — index row + migration count (29)

---

## Problems & notes

| Item | Status |
|---|---|
| Deprecated status values (`read`/`replied`) in old rows | ✅ handled — normalized to `reviewing` everywhere |
| Search param ignored in admin API | ✅ fixed (frontend was already sending it) |
| Reset admin `Q&A` values when switching types | ⚠️ user-typed contextual answers persist per-key across type switches (they're keyed, so it's harmless; clearing could wipe a half-typed reply) |
| Validation error texts remain English-only (hardcoded in exception renderer) | Expected — message texts are canonical; localized validation is a theme for a future sprint (task to be consciously re-run) |
| Lang files for `ar` don't exist → Laravel falls back to English for built-in error strings | ✅ documented, no behavior regression |

---

## Security & trust (re-checked)

- `throttle:contact` rate limit (3/hour/IP) — **kept**.
- Message min length 20 / max 5000, email RFC validation — **kept**.
- Spam scoring (URLs, caps ratio, spam words) — **kept**; new fields are plain text/selects which cannot carry markdown/HTML.
- All admin rendering uses React text nodes (`dangerouslySetInnerHTML` nowhere in this feature) — XSS-safe.
- WhatsApp links built from settings values with `encodeURIComponent`, digits-stripping for `wa.me` — no internal IDs or secrets.

---

## Scope confirmation

| Requirement | Status |
|---|---|
| CRM (any level) | ❌ NOT built |
| AI / AI-assistant | ❌ NOT built |
| Advanced questionnaire engine / form builder | ❌ NOT built |
| Localizable API for public content (products, sections, FAQ, careers…) | ✅ |
| Structured request fields + bounded validation | ✅ |
| Direct talk channels (WhatsApp, email) from settings | ✅ |
| Status lifecycle for human workflows | ✅ |