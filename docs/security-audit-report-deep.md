# YS-SOFTWARE — Deep Security Audit Report

**Auditor:** Offensive security review (manual, line-by-line)
**Date:** 2026-08-16
**Scope:** `ys-api` (164 PHP files), `ys-web` (app/components/lib/modules — 400+ TS/TSX files), docker-compose, nginx, CI/CD, 39 migrations, all configs, vendor internals (Sanctum/Auth/Symfony Mime) verified for exploitability claims.
**Method:** Full manual code review by domain specialists + direct spot-verification of every CRITICAL/HIGH claim against source. No automated scanner output used as evidence.
**Code status:** All fixes from the 2026-08-16 hardening pass are present in this tree. Findings below are the *residual* risk after those fixes, plus gaps the prior pass missed.

---

## SECTION 1: EXECUTIVE SUMMARY

**Overall Security Score: 62/100**
**Risk Level: HIGH** — production launch is **not recommended** until VULN-01, VULN-02, and VULN-04/VULN-05 are remediated.

**Total Findings: 43** (Critical: 1 · High: 9 · Medium: 18 · Low: 15 · Info: 0)

**Top 5 most dangerous vulnerabilities:**
1. **VULN-01** — Any `manage_users` holder can promote any user to `super_admin` via `PUT /admin/users/{id}` (the assigned-role guard exists in `store()` but is missing in `update()`) → full platform takeover.
2. **VULN-02** — The entire B2B layer (customers, projects, tasks, milestones, contact requests) is **not product-scoped** → cross-tenant PII, commercial value, and internal-notes disclosure for scoped admins.
3. **VULN-04** — 12+ public-facing rich-text fields are stored and served **without HTML sanitization** → stored XSS in every visitor's browser (static pages, FAQs, updates, careers, services, release notes).
4. **VULN-05** — The SVG sanitizer can be bypassed with namespace-prefixed elements (`<svg:script>`, `xlink:onload`) and preserves DOCTYPE/entity definitions → the "stored bytes are never raw upload" guarantee is false.
5. **VULN-03** — Admin temporary passwords are persisted **in plaintext** in the `jobs`/`failed_jobs` queue tables and mailed in clear text.

**Immediate actions required (before production launch):**
1. Fix VULN-01 (add the assigned-role super-admin guard to `UserController::update()`).
2. Fix VULN-02 (product-scope customers/projects/tasks/milestones/contact-requests or explicitly model tenant-agnostic data).
3. Route all HTML-capable fields through `HtmlSanitizerService` (VULN-04) and harden the SVG sanitizer (VULN-05).
4. Stop passing plaintext passwords through queue jobs (VULN-03).
5. Verify the deployment environment: TLS gateway (VULN-09), trusted proxies (VULN-07), non-superuser DB role (VULN-08), `LOG_LEVEL` (VULN-22).

**Honesty statement (rule 8):** Findings marked `[DEPLOYMENT-DEPENDENT]` or `[UNVERIFIED]` could not be executed against a live environment (no containers available); their code paths are statically conclusive, but runtime confirmation is required as listed in Section 9. One agent-reported CRITICAL (missing `config/auth.php` breaking all auth) was **investigated directly and refuted** — Sanctum's service provider auto-registers the `sanctum` guard (`SanctumServiceProvider.php:23-28`), so authentication works; the missing config is a Low finding (VULN-33).

---

## SECTION 2: CONFIRMED VULNERABILITIES

---

### [VULN-01] Privilege escalation to `super_admin` via user update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** CRITICAL
- **CVSS:** 9.1 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H) — network, low complexity, single permission required, total compromise
- **Category:** Broken Access Control (A01:2021) / Vertical Privilege Escalation
- **File:** `ys-api/app/Http/Controllers/Admin/UserController.php` (Line: 92-111)
- **Affected code:**
```php
public function update(Request $request, User $user): JsonResponse
{
    $this->authorize('manage_users');

    // Prevent non-super-admins from editing super admin accounts
    if ($user->role->slug === 'super_admin' && Auth::user()->role->slug !== 'super_admin') {
        abort(403, 'Cannot modify a super admin account.');
    }

    $validated = $request->validate([
        'name'     => ['sometimes', 'string', 'max:100'],
        'email'    => ['sometimes', 'email:rfc', Rule::unique('users')->ignore($user->id)],
        'role_id'  => ['sometimes', 'uuid', 'exists:roles,id'],   // ← NO check on the ASSIGNED role
        'is_active'=> ['sometimes', 'boolean'],
    ]);
    ...
    $user->update($validated);
```
- **Description:** `store()` correctly blocks assigning the `super_admin` role to non-super-admins (`UserController.php:59-62`), but `update()` only inspects the **target's current** role (line 97), never the **assigned** `role_id`. Any authenticated user with `manage_users` can assign the seeded `super_admin` role to any account they control. `RoleController::index` (gated by `manage_users`) conveniently returns every role's UUID. The resulting `permissions: ['*']` bypasses every gate via `Gate::before` (`AuthServiceProvider.php:39-40`) and `canAccessProduct` (`User.php:123-132`).
- **Proof of Concept:**
```bash
# 1. enumerate roles (any manage_users holder)
curl -H "Authorization: Bearer $TOKEN" https://host/api/v1/admin/roles
#   → locate "super_admin" role uuid
# 2. promote a victim/own account
curl -X PUT https://host/api/v1/admin/users/<victimId> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"role_id":"<super_admin_role_uuid>"}'
# 3. victim now has '*' permissions; all gates bypassed
```
- **Impact:** Complete platform compromise: tenant isolation bypass, financial data, audit-log reads, arbitrary user/role management. The `manage_admins`→`manage_users` grant chain makes this reachable by delegation, not only super-admins.
- **Remediation:**
```php
if (isset($validated['role_id'])) {
    $assignedRole = Role::findOrFail($validated['role_id']);
    if ($assignedRole->slug === 'super_admin' && ! Auth::user()->isSuperAdmin()) {
        abort(403, 'Only a super admin can assign the super-admin role.');
    }
    // permission-subset rule (VULN-16): reject if assignedRole.permissions ⊄ actor.permissions
    $actorPerms = Auth::user()->role->permissions ?? [];
    if (! Auth::user()->isSuperAdmin()
        && array_diff($assignedRole->permissions ?? [], $actorPerms) !== []) {
        abort(403, 'Cannot assign a role with permissions you do not hold.');
    }
}
```
- **Verification:** `php artisan tinker` → create a `manage_users`-only role, grant to user B, `PUT /api/v1/admin/users/{C}` with super_admin role UUID → expect 403 after fix (was 200). Add a PHPUnit regression test mirroring `store()`'s guard.
- **References:** OWASP A01:2021; OWASP "Insecure Direct Object References"; Laravel authorization docs.

---

### [VULN-02] Cross-tenant access — Customers, Projects, Tasks, Milestones, Contact Requests are not product-scoped
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH
- **CVSS:** 8.5 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N)
- **Category:** Broken Access Control (A01:2021) — IDOR / missing tenant isolation
- **Files:** `app/Http/Controllers/Admin/CustomerController.php:29-39,82-100,103-118` · `ProjectController.php:30-36` · `TaskController.php:31-40` · `MilestoneController.php:32-37` · `ContactRequestController.php:28-38` · `DashboardController.php:101-105,112-134` · migration `2026_07_31_000002_create_customers_table.php:18-29` (no `product_id`)
- **Affected code:**
```php
// CustomerController.php:29
$customers = Customer::withCount(['projects', 'subscriptions'])
    ->when($request->query('search'), ...)
    ->paginate($this->perPage($request, 20));   // NO product scoping
```
- **Description:** The `admin_product_access` scoping model is enforced on products/releases/docs/roadmap/updates/timeline/feature-flags/subscriptions — but the entire Sprint 6/7 business domain (customers, projects, tasks, milestones, contact requests, dashboard project sums) has **no scoping at all**. The `customers` table has no `product_id`; projects/tasks/milestones inherit this. A scoped admin with `view_customers`/`view_projects` reads every customer (name, email, phone, notes), every `quoted_value` and `internal_notes`, and can `PUT`/`DELETE` any project/task/milestone. This is the platform's B2B tenant boundary.
- **Proof of Concept:**
```bash
# scoped admin (access to Product A only)
curl -H "Authorization: Bearer $TOKEN" https://host/api/v1/admin/customers        # ALL customers
curl -H "Authorization: Bearer $TOKEN" https://host/api/v1/admin/projects        # ALL projects incl. quoted_value
curl -X DELETE -H "Authorization: Bearer $TOKEN" https://host/api/v1/admin/tasks/<productB-task>
```
- **Impact:** Cross-tenant customer PII and commercial data disclosure, cross-tenant tampering/deletion of business records; the platform's stated product-scoping guarantees are silently meaningless for the B2B layer.
- **Remediation:** Either (a) add `product_id` to `customers` (migration + backfill via subscriptions/projects) and enforce `canAccessProduct()` in every index/show/store/update/destroy across Customer/Project/Task/Milestone/ContactRequest/Dashboard — mirroring `SubscriptionController`; or (b) explicitly model these as tenant-agnostic (global) and document that decision in code and docs. Option (a) is recommended for a B2B platform.
- **Verification:** Create scoped admin (2 products, access to 1), assert `customers`/`projects` index returns only scoped rows; PHPUnit regression tests per controller.
- **References:** OWASP A01:2021 Broken Access Control; OWASP "Object Level Authorization".

---

### [VULN-03] Plaintext temporary admin password persisted in queue payload and mailed in clear — ✅ REMEDIATED (FIX-05)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH
- **CVSS:** 7.5 (AV:N/AC:H/PR:H/UI:N/S:U/C:H/I:H/A:H — requires DB/log/backup access; see impact)
- **Category:** Cryptographic Failures (A02:2021) / Sensitive Data Exposure
- **Files:** `app/Http/Controllers/Admin/UserController.php:66` · `app/Jobs/SendAdminUserCreatedJob.php:31-34,51-61`
- **Affected code:**
```php
// UserController.php:66
SendAdminUserCreatedJob::dispatch($user->id, $validated['password'])->afterCommit();
// SendAdminUserCreatedJob.php:31-34
public function __construct(
    private readonly string $userId,
    private readonly string $temporaryPassword,   // plaintext in serialized payload
) {}
```
- **Description:** With `QUEUE_CONNECTION=database` (the default), the serialized job — including the plaintext login password — is written to `jobs`, and to `failed_jobs.payload` if the mail fails after 3 tries. It is also mailed verbatim in `emails.admin-welcome`. Anyone with DB access, DB backups (unencrypted — see VULN-20), or log access (`MAIL_MAILER=log` writes it to `laravel.log`) obtains live admin credentials. This is the account's **real** login password, not a one-time token.
- **Proof of Concept:**
```bash
# after creating an admin user with a failing SMTP:
PGPASSWORD=... psql -c "SELECT payload FROM failed_jobs;"    # base64 contains "password":<plaintext>
grep -r "$(cat /tmp/last-pass)" storage/logs/laravel.log     # MAIL_MAILER=log variant
```
- **Impact:** Admin account takeover via backup/log/DB exposure; GDPR Art. 32 violation (credentials at rest in clear).
- **Remediation:** Do not transport the password. Send a one-time expiring reset link (implement the reset flow — see VULN-13) or a separate one-time token stored hashed; keep only `user_id` in the job and generate the secret inside `handle()`. At minimum, mark the job `ShouldBeEncrypted` and force password change on first login.
- **Verification:** Inspect a `jobs` row after admin creation — no password field. Grep logs for the generated password — zero hits.
- **References:** OWASP A02:2021; Laravel queue encryption docs; GDPR Art. 32.

---

### [VULN-04] Stored XSS — 12+ public rich-text fields persisted and served unsanitized
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH
- **CVSS:** 7.6 (AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:L/A:N — admin trigger, every visitor affected)
- **Category:** Cross-Site Scripting (A03:2021 Injection) — stored
- **Files (write paths — no sanitizer):** `CreateStaticPageAction.php:18-19` · `UpdateStaticPageAction.php:11` · `CreateFaqAction.php:15-16` · `UpdateFaqAction.php:11` · `CreateUpdateAction.php:16-17` + `Admin/UpdateController.php:108` · `CreateRoadmapItemAction.php:16-17` · `CreateTimelineEntryAction.php:14-15` · `CreateCareerAction.php:18-21` · `ServiceController.php:66-67,125` · `CreateProductDTO.php:55-58` (value_proposition/target_audience — long_desc IS sanitized) · `ReleaseController.php:55-56,103-104` (release_notes) · `HomepageSectionController.php:44,72` (nested content JSON) · `SettingController.php:58-67`
- **Affected code (representative):**
```php
// CreateStaticPageAction.php:18-19
'content_en' => $data['content_en'] ?? null,
'content_ar' => $data['content_ar'] ?? null,
// served verbatim at StaticPageResource.php:19 → GET /api/v1/public/pages/{slug}
```
- **Description:** `HtmlSanitizerService` (HTMLPurifier allowlist) is wired into exactly **4** write paths (`CreateProductDTO`, `UpdateProductDTO`, `CreateDocumentationArticleAction`, `UpdateDocumentationArticleAction`). Every other HTML-capable field — static-page content, FAQ answers, update content, career description/requirements/responsibilities, service description, roadmap/timeline descriptions, release notes, product value-proposition/target-audience, homepage-section content JSON, settings values — is stored raw and served verbatim to the public API. The sanitizer's own docblock confirms the SPA renders these via `dangerouslySetInnerHTML` with zero frontend sanitization (frontend agent verified sanitizeHtml is applied at only 2 render points: docs + product pages). A malicious/compromised admin (or the VULN-01 chain) executes JS in every visitor's browser under the app origin.
- **Proof of Concept:**
```bash
curl -X POST https://host/api/v1/admin/static-pages -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"pricing","title_en":"Pricing","content_en":"<img src=x onerror=alert(document.cookie)>","status":"published"}'
curl -s https://host/api/v1/public/pages/pricing   # payload returned verbatim
```
- **Impact:** Persistent XSS: session theft of visitors, defacement, phishing, crypto-mining, keylogging — under the API/SPA origin.
- **Remediation:** Route every field above through `HtmlSanitizerService::sanitize()` at the write boundary (mirror `CreateDocumentationArticleAction.php:21-22`). Add `url` + scheme rules for menu-item `url` (currently only `string|max:500` — `javascript:` passes, `MenuController.php:104,125`) and product external URLs (Laravel's `url` rule passes `javascript:alert(1)` — `CreateProductRequest.php:37-39`). Validate homepage-section content per-key; validate setting values per key/type.
- **Verification:** PHPUnit: POST `<svg onload=...>`/`<script>`/`<a href=javascript:...>` to each endpoint above; assert sanitized/empty output. Grep regression: `sanitize(` call sites must cover every field in the HTML-capable census.
- **References:** OWASP A03:2021 (XSS); OWASP XSS Prevention Cheat Sheet; HTMLPurifier.

---

### [VULN-05] SVG sanitizer bypass — namespace-prefixed elements/attributes; DOCTYPE retained
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH
- **CVSS:** 8.1 (AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:L/A:N — requires `manage_media` or compromised admin)
- **Category:** Injection (A03:2021) — stored XSS / XML injection via SVG upload
- **File:** `app/Domains/System/Services/MediaUploadService.php` (Line: 164-215)
- **Affected code:**
```php
foreach ($dom->getElementsByTagName('*') as $element) {
    if (in_array(strtolower($element->nodeName), self::UNSAFE_SVG_ELEMENTS, true)) { // compares QName
    ...
foreach ($element->attributes as $attribute) {
    $name = strtolower($attribute->nodeName);      // "xlink:onload" ≠ starts_with "on"
    if (str_starts_with($name, 'on')
        || in_array($name, ['href', 'xlink:href', 'src', 'style'], true)
        || str_starts_with($value, 'javascript:')) { ... }
```
- **Description:** `nodeName` returns the **qualified name** (`svg:script`), not the local name — the blocklist contains bare `script`, so prefixed elements survive verbatim. Browsers resolve declared prefixes to namespaces, so `<svg:script>` in the SVG namespace executes when the file is navigated directly or embedded via `<object>`/inline. Same for attributes: `xlink:onload="alert(1)"` is not caught by the `on` prefix test. Additionally: the DOCTYPE node is never removed (`saveXML()` emits it verbatim) — `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "https://attacker/x">]>` + `&xxe;` is stored, and any DTD-processing consumer resolves it; `xml:base` is retained. (Mitigations that remain: `LIBXML_NONET` + no `LIBXML_NOENT` make parse-time XXE/billion-laughs inert; `<img>` context does not execute SVG scripts.)
- **Proof of Concept:**
```bash
printf '%s' '<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><svg:script>alert(document.domain)</svg:script></svg>' > x.svg
curl -X POST https://host/api/v1/admin/media -H "Authorization: Bearer $TOKEN" \
  -F "file=@x.svg;type=image/svg+xml"
curl -s https://host/storage/media/2026/08/<uuid>.svg   # svg:script survives
```
- **Impact:** Stored XSS under the media origin (`image/svg+xml` content type) for anyone opening the asset; residual XML-injection surface via retained DOCTYPE.
- **Remediation:**
```php
// (1) reject or strip DOCTYPE before parsing
if (stripos($contents, '<!DOCTYPE') !== false) {
    $contents = preg_replace('/<!DOCTYPE[^>]*>/i', '', $contents);
}
// (2) compare LOCAL names, not qualified names; strip all prefixed nodes/attrs not on an allowlist
$local = $element->localName ?? strtolower($element->nodeName);
if (in_array(strtolower($local), self::UNSAFE_SVG_ELEMENTS, true)
    || str_contains($element->nodeName, ':') /* foreign-namespace node */) { $toRemove[] = $element; continue; }
// (3) attribute sweep on localName: xlink:onload → localName "onload"
$attrLocal = strtolower($attribute->localName ?? $attribute->nodeName);
if (str_starts_with($attrLocal, 'on') || $attrLocal === 'href' || $attrLocal === 'src'
    || $attrLocal === 'style' || str_contains($attribute->nodeName, ':')) { ... }
// (4) normalize whitespace in values before scheme checks: preg_replace('/[\x00-\x20\x7F]/', '', $value)
// (5) remove xml:base and xmlns:* attributes
```
- **Verification:** Extend `MediaUploadSvgSanitizationTest` with: prefixed script, `xlink:onload`, `java\tscript:` (whitespace-obfuscated), DOCTYPE+entity, `xml:base`, foreign-namespace nodes. Assert all stripped/rejected.
- **References:** OWASP "Server-Side XSS"; CWE-79; SVG namespace spec (QName vs localName).

---

### [VULN-06] Product-scope bypass via ungrouped `orWhere` in search filters — ✅ REMEDIATED (FIX-06)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH
- **CVSS:** 6.5 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)
- **Category:** Broken Access Control (A01:2021)
- **Files:** `app/Http/Controllers/Admin/ProductController.php:44-47` · `DocumentationController.php:139-140` (also latent in `UserController.php:30-32`, `ServiceController.php:28-31`)
- **Affected code:**
```php
->when(! Auth::user()->isSuperAdmin(), fn ($q) => $q->whereIn('id', Auth::user()->products()->pluck('products.id')))
->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
->when($request->query('search'), fn ($q, $search) => $q->where('name_en', 'ilike', "%{$search}%")
    ->orWhere('name_ar', 'ilike', "%{$search}%")
    ->orWhere('slug', 'ilike', "%{$search}%")
)
```
- **Description:** Laravel emits flat `where`/`orWhere` — the OR conditions attach at the **top level** of the WHERE clause. SQL precedence (`AND` > `OR`) yields `(id IN (mine) AND status=? AND name_en ILIKE ?) OR name_ar ILIKE ? OR slug ILIKE ?`: a match on `name_ar` or `slug` of any product — **including out-of-scope products, and bypassing the status filter** — returns the row. Same pattern in `DocumentationController::index` (bypasses the category/product `whereHas` scope) and the docs `search` action.
- **Proof of Concept:**
```bash
# scoped admin with access only to Product A; search for a slug unique to Product B
curl -H "Authorization: Bearer $TOKEN" \
  'https://host/api/v1/admin/products?search=product-b-slug'   # → Product B returned
curl -H "Authorization: Bearer $TOKEN" \
  'https://host/api/v1/admin/docs/articles?search=title-only-in-other-product'
```
- **Impact:** Cross-product data disclosure (draft products, other tenants' catalog data), breaking the `admin_product_access` boundary.
- **Remediation:** Group the OR conditions:
```php
->when($request->query('search'), fn ($q, $search) => $q->where(fn ($sub) => $sub
    ->where('name_en', 'ilike', "%{$search}%")
    ->orWhere('name_ar', 'ilike', "%{$search}%")
    ->orWhere('slug', 'ilike', "%{$search}%"))
)
```
Same fix in `DocumentationController.php:139-140`, `UserController.php:30-32`, `ServiceController.php:28-31`.
- **Verification:** PHPUnit: scoped admin searches by out-of-scope slug → 0 rows after fix. Add to `ProductScopedContentTest`.
- **References:** OWASP A01:2021; Laravel query builder `where`/`orWhere` semantics.

---

### [VULN-07] Rate limits collapse to global limits behind the reverse proxy (no trusted proxies) — login/contact DoS — ✅ REMEDIATED (FIX-07)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH [DEPLOYMENT-DEPENDENT — the shipped docker topology makes this effective]
- **CVSS:** 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- **Category:** Insecure Design (A04:2021) — availability
- **Files:** `bootstrap/app.php:24-38` (no `trustProxies`) · `app/Providers/AppServiceProvider.php:57-88` · `app/Domains/Auth/Actions/LoginAction.php:118-121` · `docker/nginx/sites/default.conf:39,52` (`$proxy_add_x_forwarded_for`)
- **Affected code:**
```php
// AppServiceProvider.php:64
RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
// docker/nginx/sites/default.conf:39
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```
- **Description:** The edge nginx forwards `X-Forwarded-For`, but Laravel ignores it without `trustProxies` — `$request->ip()` returns the nginx container IP for **every** client. All per-IP limits (`throttle:auth` 5/min, `throttle:contact` 3/hr, `throttle:search` 60/min, `throttle:public` 120/min) become **global** budgets. Five failed logins from anywhere lock out the whole admin panel for a minute (unauthenticated login DoS); three contact submissions lock the contact form for an hour. Conversely, if proxies are later trusted, the current `$proxy_add_x_forwarded_for` appends client-supplied values — an attacker can spoof their rate-limit identity. Forensic `ip_address` columns record the proxy IP.
- **Proof of Concept:**
```bash
# two different source machines, 5 total failed logins → 6th (from either) gets 429 RATE_LIMIT_EXCEEDED
for i in 1 2 3; do curl -s -o /dev/null -w "%{http_code} " -X POST https://host/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"wrong"}'; done   # from host A
for i in 1 2 3; do curl -s -o /dev/null -w "%{http_code} " -X POST https://host/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"wrong"}'; done   # from host B
# → first 5x 401, 6th request → 429 for EVERYONE behind the proxy
```
- **Impact:** Trivial unauthenticated availability attack on login and the contact form; per-IP brute-force protection neutralized (only the per-email login limit, keyed on email not IP, remains effective — it also enables the VULN-15 victim-lockout).
- **Remediation:**
```php
// bootstrap/app.php
$middleware->trustProxies(at: ['172.16.0.0/12', '<lb-ips>'], headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO | Request::HEADER_X_FORWARDED_HOST);
// nginx: replace $proxy_add_x_forwarded_for with $remote_addr (never trust client-supplied XFF)
proxy_set_header X-Forwarded-For $remote_addr;
```
- **Verification:** In-container `request()->ip()` from two clients; 6 rapid failed logins from two machines → only the offending IP is blocked. UNVERIFIED at runtime (containers unavailable).
- **References:** OWASP A04:2021; Laravel trusted-proxy docs; CWE-770 (resource exhaustion).

---

### [VULN-08] Audit-log RLS bypass — app connects as PostgreSQL superuser — ✅ REMEDIATED (FIX-08)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH [DEPLOYMENT-DEPENDENT]
- **CVSS:** 7.1 (AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:N — requires SQLi/RCE/Tinker, then full forensic erasure)
- **Category:** Security Misconfiguration (A05:2021) / Integrity
- **Files:** `database/migrations/2025_01_01_000012_audit_logs_row_level_security.php:20-47` · `docker-compose.yml:99-101`
- **Affected code:**
```php
$appUser = config('database.connections.pgsql.username', 'postgres');
DB::statement('ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY');
DB::statement("REVOKE UPDATE, DELETE ON audit_logs FROM \"{$appUser}\"");
```
- **Description:** The official `postgres` image creates `POSTGRES_USER` as a cluster **superuser**, and the app connects as that user (`.env`: `DB_USERNAME=postgres`). PostgreSQL superusers bypass RLS and table privileges entirely. The migration's intent ("only the actual PostgreSQL superuser can bypass") is inverted here — the app user IS the superuser. A compromised app (SQLi, RCE, Tinker) can `DELETE FROM audit_logs` or rewrite rows, erasing forensic evidence of its own actions. The Eloquent-level immutability (`AuditLog.php:54-85`) is trivially bypassed with `DB::table()`.
- **Proof of Concept:**
```bash
# as the app connection (compromised app / tinker):
DB::table('audit_logs')->where('action','auth.login_failed')->delete();
```
- **Impact:** Forensic/compliance loss (GDPR Art. 5/32 accountability); audit-trail tampering by an attacker who already has app-level code execution.
- **Remediation:** Provision a dedicated least-privilege role: `CREATE ROLE ys_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;` grant `SELECT/INSERT` (+ UPDATE where genuinely needed) on application tables, keep `postgres` only for migrations, and re-run migration 000012 (or grant explicitly). Verify with `\du` and `SET ROLE ys_app;` then attempt `DELETE`.
- **Verification:** `docker compose exec database psql -U ys_user -c "\du"` → must NOT list `Superuser`. UNVERIFIED at runtime.
- **References:** OWASP A05:2021; PostgreSQL RLS docs; CWE-732.

---

### [VULN-09] No TLS in the shipped stack — bearer cookie and PII in clear text if Secure is disabled — ✅ REMEDIATED (FIX-09)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH [DEPLOYMENT-DEPENDENT — depends on the external gateway that is assumed but not enforced]
- **CVSS:** 8.1 (AV:N/AC:L/PR:N/UI:N/S:U:C:H/I:N/A:N — network eavesdropping on credentials/PII)
- **Category:** Security Misconfiguration (A05:2021) / Cryptographic Failures (A02:2021)
- **Files:** `docker-compose.yml:132-136` · `docker/nginx/sites/default.conf:10` (`listen 80`) · `.env.example` (`SESSION_SECURE_COOKIE=false`, `AUTH_COOKIE_SECURE` unset)
- **Description:** The edge nginx publishes only port 80; TLS is delegated to an external gateway that nothing enforces. The auth cookie is `Secure` in production (`AuthController.php:141`) — correct fail-closed — but `AUTH_COOKIE_SECURE=false`/`SESSION_SECURE_COOKIE=false` are the shipped defaults, so any operator who flips them "to make it work" transmits the bearer token in clear. All public traffic (contact form with emails, phones, budgets) is plaintext absent the gateway. HSTS from `SecurityHeaders.php` is ignored by browsers over HTTP.
- **Impact:** Credential and PII interception (GDPR Art. 32); token theft → admin takeover (mitigated only by cookie Secure flag).
- **Remediation:** Terminate TLS in-stack, or make the external gateway a hard deploy gate: CI check + refuse to boot when `APP_ENV=production` and no TLS is detectable; flip `SESSION_SECURE_COOKIE=true` default in production compose.
- **Verification:** `curl -sI http://host/ | grep -i strict-transport` + inspect `Set-Cookie` on login over HTTP (must be absent/secure-flagged). UNVERIFIED at runtime.
- **References:** OWASP A05:2021; OWASP TLS Cheat Sheet.

---

### [VULN-10] Permission-coverage mismatch — timeline/feature-flags gated by `manage_settings`; dedicated permissions are dead — ✅ REMEDIATED (FIX-10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** HIGH (privilege confusion — both over-grant and dead permissions)
- **CVSS:** 6.5 (AV:N/AC:L/PR:L/UI:N/S:U:C:H/I:N/A:N)
- **Category:** Broken Access Control (A01:2021)
- **Files:** `app/Http/Controllers/Admin/TimelineController.php:27,46,78,99` (`manage_settings`) · `FeatureFlagController.php:24,42,80,115` (`manage_settings`) · `AuthServiceProvider.php:63-69` · `app/Domains/Auth/Enums/Permission.php:50-55`
- **Affected code:**
```php
// TimelineController.php:27
$this->authorize('manage_settings');
// AuthServiceProvider.php:63 — defined but referenced NOWHERE
Gate::define('manage_timeline', fn (User $user) => $user->hasPermission('manage_timeline'));
```
- **Description:** `manage_timeline`, `manage_feature_flags`, `view_financials`, `view_admin_activity`, `manage_roles` exist in the enum and Gate definitions but have **zero call sites**. Consequences: (a) roles granted these permissions get nothing (misleading RBAC); (b) any `manage_settings` holder (seeded admin) silently controls timeline content and global feature flags; (c) project `quoted_value` sums are exposed to any `view_projects` holder (`DashboardController.php:112-120`, `CustomerController.php:82-100`) despite a purpose-built `view_financials` permission.
- **Impact:** Privilege escalation-by-misdesign (settings admin → feature-flag/timeline control), financial data visible to non-finance roles.
- **Remediation:** Wire `TimelineController` → `manage_timeline`, `FeatureFlagController` → `manage_feature_flags`; gate `quoted_value`/`value_by_currency` behind `view_financials`; update `RoleSeeder` accordingly; add a CI grep asserting every `Gate::define` has ≥1 call site.
- **Verification:** Grep each permission name; after fix, a `manage_timeline`-only role gains timeline access, `manage_settings`-only loses it.
- **References:** OWASP A01:2021; least-privilege principle.

---

### [VULN-11] Login timing oracle — user enumeration via `Hash::check` short-circuit — ✅ REMEDIATED (FIX-11)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U:C/L/I:N/A:N)
- **Category:** Identification & Authentication Failures (A07:2021)
- **File:** `app/Domains/Auth/Actions/LoginAction.php:31`
- **Affected code:**
```php
if (! $user || ! Hash::check($dto->password, $user->password)) {
```
- **Description:** The `||` short-circuits: nonexistent email skips `Hash::check` (bcrypt cost-12 ≈ 150–300 ms). Measurable ~200 ms response-time delta reveals whether an email exists. Combined with the broken per-IP limiter (VULN-07) and per-email limit (10/min — enough for enumeration), an attacker maps the entire admin roster for targeted phishing/credential-stuffing.
- **Proof of Concept:**
```bash
time curl -s -X POST https://host/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"random-nobody@x.com","password":"dummy12345"}'   # ~1ms
time curl -s -X POST https://host/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@ys-systems.com","password":"dummy12345"}'  # ~200ms → account exists
```
- **Impact:** Admin roster disclosure; targeted attacks.
- **Remediation:**
```php
if (! $user || ! Hash::check($dto->password, $user->password ?? '$2y$12$' . Str::random(60))) {
```
- **Verification:** PHPUnit timing-free structural test; manual `time curl` comparison after fix.
- **References:** OWASP A07:2021; CWE-208.

---

### [VULN-12] Account enumeration via distinct `ACCOUNT_DISABLED` response — ✅ REMEDIATED (FIX-12)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U:C/L/I:N/A:N)
- **Category:** Identification & Authentication Failures (A07:2021)
- **File:** `app/Http/Controllers/Auth/AuthController.php:66-71`
- **Affected code:**
```php
} catch (AccountDisabledException) {
    return response()->json([ 'code' => 'ACCOUNT_DISABLED', ... ], Response::HTTP_FORBIDDEN);
}
// vs InvalidCredentialsException → 401 INVALID_CREDENTIALS (lines 55-64)
```
- **Description:** Wrong password → 401 `INVALID_CREDENTIALS`; correct password on a disabled account → 403 `ACCOUNT_DISABLED`. With a leaked password, an attacker instantly learns which accounts are disabled; the differential also confirms account existence/state.
- **Impact:** Account-state enumeration feeding targeted attacks; credential-reuse triage.
- **Remediation:** Return the identical 401 body for disabled accounts; log the distinction in the audit trail only.
- **Verification:** Login to disabled account → same body/status as wrong-password.
- **References:** OWASP A07:2021; CWE-204.

---

### [VULN-13] No password change/rotation path; tokens survive password changes — ✅ REMEDIATED (FIX-13)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 6.5 (AV:N/AC:L/PR:L/UI:N/S:U:C:H/I:H/A:N — post-compromise persistence)
- **Category:** Identification & Authentication Failures (A07:2021)
- **Files:** `routes/api.php` (no change-password route — verified) · `app/Http/Controllers/Admin/UserController.php:101-106` (no `password` in update rules) · `database/migrations/2025_01_01_000002_create_users_table.php:26-27` (dead reset columns) · `app/Domains/Auth/Models/User.php:34-35`
- **Description:** There is no `change-password` endpoint, no reset flow, no `Password::broker()` usage anywhere. When a password is rotated out-of-band (seeder/tinker), existing tokens are **not** deleted — a stolen token remains valid for up to 30 days (VULN-14). A leaked admin password cannot be remediated in-band.
- **Impact:** Stolen sessions outlive credential rotation; no forced-rotation control; no current-password verification.
- **Remediation:** Add `POST /auth/change-password` (current-password via `Hash::check`, `min:12` + complexity + `confirmed`, `pwned` check), and on any password change call `$user->tokens()->delete()`. Wire the reset columns to a real broker flow (hashed tokens — see VULN-23).
- **Verification:** Attempt `PUT /admin/users/{id}` with `password` → dropped silently (current); after fix, password change revokes all tokens (PHPUnit).
- **References:** OWASP A07:2021; Laravel password broker docs.
- **✅ REMEDIATED (FIX-13):** Full rotation lifecycle implemented in-band. `POST /api/v1/auth/change-password` (auth:sanctum+active) verifies the current password (`Hash::check`), enforces `min:12` + mixed-case + numbers + symbols + `confirmed` in `ChangePasswordRequest` (422 on wrong current / same-as-current), updates the password, stamps `password_changed_at`, calls `$user->tokens()->delete()`, and audits `auth.password_changed`. `POST /api/v1/auth/forgot-password` (throttle:forgot per-IP 5/min + per-email 3/hour via `RateLimiter` keyed on `forgot-email:` + SHA-256) issues a 256-bit token, stores only its SHA-256 hash in the new `password_reset_tokens` table (indexed email, no updated_at), and mails the plaintext token via the non-queued `PasswordResetMailable` (queue payloads can never carry the secret); unknown emails return the byte-identical 200. `POST /api/v1/auth/reset-password` validates token+email+policy (422 without burning the token), enforces 1-hour expiry on `created_at`, is single-use, revokes all tokens, updates password + `password_changed_at`, audits `auth.password_reset`; failures → 403 `INVALID_RESET_TOKEN`. Dead `password_reset_token`/`password_reset_expires_at` columns dropped. Password policy deliberately excludes `pwned`/breach DB checks (out-of-scope decision — no external PII-leak dependency). Tests: `tests/Feature/Auth/PasswordFlowTest.php` (16 tests / 66 assertions). Note: Sanctum's `RequestGuard` caches the resolved user for the test process, so revocation tests call `forgetGuards()` to simulate the fresh container each real request gets. Suite 366/1448 green; pint clean; composer audit 0.

---

### [VULN-14] No idle session timeout — 30-day remember token, static cookie, no rotation — ✅ REMEDIATED (FIX-14)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 6.5 (AV:N/AC:L/PR:H/UI:N/S:U:C:H/I:H/A:N — stolen admin cookie usable 30 days)
- **Category:** Identification & Authentication Failures (A07:2021)
- **Files:** `config/sanctum.php:40` (`expiration => null`) · `app/Domains/Auth/Actions/LoginAction.php:58-62` (8h / 30d) · `vendor/laravel/sanctum/src/Guard.php:56-58` (`last_used_at` tracked but never consulted)
- **Affected code:**
```php
'expiration' => null,   // config/sanctum.php:40 — absolute TTL only, no idle timeout
$token = $user->createToken(name: 'admin-session', abilities: ['admin'],
    expiresAt: $dto->remember ? now()->addDays(30) : now()->addHours(8));
```
- **Description:** Token expiry is enforced server-side per-token (absolute 8h/30d) — good — but there is **no sliding idle timeout**: `last_used_at` is updated on every request yet never used to expire idle sessions. A remembered session is a single static cookie valid 30 days regardless of activity; no rotation.
- **Impact:** Extended compromise window for a privileged admin session; no response to idle/abandoned sessions.
- **Remediation:** Enforce idle expiry in `EnsureUserIsActive` (or a token middleware): if `last_used_at < now()->subDays(N)`, delete the token; keep the absolute cap; consider rotating the token on login.
- **Verification:** PHPUnit with mocked `last_used_at`; runtime timing test. UNVERIFIED (timing-dependent).
- **References:** OWASP A07:2021 session-management cheat sheet.
- **✅ REMEDIATED (FIX-14):** New `EnforceIdleSessionTimeout` middleware (alias `idle`, runs after `auth:sanctum` + `active` on the auth group AND the entire `/admin` prefix): real DB-backed token whose `last_used_at` (falling back to `created_at` for never-used tokens) is older than `config('security.session_idle_timeout_hours')` (env `SESSION_IDLE_TIMEOUT_HOURS`, default 2) is **deleted**, audited `auth.session_idle_timeout`, and answered 401 `SESSION_EXPIRED`. Sanctum's own `last_used_at` stamping is disabled (`sanctum.last_used_at => false`) — it fired during guard resolution, before any route middleware, which would have masked every token as just-active; the middleware now stamps `last_used_at` on every surviving request (requirement 4 preserved). TransientToken/session auth and `Sanctum::actingAs` mocks pass through untouched. Absolute ceiling (8h/30d per-token `expires_at`, Guard-enforced → 401 `UNAUTHENTICATED`) unchanged. Tests: `tests/Feature/Auth/IdleSessionTimeoutTest.php` (7 tests / 18 assertions) — idle 3h → 401 + row deleted + audit; active 10 min → 200 + `last_used_at` refreshed; absolute expiry → 401; never-used token within window → 200 / older → 401; config override 5h→200 vs 1h→401; admin-route coverage. Suite 373/1466 green; pint clean; composer audit 0.

---

### [VULN-15] Per-email login limit enables targeted account lockout; 60s window with no escalation — ✅ REMEDIATED (FIX-15)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U:C:N/I:N/A:L)
- **Category:** Insecure Design (A04:2021) — availability
- **Files:** `app/Domains/Auth/Actions/LoginAction.php:88-126` · `AppServiceProvider.php:64-74`
- **Affected code:**
```php
if (RateLimiter::tooManyAttempts($this->ipKey($dto), $maxAttempts)
    || RateLimiter::tooManyAttempts($this->emailKey($dto), $maxPerEmail)) {
```
- **Description:** The per-email key (10 attempts/60 s) is IP-independent: an attacker rotating IPs can lock a known victim's account for repeated 60-second windows indefinitely — zero CAPTCHA, zero escalation (no 5-min → 30-min backoff), zero alerting. With the per-IP limiter broken behind the proxy (VULN-07), this is the *only* effective login control, and it is itself abuseable.
- **Impact:** Availability degradation of admin login; masks attacker brute-forcing by pre-burning the budget.
- **Remediation:** Escalating windows per account (e.g., `RateLimiter::hit($key, 60)` then 300/1800), audit+alert on threshold crossing; skip `clearRateLimits` on success for the attacker-controlled budget, or exempt genuine sessions via proof-of-work/CAPTCHA after N failures.
- **Verification:** 11 rapid wrong-password attempts for one email → 429; window behavior after fix.
- **References:** OWASP A04:2021; CWE-307 (improper restriction of excessive authentication attempts).
- **✅ REMEDIATED (FIX-15):** Escalating lockout windows per email. A long-lived (24h, `AUTH_LOCKOUT_ESCALATION_HOURS`) hashed failure counter drives the block window: ≤5 failures → 60s; 6–10 → 300s; >10 → 1800s (`security.auth_lockout.tiers`). `RateLimiter::hit()` only sets the `:timer` on the first hit of a burst, so the window is re-armed explicitly via `Cache::put` on every failure with the escalated tier. Tier crossings audit `auth.login_lockout_escalated` (failures_24h + window_seconds in context). On success, only the caller's per-IP budget is cleared — the per-email block + escalation counters are attacker-controlled and decay naturally (a genuine success can no longer reset a just-burned budget). Per-burst gate (10) and per-IP gate (5) unchanged; burst gate verified: 10 rotating-IP failures → 11th request 429. Tests: `tests/Feature/Auth/LoginEscalationTest.php` (4 tests / 56 assertions) — tier windows via `availableIn` (60 → 300 → 1800), tier-crossing audits (incl. 6-minute time advance to prove the 24h counter survives the window and escalates to tier 3), success-clears-only-IP. Suite 377/1522 green; pint clean; composer audit 0.

---

### [VULN-16] Role assignment without permission-subset check (lateral privilege movement)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 6.5 (AV:N/AC:L/PR:L/UI:N/S:U:C:H/I:N/A:N)
- **Category:** Broken Access Control (A01:2021)
- **Files:** `app/Http/Controllers/Admin/UserController.php:101-114` (store `:51-62`, update `:92-111`)
- **Affected code:**
```php
'role_id' => ['sometimes', 'uuid', 'exists:roles,id'],
```
- **Description:** Beyond VULN-01, nothing constrains which role a `manage_users` holder may assign: a User Manager can promote an account to the seeded `admin` role (gaining `manage_settings`, `view_audit_logs`, `manage_customers`, `manage_projects` — permissions they never held), then use it. The permission-subset invariant (`assigned ⊆ actor`) is enforced nowhere.
- **Impact:** Lateral privilege movement; role-grant as a delegation bypass.
- **Remediation:** Enforce `assigned_role.permissions ⊆ actor.permissions` (super-admin excepted) in `store()` and `update()`; expose only eligible roles in the UI dropdown.
- **Verification:** PHPUnit with a `manage_users`-only actor assigning the seeded `admin` role → 403 after fix.
- **References:** OWASP A01:2021.

---

### [VULN-17] GET endpoint performs a state change (contact-request auto-mark)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.3 (AV:N/AC:L/PR:L/UI:N/S:U:C:N/I:L/A:N)
- **Category:** Insecure Design (A04:2021) / CSRF-adjacent
- **File:** `app/Http/Controllers/Admin/ContactRequestController.php:47-58`
- **Affected code:**
```php
if ($contactRequest->isNew()) {
    $contactRequest->update(['status' => 'reviewing']);   // mutation on GET
    $this->auditService->log('contact_request.read', ...);
}
```
- **Description:** GET with a write side-effect: prefetchers/crawlers/cache-replays mark requests "reviewing" and pollute the audit log; no `handled_by` attribution is recorded (bypasses the discipline of `updateStatus`).
- **Impact:** State corruption, dashboard "new" counts degraded, audit noise.
- **Remediation:** Move auto-marking to an explicit `POST .../mark-reviewing` (or client-driven), keeping GET pure.
- **Verification:** `GET` twice → no second status change/audit row after fix.
- **References:** OWASP A04:2021; HTTP semantics (RFC 9110 §9.2.1).

---

### [VULN-18] Contact requests: all PII visible to every `manage_contact_requests` holder; unconstrained lifecycle
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.5 (AV:N/AC:L/PR:L/UI:N/S:U:C:H/I:N/A:N — insider PII over-exposure)
- **Category:** Broken Access Control (A01:2021) / Privacy
- **Files:** `app/Http/Controllers/Admin/ContactRequestController.php:28-38,60-84` · `ContactRequest.php:57` (STATUSES)
- **Affected code:**
```php
$requests = ContactRequest::when(...)->paginate(...);   // ALL requests, no assignment filter
$contactRequest->update(['status' => $validated['status'], 'handled_by' => Auth::id(), ...]);
```
- **Description:** There is no `assigned_to`/ownership model — every holder of `manage_contact_requests` (the seeded "Support" role) reads every request's full PII (name, email, phone, message, IP) and can apply any status transition (`new → archived`/`completed` with no transition map).
- **Impact:** GDPR over-exposure of PII across the whole admin population; no workload isolation; lifecycle integrity.
- **Remediation:** Optional `assigned_to` + `assigned_at` with handler-scoped reads (super-admin sees all); enforce a status transition map at the model level.
- **Verification:** Two admin accounts with `manage_contact_requests`; after fix, second sees only assigned requests.
- **References:** GDPR Art. 25 (data protection by design); OWASP A01:2021.

---

### [VULN-19] Full-text search materializes unbounded result sets before limiting (search DoS) — ✅ REMEDIATED (FIX-18)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U:C/N:I/N:A:L)
- **Category:** Insecure Design (A04:2021) — resource exhaustion
- **File:** `app/Domains/Search/Drivers/PostgresSearchDriver.php:69-84` (+ per-type queries `:94-177`)
- **Affected code:**
```php
$sorted = $all->sortByDesc('rank')->values()->take($limit);   // full hydration + PHP sort
```
- **Description:** Every matching row across 4 entities is hydrated into PHP memory and sorted before `take($limit)`; no SQL `LIMIT`. A common search term on a large corpus → 4 full result sets per request; `throttle:search` limits frequency, not cost. (Note: SQL injection is NOT possible — all input is bound; locale/config strings are whitelisted — PROT-1.)
- **Impact:** CPU/memory exhaustion per request; amplified with IP rotation (rate-limit collapse, VULN-07).
- **Remediation:** Push `LIMIT $limit` (plus small margin) into each `DB::table(...)` query; derive `total` from a real `COUNT`.
- **Verification:** EXPLAIN the queries; PHPUnit with large fixture. UNVERIFIED (perf).
- **References:** OWASP A04:2021; CWE-770.
- **✅ REMEDIATED (FIX-18):** Every per-type query now runs `->limit($limit + 5)` in SQL (`PER_TYPE_MARGIN`) — the margin guarantees the merged global top-`limit` is always a subset of the hydrated candidates (each type contributes at most its top limit+5; we only keep `limit`), so ranking correctness is preserved. `total` comes from real `COUNT(*)` aggregates per type against the same filtered tables (GIN-indexed `@@` match), never from collection sizes. The final cross-type `sortByDesc('rank')` + `take($limit)` now operates on ≤ 4×(limit+5) rows (≤ 220 at the max `limit=50`). `throttle:search` (60/min) untouched. **Bonus find:** the driver was latently broken — `json_build_object()` returns the `json` type, which PDO hands to PHP as a STRING, but `SearchResult::$meta` is typed `array` → every search with results 500'd. Fixed by decoding `meta` in the result mapping (`json_decode(...) ?: []`). Tests: `tests/Feature/Public/SearchLimitPushdownTest.php` (4 tests / 36 assertions) — query log proves SQL `limit N` on all four table queries + `count(*) as aggregate` present (SQL pushdown, not PHP take()); a 40-product fixture with cross-type matches returns exactly `limit` results ranked by descending rank with the exact-title product on top; `total` = 43 real count; public endpoint contract unchanged (shape, meta.total, grouped, type-filtered counts). Suite 389/2186 green; pint clean; composer audit 0.

---

### [VULN-20] Backups compressed but unencrypted; no automated off-host copy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM [DEPLOYMENT]
- **CVSS:** 6.5 (AV:P/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N — physical/host access)
- **Category:** Cryptographic Failures (A02:2021)
- **Files:** `ops/backup/backup.sh:53-57` · `docs/backup-and-recovery.md:51,145`
- **Affected code:**
```bash
if ! PGPASSWORD="${DB_PASSWORD}" pg_dump --format=custom --compress=9 --file="$TMP" "$DB_DATABASE"; then
```
- **Description:** Dumps contain contact-request PII, customer data, `quoted_value`, and `failed_jobs` payloads (incl. plaintext admin passwords, VULN-03) in readable form; retention is count-only; off-host copy is not automated.
- **Impact:** Full customer database disclosure via backup-media theft/cloud snapshots; GDPR Art. 32.
- **Remediation:** Encrypt before publish (`age`/`gpg -c` with a key off-host), automate off-host rsync, test encrypted restore in the quarterly drill.
- **Verification:** `pg_restore --list` on a backup should require the key after fix.
- **References:** GDPR Art. 32; OWASP A02:2021.

---

### [VULN-21] CI/CD supply-chain and deploy hygiene
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM [DEPLOYMENT]
- **CVSS:** 7.4 (AV:N/AC:H/PR:N/UI:N/S:C/C:H/I:H/A:N — supply chain via CI)
- **Category:** Software & Data Integrity Failures (A08:2021)
- **Files:** `.github/workflows/ci.yml:170` · `.github/workflows/release.yml:91-97`
- **Affected code:**
```yaml
uses: aquasecurity/trivy-action@master        # unpinned moving tag; release.yml has packages: write
ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no ${{ secrets.DEPLOY_HOST }} << 'EOF'
```
- **Description:** (a) `trivy-action@master` is a mutable reference — a compromised tag executes with the workflow's permissions (GHCR `packages: write` in release.yml) and can exfiltrate `DEPLOY_SSH_KEY`/`DEPLOY_HOST`. (b) `StrictHostKeyChecking=no` permits MITM during deploys; the private key persists on the runner.
- **Impact:** Backdoored images pushed to GHCR; deploy-time MITM; secret exfiltration.
- **Remediation:** Pin to commit SHA; add explicit `permissions: contents: read` on scan jobs; pre-seed `known_hosts` via `ssh-keyscan` and use `StrictHostKeyChecking=yes`; prefer GitHub Actions SSH/short-lived keys.
- **Verification:** Static review of workflow YAML after change.
- **References:** OWASP A08:2021; GitHub Actions security hardening docs.

---

### [VULN-22] Production logging at debug level, single unbounded channel, SQL bindings logged
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM [DEPLOYMENT]
- **CVSS:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U:C/L/I:N/A:N — with log access)
- **Category:** Security Logging & Monitoring Failures (A09:2021) / Misconfiguration (A05:2021)
- **Files:** `ys-api/.env.example:12-15` (`LOG_LEVEL=debug`, `LOG_CHANNEL=stack`, `LOG_STACK=single`) — no `config/logging.php` shipped
- **Description:** Compose passes no `LOG_LEVEL`, so production runs the framework default `debug`: laravel.log accumulates stack traces including **query bindings** (emails, IPs, names, PII) and absolute paths; `single` channel → unbounded disk growth (log-exhaustion DoS), no rotation.
- **Impact:** PII at rest in logs; disk exhaustion; GDPR concerns.
- **Remediation:** Set `LOG_LEVEL=warning`, use `daily` channel (30-day retention), ensure `storage/logs` permissions, ship a `config/logging.php` so defaults are explicit.
- **Verification:** `docker compose config` after fix shows `LOG_LEVEL=warning`; inspect rotated logs.
- **References:** OWASP A09:2021; CWE-532 (sensitive info in logs).

---

### [VULN-23] `password_reset_token` column stores plaintext (dormant)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM (dormant — becomes HIGH if a reset flow is ever built on it)
- **CVSS:** n/a (no live attack surface)
- **Category:** Cryptographic Failures (A02:2021)
- **File:** `database/migrations/2025_01_01_000002_create_users_table.php:26-27`
- **Affected code:**
```php
$table->string('password_reset_token')->nullable();
$table->timestamp('password_reset_expires_at')->nullable();
```
- **Description:** No reset endpoints exist (grep: zero), but the schema invites a future reset flow storing plaintext tokens — a DB dump would yield live account-takeover tokens. No `password_resets` table exists.
- **Impact:** Future ATO vector; dead schema with a trap.
- **Remediation:** Hash tokens (SHA-256) at write time when implementing the flow (VULN-13), or drop the columns in favor of a `password_reset_tokens` table with hashed token + created_at expiry.
- **Verification:** Schema review after implementation.
- **References:** OWASP A02:2021; Laravel password broker.

---

### [VULN-24] Subscription business logic — arbitrary price/status/backdating, no plan linkage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM (business logic)
- **CVSS:** 6.5 (AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N — revenue/ledger integrity)
- **Category:** Insecure Design (A04:2021) — business logic abuse
- **Files:** `app/Http/Requests/Admin/Billing/CreateSubscriptionRequest.php:21-28` · `UpdateSubscriptionRequest.php:21-40` · `app/Domains/Billing/Actions/CreateSubscriptionAction.php:26-38` · migration `2026_07_31_000003` (no uniqueness on active subs)
- **Affected code:**
```php
'price' => ['required', 'numeric', 'min:0', 'decimal:0,2'],   // no max, no plan linkage
'status' => ['sometimes', Rule::in(['active', 'expired', 'cancelled'])],
```
- **Description:** Any `manage_subscriptions` holder can fabricate $0 "active" subscriptions, zero out prices, backdate `starts_at`, set arbitrary `currency`/`plan_name` (not tied to `ProductPricingPlan`), and create duplicate active subscriptions for the same customer+product. There is no payment verification (manual entry by design, `is_manual_entry=true` — good audit signal, but no guardrail). `UpdateSubscriptionRequest`'s `ends_at` validation only compares against `starts_at` when both are present → `ends_at < starts_at` rows possible (`Subscription::scopeActive()` silently treats them as expired).
- **Impact:** Revenue/MRR ledger corruption (dashboards, MRR math), fabricated free subscriptions, audit-confusing data.
- **Remediation:** Tie `plan_name`/`price` to `ProductPricingPlan` rows (server-side), add max-price cap + currency allowlist, add a check constraint `ends_at > starts_at`, partial unique index on active subscriptions per (customer_id, product_id), require a reason for price/status changes.
- **Verification:** PHPUnit: attempt price 0 on active sub of another plan, backdated start, duplicate active sub → rejected.
- **References:** OWASP A04:2021; CWE-840 (business logic errors).

---

### [VULN-25] Setting values unvalidated — `javascript:` URLs served to every visitor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.4 (AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:N)
- **Category:** Injection (A03:2021)
- **Files:** `app/Http/Controllers/Admin/SettingController.php:58-67` · `Public/SettingController.php:20-25`
- **Affected code:**
```php
$validated = $request->validate(['value' => ['required']]);   // no per-key type/scheme rules
$setting->update(['value' => $validated['value'], ...]);
```
- **Description:** `manage_settings` can store arbitrary JSON on any existing key — including `social.*_url` values served to every visitor; the frontend renders `settings.social.x_url` directly in `<a href>` with no scheme validation (frontend finding, LOW severity alone). No key can be *created* via API and `is_public` is not writable — bounded, but URL/type rules are absent.
- **Impact:** Public content manipulation; combined with frontend raw-href rendering → `data:`-scheme phishing surface.
- **Remediation:** Per-key validation map (URL keys → `url` + `starts_with:https://`; boolean keys → boolean; length caps).
- **Verification:** PHPUnit: store `javascript:` in a URL setting → rejected.
- **References:** OWASP A03:2021.

---

### [VULN-26] Error handling — raw exception messages outside production; `ModelNotFoundException` → 500
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.3 (AV:N/AC:L/PR:N/UI:N/S:U:C/L/I:N/A:N)
- **Category:** Security Misconfiguration (A05:2021) / Info Disclosure
- **File:** `bootstrap/app.php:77-88` (Throwable renderer) + `:61-67` (HttpException renderer)
- **Affected code:**
```php
$message = app()->environment('production') ? 'An unexpected error occurred.' : $e->getMessage();
```
- **Description:** Outside `production`, the generic renderer returns raw `getMessage()` — PDO/SQLSTATE errors embed DB host, table/column names, query bindings (PII). Also, `ModelNotFoundException` is converted by Laravel into `NotFoundHttpException` whose message is passed through the `HttpException` renderer **in all environments** → 404 responses disclose internal model class names (`"No query results for model [App\Domains\Product\Models\Product]."`) and the queried UUID (VULN-29). There is no `ModelNotFoundException`→404-specific handling.
- **Impact:** Schema/PII disclosure in non-prod; model-name + identifier disclosure in prod 404s.
- **Remediation:** Always mask to `'An unexpected error occurred.'` (log real exception server-side); add an explicit `ModelNotFoundException` renderer returning a fixed `'Not Found.'`.
- **Verification:** `GET /api/v1/public/products/nonexistent` → generic 404 message after fix.
- **References:** OWASP A05:2021; CWE-209.

---

### [VULN-27] No rate limiting on any admin route (authenticated DoS) — ✅ REMEDIATED (FIX-19)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** MEDIUM
- **CVSS:** 5.3 (AV:N/AC:L/PR:L/UI:N/S:U:C:N/I:N/A:L)
- **Category:** Insecure Design (A04:2021)
- **File:** `routes/api.php:130` (admin group: `['auth:sanctum','active']` — no throttle)
- **Affected code:**
```php
Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'active'])->group(function () { ... });
```
- **Description:** All 120+ admin routes are unthrottled. A stolen/leaked token can hammer `dashboard/stats` (~20 COUNT queries/request), `audit-logs?per_page=100`, wildcard `LIKE %` searches at full speed.
- **Impact:** Resource exhaustion with a valid token.
- **Remediation:** Add a per-user `throttle:admin` (e.g., 300/min keyed by user id) to the group; consider lower caps on heavy endpoints.
- **Verification:** Load-test after adding limiter.
- **References:** OWASP A04:2021; CWE-770.
- **✅ REMEDIATED (FIX-19):** `throttle:admin` added to the admin route group (`['auth:sanctum', 'active', 'idle', 'throttle:admin']`). New `admin` limiter in `AppServiceProvider` — **300/min per authenticated user keyed by user ID** (not IP: the admin team shares egress NAT; IP-keying would starve them or be trivially rotated), configurable via `RATE_LIMIT_ADMIN` (`security.rate_limits.admin_throttle`, default 300). The limiter closure runs after `auth:sanctum`, so `$request->user()` resolves the authenticated identity; unauthenticated requests (401 anyway) fall back to an IP key so even they stay bounded. 429 body matches the app shape (`success:false`, `RATE_LIMIT_EXCEEDED`). Lower caps on heavy endpoints (audit-logs / dashboard/stats) deliberately deferred to Phase-3 per the Phase-2 acceptance note — revisit if telemetry shows abuse. Tests: `tests/Feature/Admin/AdminThrottleTest.php` (3 tests / 607 assertions) — 300 requests → 200, **301st → 429 RATE_LIMIT_EXCEEDED**; a different user starts with a fresh 300/min budget; the public `throttle:public` endpoints are untouched after the admin budget is exhausted. Suite 385/2150 green; pint clean; composer audit 0.

---

### [VULN-28] `$guarded = []` on FailedJob model (no reachable sink)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Mass Assignment
- **File:** `app/Domains/System/Models/FailedJob.php:22`
- **Affected code:**
```php
protected $guarded = [];
```
- **Description:** The only `$guarded = []` in the codebase. No write path reaches it today (controller is read-only, field-mapped manually), but it is a latent mass-assignment sink if a retry/delete endpoint is ever added.
- **Impact:** None today; latent.
- **Remediation:** `protected $fillable = [];` (read-only model).
- **Verification:** Grep for `$guarded = []` after fix.

---

### [VULN-29] 404 responses disclose internal model class names and queried identifiers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Information Disclosure (A05:2021)
- **Files:** `bootstrap/app.php:61-67` · all public controllers using route-model binding (e.g. `Public/ProductController.php:37`)
- **Affected code:**
```php
$exceptions->render(function (HttpException $e, $request) {
    ... 'message' => $e->getMessage() ?: 'An error occurred.',
```
- **Description:** Laravel converts `ModelNotFoundException` → `NotFoundHttpException` before renderers run, carrying `"No query results for model [App\Domains\Product\Models\Product]."` — served verbatim by the HttpException renderer in **every** environment. Also leaks the queried UUID.
- **Impact:** Internal namespace/class enumeration; identifier probing.
- **Remediation:** Return a fixed `'Not Found.'` for 404-class exceptions.
- **Verification:** curl a nonexistent resource → generic message.

---

### [VULN-30] Array-valued query params cause 500s on otherwise clean public endpoints
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Robustness / DoS-lite
- **Files:** `Public/RoadmapController.php:19` · `Public/UpdateController.php:20` · `Public/DocumentationController.php:19,26,34`
- **Affected code:**
```php
->when($request->query('product_id'), fn ($q, $id) => $q->where('product_id', $id))
```
- **Description:** `?product_id[]=x` makes `query()` return an array → Eloquent binds an array → `QueryException` → 500 (masked in prod, raw in dev — VULN-26). Not injection (parameterized), but trivial 500 generation.
- **Impact:** Error-log noise, monitoring false alarms, dev info leak.
- **Remediation:** Validate scalar params (`sometimes|uuid`) or cast `(string) $id`.
- **Verification:** curl `?product_id[]=x` → 422/200 after fix.

---

### [VULN-31] Auth cookie: name hardcoded in middleware; `__Host-` prefix not used
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Session Management (defense-in-depth)
- **Files:** `app/Http/Middleware/CookieToBearer.php:15,19` vs `config/security.php:77` · `app/Http/Controllers/Auth/AuthController.php:150-161`
- **Affected code:**
```php
if ($request->hasCookie('ys_admin_token') && ! $request->bearerToken()) {   // hardcoded name
```
- **Description:** (a) The middleware reads the hardcoded `ys_admin_token` while the cookie is written from config — an operator changing `AUTH_COOKIE_NAME` silently breaks all sessions. (b) The cookie is host-only, Secure-in-prod, path `/` — it qualifies for the `__Host-` prefix, which would block subdomain cookie-shadowing; not applied. `Partitioned` defaults off in production compose (CHIPS defense-in-depth).
- **Impact:** Config drift → auth outage; subdomain cookie-shadowing surface (low, same-site topology).
- **Remediation:** `$name = config('security.cookies.name', 'ys_admin_token');` in `CookieToBearer`; rename cookie to `__Host-ys_admin_token`; set `AUTH_COOKIE_PARTITIONED=true` in prod compose.
- **Verification:** Set `AUTH_COOKIE_NAME=foo` → login still works after fix.

---

### [VULN-32] `/health` is unthrottled and unauthenticated (DB-connection churn)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** DoS-lite
- **File:** `routes/api.php:47-75`
- **Affected code:**
```php
Route::get('/health', function () { DB::connection()->getPdo(); ... Cache::put('_health_check', 1, 10); ... });
```
- **Description:** Each hit opens a DB connection + cache write; no throttle (outside the `public` group). Version disclosure was already removed (good).
- **Impact:** Cheap connection churn amplifier when DB/cache is degraded.
- **Remediation:** `->middleware('throttle:health')` or fold into the public limiter.

---

### [VULN-33] Missing config files fall back to framework defaults (works by accident)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Security Misconfiguration (A05:2021)
- **Files:** missing: `config/auth.php`, `config/hashing.php`, `config/logging.php`, `config/database.php` (present: `queue.php` only)
- **Description:** These configs are absent; Laravel 12 merges framework defaults. **Investigated and refuted an agent claim that this breaks auth**: Sanctum's provider auto-registers the `sanctum` guard (`vendor/laravel/sanctum/src/SanctumServiceProvider.php:23-28` with `provider => null`, and `Sanctum\Guard::hasValidProvider()` returns true for null provider, `Guard.php:145-149`) — token auth works end-to-end. However: (a) the `web` guard's provider points to `App\Models\User` which does not exist (any future session flow breaks); (b) `PASSWORD_HASH_DRIVER=argon2id` in `.env` is inert — real env var is `HASH_DRIVER`, so hashing runs framework-default **bcrypt cost 12** (acceptable, but the config lies); (c) `LOG_LEVEL` defaults to debug (VULN-22); (d) DB SSL options are framework defaults (`sslmode=prefer`).
- **Impact:** Misleading config, drift risks, argon2id intent unrealized.
- **Remediation:** Publish `config/auth.php` (sanctum guard + `App\Domains\Auth\Models\User` provider), `config/hashing.php` (explicit driver/argon params), `config/logging.php` (daily, warning), `config/database.php` (pgsql SSL `sslmode=require` option).
- **Verification:** `php artisan config:show auth` after publishing.

---

### [VULN-34] Frontend hardening gaps (no critical/high issues found in the SPA) — ✅ REMEDIATED (FIX-20)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW (composite)
- **Category:** Various — defense-in-depth
- **Files:** `ys-web/proxy.ts` (ex-`middleware.ts`, renamed — see below) · `ys-web/next.config.ts` · `ys-web/app/layout.tsx` · `ys-web/app/[locale]/layout.tsx` · `ys-web/components/shared/ThemeProvider.tsx` · `ys-web/components/layout/Footer.tsx` · `ys-web/lib/cms/validate.ts` · `ys-web/lib/platform/security/csrf.ts`
- **Description:** (a) CSP allowed `'unsafe-inline'` scripts (required by the two inline bootstrap scripts — locale/dir in `app/layout.tsx` and theme in `ThemeProvider.tsx`); `'unsafe-eval'` was correctly dev-only. (b) No HSTS in the Next headers (previously delegated to proxy — VULN-09). (c) `settings.social.*` rendered into `href` unvalidated (backend fix is VULN-25). (d) `Math.random`-based tokens in the isolated `lib/platform` demo layer (no UI callers).
- **Impact:** Weakens XSS containment; phishing surface via data:-scheme links; no client-side compromise found.
- **Remediation:** Nonce/hash the inline theme script and drop `'unsafe-inline'`; validate social URLs at render (`lib/cms/validate.ts` allowlist); replace `Math.random` with `crypto.getRandomValues` if the demo layer is ever wired to a boundary.
- **✅ REMEDIATED (FIX-20):** Strict nonce-based CSP with **no `'unsafe-inline'` in `script-src`**:
  - **`middleware.ts` → `proxy.ts` migration** — Next.js 16 deprecated the `middleware` file convention and renamed it to `proxy` (verified in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/{middleware,proxy}.md`); the file was `git mv`'d, the export renamed `middleware` → `proxy`, and all prior behavior preserved (admin cookie-presence gate → `/admin/login` 307, default-locale redirects, `/ecosystem` 308s — live-verified). Proxy runs on the Node.js runtime (Buffer/crypto available).
  - **CSP emitted per-request in `proxy.ts`:** `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'` (dev adds `'unsafe-eval'` for React dev tooling — same requirement the CSP guide documents); `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` (inline style *attributes* are used app-wide and nonces do not cover them); `font-src 'self' https://fonts.gstatic.com`; `img-src 'self' <apiOrigin> data: blob:`; `connect-src 'self' <apiOrigin>` (apiOrigin derived from `NEXT_PUBLIC_API_URL`, same single source as next.config); `frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'`. Nonce = `base64(crypto.randomUUID())`, fresh per request, propagated to the layout via the `x-nonce` header (the pattern from this version's CSP guide: Next.js auto-applies the nonce to its own inline scripts and bundles). Removed the CSP from `next.config.ts` `headers()` — next.config headers are applied *before* proxy in the execution order, so leaving both would have shipped two CSP headers (browsers enforce the intersection → broken app).
  - **Both inline bootstrap scripts carry the nonce:** `app/layout.tsx` (locale/dir, reads `x-nonce` via `await headers()`) and `ThemeProvider.tsx` (theme bootstrap — prop passed from the already-async `app/[locale]/layout.tsx`; the theme script was discovered missing its nonce during live HTML inspection, which would have silently broken theme persistence under the strict CSP).
  - **Tradeoff, documented per the CSP guide:** nonce-based CSP requires dynamic rendering — every route is now `ƒ (Dynamic)` instead of statically prerendered (verified in build output). Acceptable for this site (single-node Docker, no CDN in the architecture; SSR HTML stays fully crawlable). Revisit SRI (experimental in this version) if static generation is ever required.
  - **HSTS added** (`max-age=31536000; includeSubDomains`, production only — matches the backend's prod-only HSTS in `SecurityHeaders.php`).
  - **Social URL allowlist at render:** new `validateSocialUrl()` in `lib/cms/validate.ts` — `https:` only, host must be a known social platform (`github.com`/`linkedin.com`/`x.com`/`twitter.com`/`tiktok.com`, `www.` tolerated), rejects `javascript:`/`data:`/credentials/unknown hosts; applied in `Footer.tsx` (invalid entries are dropped from the rendered socials).
  - **`csrf.ts`:** `Math.random()` replaced with `crypto.getRandomValues` (16 bytes → hex) in the demo `CsrfManager`.
  - **Verification (live, on the standalone build):** `GET /en` → CSP header `script-src 'self' 'nonce-…' 'strict-dynamic'` with **no `'unsafe-inline'`**, HSTS present; 24/24 `<script>` tags carry `nonce` (JSON-LD blocks exempt — `application/ld+json` is not a JS MIME type, not governed by `script-src`); `/ar` RTL + nonce'd scripts; `/admin/login` 20/20 nonce'd; `/admin` → 307 `/admin/login`, `/` → 307 `/en/`, `/ecosystem` → 308 `/en/products`, `/ar/ecosystem/foo` → 308 `/ar/products/foo`. `tsc --noEmit`, eslint (touched files), `next build` all clean. No backend changes → PHP suite untouched (last full run 389/2186).

---

### [VULN-35] Session-cookie defaults insecure (latent — API does not use server sessions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Misconfiguration (A05:2021)
- **Files:** `docker-compose.yml:77` (`SESSION_SECURE_COOKIE=false`) · `config/session.php:77,81` · `.env.example:29`
- **Description:** The API authenticates via the Sanctum bearer cookie, so the `ys_session` cookie is unused today; but `Secure=false`, `SESSION_ENCRYPT` off, driver `file` would be the default for any future web route.
- **Impact:** Latent insecure session cookie if a web flow is ever added.
- **Remediation:** Default `SESSION_SECURE_COOKIE=true` in prod compose; `SESSION_DRIVER=redis` + `SESSION_ENCRYPT=true` if sessions are ever used.

---

### [VULN-36] Sanctum stateful domains include localhost in production fallback; CORS uses wildcards
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Misconfiguration (A05:2021)
- **Files:** `config/sanctum.php:16-20` · `config/cors.php:17,23,29`
- **Affected code:**
```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,localhost:3000,...')),
// cors.php
'allowed_methods' => ['*'], 'allowed_headers' => ['*'], 'supports_credentials' => true,
```
- **Description:** If `SANCTUM_STATEFUL_DOMAINS` is unset in prod (it is), localhost entries remain (DNS-rebinding mitigation recommended: explicit prod value). CORS is safe (single configured origin, no wildcard origins) — methods/headers wildcards are informational.
- **Remediation:** Set explicit `SANCTUM_STATEFUL_DOMAINS` in prod compose; tighten `allowed_methods`/`allowed_headers` to the used verbs/headers.

---

### [VULN-37] Floating base-image tags; `.dockerignore` misses `storage/app/private`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Supply chain (A08:2021)
- **Files:** `docker-compose.yml:95,113,131` (`nginx:alpine`, `redis:7-alpine`, `postgres:16-alpine`) · `ys-api/.dockerignore:8-14`
- **Description:** Unpinned patch/major tags float; `COPY . .` would bake locally-present private-disk files into the image if present at build time (currently empty).
- **Remediation:** Pin digests or full versions; enable Dependabot for images; add `storage/app/private/*` to `.dockerignore`.

---

### [VULN-38] Public documentation index serializes full models (info disclosure)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Information Disclosure
- **File:** `Public/DocumentationController.php:38`
- **Affected code:**
```php
return response()->json(['success' => true, 'data' => $categories]);   // full models, no resource
```
- **Description:** Unlike every other public endpoint (lean resources), docs index returns entire `DocumentationCategory`/`DocumentationArticle` models — exposing `product_id`, `author_id`, `is_published`, timestamps, and both-language content to unauthenticated callers.
- **Impact:** Internal column enumeration; unpublished-article metadata exposure.
- **Remediation:** Build a `Public\DocumentationResource` mirroring `FaqResource`/`MenuItemResource` style.

---

### [VULN-39] Upload filename extension derived from client (MIME/extension mismatch)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** File Upload hardening
- **File:** `app/Domains/System/Services/MediaUploadService.php:148-154`
- **Affected code:**
```php
$extension = $file->getClientOriginalExtension();
return $random.'.'.strtolower($extension);
```
- **Description:** Extension comes from the client; MIME from server `finfo`. A PNG named `x.svg` is stored as `uuid.svg` with `mime_type=image/png`, and the web server serves it by extension → content-type/sniffing mismatch (no execution today — the bytes aren't XML; but the hazard persists for future formats).
- **Remediation:** Derive extension from the detected MIME (map `image/jpeg→jpg`, `image/svg+xml→svg`, ...).

---

### [VULN-40] Audit-log content exposes PII (emails/IPs) to all `view_audit_logs` holders
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW (by design; explicit risk note)
- **Category:** Privacy / Least privilege
- **Files:** `AuditLogController.php:19-26` · `LoginAction.php:34-38` (`auth.login_failed` context logs the attempted email + IP) · `AuditService.php:29-39`
- **Description:** Every `view_audit_logs` holder (seeded Admin role) can read the full audit history: users' emails, IPs, user agents, record-change snapshots — including the exact emails being brute-forced (useful insider intel). No passwords/tokens are logged (verified clean).
- **Impact:** Operational metadata exposure within the admin population.
- **Remediation:** Consider redacting failed-login emails (log sha256) and IPs after 90 days.

---

### [VULN-41] Media library is not product-scoped; unreferenced assets deletable by any `manage_media` holder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW (design)
- **Category:** Broken Access Control (A01:2021) — horizontal
- **Files:** `MediaController.php:24-58,97-114` · `referenceCounts()` `:125-153`
- **Description:** `index()` lists all media; `destroy()` deletes any unreferenced media (reference counts cover products/services/static-pages/product_media but not legacy `mediable_*` refs or soft-deleted refs). No product scoping, no uploader-ownership check.
- **Impact:** Cross-product asset visibility; destructive action on out-of-scope assets (unreferenced only).
- **Remediation:** Extend `referenceCounts` to polymorphic refs; document media as a shared global library or scope it.

---

### [VULN-42] Dashboard `health` block ungated (infrastructure status to any authenticated user)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Info Disclosure
- **File:** `app/Http/Controllers/Admin/DashboardController.php:143-147,346-368`
- **Description:** Every authenticated account (even `view_services`-only) receives DB/cache health status — all other dashboard blocks are correctly permission-gated (verified per-module).
- **Remediation:** Move `health` behind `view_audit_logs` or drop it.

---

### [VULN-43] Single-session enforcement race window + expired-token hygiene
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **Severity:** LOW
- **Category:** Session Management
- **Files:** `app/Domains/Auth/Actions/LoginAction.php:56-62` · `bootstrap/app.php` (no `withSchedule`)
- **Affected code:**
```php
$user->tokens()->delete();        // then createToken — delete-then-create race
$token = $user->createToken(...);
```
- **Description:** Two concurrent logins interleave (`delete→delete→create→create`) leaving two live tokens — single-session policy defeated probabilistically. Separately, expired tokens are never pruned (no `sanctum:prune-expired` scheduled; `routes/console.php` absent).
- **Impact:** Concurrent sessions under racing logins (low probability); unbounded `personal_access_tokens` growth.
- **Remediation:** Create the token first, then `$user->tokens()->whereKeyNot($token->accessToken->getKey())->delete()`; register `$schedule->command('sanctum:prune-expired --hours=24')->daily()`.

---

## SECTION 3: SECURITY STRENGTHS — WHAT IS PROTECTED

### [PROT-01] Tokens: CSPRNG, stored hashed, compared constant-time | ✅ PROPERLY IMPLEMENTED
- **File:** `vendor/laravel/sanctum/src/HasApiTokens.php:79-87` (`Str::random(40)` ≈ 238-bit entropy, `crc32b` suffix) · `PersonalAccessToken.php:61,67` (`sha256` storage + lookup)
- **Protected against:** DB-dump token replay; token prediction.
- **Why it works:** A DB leak yields only SHA-256 digests of unguessable tokens; lookups compare digests.

### [PROT-02] Token expiry enforced server-side per token | ✅ PROPERLY IMPLEMENTED
- **File:** `vendor/laravel/sanctum/src/Guard.php:127-129` + `LoginAction.php:58-62` (8h / 30d absolute TTL)
- **Protected against:** Client-side expiry manipulation; infinite sessions.
- **Why it works:** `expires_at` is checked at authentication time on every request regardless of `sanctum.expiration = null`.

### [PROT-03] Immediate logout revocation; cookie cleared with matching attributes | ✅ PROPERLY IMPLEMENTED
- **File:** `AuthController.php:93-96,113,136-162`
- **Protected against:** Post-logout token reuse; zombie cookies.
- **Why it works:** DB row deleted synchronously; expired `Set-Cookie` mirrors Secure/SameSite/Domain/Path so the browser drops it; repeated logout is idempotent.

### [PROT-04] Cookie flags correct; token never in the response body | ✅ PROPERLY IMPLEMENTED
- **File:** `AuthController.php:41-51,136-162`
- **Protected against:** XSS token theft (HttpOnly), network sniffing (Secure in prod), cross-site request forgery on the login cookie (SameSite=Lax), third-party cookie syncing (opt-in Partitioned).
- **Why it works:** `HttpOnly=true`, `Secure` resolved at runtime (`$config['secure'] ?? app()->isProduction()`), `SameSite=LAX`, host-only `Domain=null`, Path `/`, real token expiry in the cookie; login body contains only `user` + `expires_at`.

### [PROT-05] Password hashing: bcrypt cost 12, hashed cast, constant-time verify | ✅ PROPERLY IMPLEMENTED
- **File:** `User.php:44` (`'password' => 'hashed'`) + `BCRYPT_ROUNDS=12` honored by framework default
- **Protected against:** Plaintext credential storage; offline brute force (cost 12 ≈ 150-300 ms/guess); timing extraction of hash comparison.
- **Why it works:** Every write path (create/update/seeder) hashes via the Eloquent cast; `password_verify` is constant-time; no plaintext password ever written to `users` or audit logs.

### [PROT-06] Mass assignment tightly bounded across all 29 models | ✅ PROPERLY IMPLEMENTED
- **File:** every model uses explicit `$fillable` (only `FailedJob` uses `$guarded = []` — VULN-28); no `$request->all()` anywhere (grep-verified)
- **Protected against:** Mass-assignment injection of `role_id`, `is_active`, `permissions`, `is_manual_entry`, `handled_by`, `created_by`.
- **Why it works:** Every create/update passes `$request->validate()`/`validated()` whose keys map exactly to `$fillable`; server-set fields are never client-writable; `'*'` permission is unassignable via API (enum excludes it, `CreateRoleRequest.php:28` `Rule::in`).

### [PROT-07] RBAC gates fail closed; super-admin bypass is DB-anchored | ✅ PROPERLY IMPLEMENTED
- **File:** `AuthServiceProvider.php:36-80` (`Gate::before` on `'*'` only) · `User.php:76-90,123-132` (null role → false; zero product access rows → no access)
- **Protected against:** Forged super-admin; unfettered access for scope-less admins.
- **Why it works:** `'*'` can only exist in DB role data (no API path sets it); `canAccessProduct` fails closed on empty pivot.

### [PROT-08] Product scoping on the CMS modules (products/releases/docs/roadmap/updates/timeline/feature-flags/subscriptions) | ✅ PROPERLY IMPLEMENTED (caveat: VULN-02/06)
- **File:** e.g. `ProductController.php:41,88,104,126`; `canAccessProduct` on every index/show/store/update/destroy; global (`product_id null`) items visible to all by documented policy
- **Protected against:** Cross-product read/write within the CMS layer.
- **Why it works:** Scope filter applied on list AND item operations; `product_id` excluded from all update validations (re-scoping impossible).

### [PROT-09] SQL injection: parameterized everywhere; raw SQL is static/bound | ✅ PROPERLY IMPLEMENTED
- **File:** `PostgresSearchDriver.php:101-104,129,150,171` (`whereRaw(..., [?])`; only whitelisted `$locale`/`$conf` interpolated) · all other queries Eloquent-bound
- **Protected against:** SQLi incl. tsquery injection (`websearch_to_tsquery` grammar is injection-tolerant; `sanitizeQuery()` strips control chars, caps at 500).
- **Why it works:** No `DB::raw` with user input outside the search driver; bound parameters; locale whitelist `['english','arabic']`.

### [PROT-10] XXE/entity expansion blocked during SVG parse | ✅ PROPERLY IMPLEMENTED (caveat: VULN-05)
- **File:** `MediaUploadService.php:171` — `LIBXML_NONET | LIBXML_NOBLANKS | LIBXML_NOERROR`, no `LIBXML_NOENT`
- **Protected against:** Network-fetch XXE, billion-laughs amplification during parse.
- **Why it works:** External entity fetch disabled; no entity substitution; parse-time amplification inert.

### [PROT-11] No command injection / SSRF surface | ✅ PROPERLY IMPLEMENTED
- **File:** grep across `app/` — 0 hits for `exec|system|passthru|shell_exec|proc_open`; no URL-fetching on user input; no webhooks; media serving is disk-path based only
- **Protected against:** RCE via filenames; SSRF to internal services.

### [PROT-12] Upload hardening | ✅ PROPERLY IMPLEMENTED (caveat: VULN-05/39)
- **File:** `MediaUploadService.php:106-154` — server-side `finfo` MIME allowlist (6 types), blocked-extension + double-extension sweep, UUID filenames, 10 MB dual caps (`Controller` + service), `Storage::put` of sanitized content
- **Protected against:** PHP/HTML/JS uploads, path traversal, extension spoofing, disk exhaustion.
- **Why it works:** Whitelist (not blacklist) on detected content; no user-controlled path components; size enforced at HTTP and service layers.

### [PROT-13] Email header injection blocked by framework encoding | ✅ PROPERLY IMPLEMENTED
- **File:** `SendContactRequestNotificationJob.php:74-80` + `vendor/symfony/mime/Header/UnstructuredHeader.php:62-65` (CR/LF → QP-encoded in encoded-words)
- **Protected against:** SMTP header injection via contact-form name/subject (`\r\nBcc:...`).
- **Why it works:** Unstructured headers containing CRLF are QP-encoded; `type` is `Rule::in`-whitelisted; body Blade-escaped; From fixed to config.

### [PROT-14] Contact-form abuse controls | ✅ PROPERLY IMPLEMENTED (caveat: VULN-07)
- **File:** `ContactController.php:49-60,64-72` — honeypot `website` (silent, byte-identical fake success), spam score (bounded 0-1), per-email 2/hr limit with correct check-before-hit ordering, `throttle:contact` 3/hr/IP
- **Protected against:** Bot floods, spam, inbox stuffing; PII in cache keys (sha256 of lowercased email).
- **Why it works:** Honeypot responses are indistinguishable from real success; limits keyed on normalized sha256 emails; ordering prevents the hit-then-check off-by-one.

### [PROT-15] Rate limiting coverage on the unauthenticated surface | ✅ PROPERLY IMPLEMENTED (caveat: VULN-07)
- **File:** `AppServiceProvider.php:57-88` — `auth` 5/min/IP, `public` 120/min/IP, `search` 60/min/IP, `contact` 3/hr/IP; search/contact swap off the group limiter so the strictest applies; login has dual per-IP + per-email hashed keys, cleared on success
- **Protected against:** Brute force, scraping, spam (when proxies are correctly trusted).

### [PROT-16] Security headers at three layers | ✅ PROPERLY IMPLEMENTED
- **File:** `SecurityHeaders.php:15-44` (CSP `default-src 'self'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS prod-only, `X-Powered-By`/`Server` removed) + edge nginx (`server_tokens off`, `X-XSS-Protection: 0`, `X-Permitted-Cross-Domain-Policies: none`) + Next.js headers (`frame-ancestors 'none'`, `base-uri 'self'`, `connect-src` allowlist, `poweredByHeader:false`)
- **Protected against:** Clickjacking, MIME sniffing, referrer leakage, server fingerprinting.
- **Why it works:** Layered defense; HSTS deliberately prod-only (no HTTP downgrade risk); CSP not duplicated at edge (avoids AND-stacking with upstream).

### [PROT-17] CORS restricted to a single configured origin with credentials | ✅ PROPERLY IMPLEMENTED
- **File:** `config/cors.php:15-29` — `allowed_origins => [env('FRONTEND_URL')]`, `supports_credentials => true`, no wildcard origins
- **Protected against:** Cross-origin credential-bearing reads/writes from arbitrary origins.

### [PROT-18] User-lifecycle guards | ✅ PROPERLY IMPLEMENTED (caveat: VULN-01/16)
- **File:** `UserController.php:59-62` (store super-admin guard), `:97-99` (super-admin targets protected), `:109-111` (self demote/disable stripped), `:183-190` (self/super-admin delete blocked), `:141-160` (product-sync grant-subset check)
- **Protected against:** Self-lockout, last-super-admin deletion, direct super-admin creation by non-super-admins (store path), out-of-scope product grants.

### [PROT-19] Audit trail on every sensitive mutation; app-layer immutability | ✅ PROPERLY IMPLEMENTED (caveat: VULN-08/40)
- **File:** `AuditService.php` wired into all sensitive mutations (user create/update/delete/scope-sync, roles, status changes, subscriptions, media, CMS mutations); `AuditLog.php:54-85` (updating/deleting throw, save-exists blocks, delete/forceDelete throw); append-only schema (`created_at` only, `nullOnDelete` FKs)
- **Protected against:** Silent tampering via Eloquent; forensic loss on record changes.
- **Why it works:** Triple defense at the model layer; JSONB columns prevent newline log injection; no API path writes to audit_logs.

### [PROT-20] Secrets never committed; compose fails fast on blank secrets | ✅ PROPERLY IMPLEMENTED
- **File:** `docker-compose.yml:50,60,63,101,117,257` (`${VAR:?}` on APP_KEY/DB_PASSWORD/REDIS_PASSWORD/GRAFANA_PASSWORD) · git history clean of `.env` (verified `git log --all -- ys-api/.env` empty) · `.dockerignore` excludes env files
- **Protected against:** Deploy with blank credentials; secret leakage via git/image.
- **Why it works:** Compose refuses to start without required secrets; no secret ever entered history; `.env.local` untracked (note: local `.env` contains a real APP_KEY + weak DB password — rotate before sharing/staging).

### [PROT-21] Redis requirepass enforced server-side | ✅ PROPERLY IMPLEMENTED
- **File:** `docker-compose.yml:117` — `--requirepass "${REDIS_PASSWORD:?}"`, authenticated healthcheck with correct escaping; loopback-only bind
- **Protected against:** Unauthenticated Redis access/abuse from the network.

### [PROT-22] Container hardening | ✅ PROPERLY IMPLEMENTED
- **File:** `ys-api/Dockerfile:24,40,47`, `ys-web/Dockerfile:27-28,38`, `docker/nginx/nginx.conf:1` — non-root users (appuser/nextjs/nginx 1001) everywhere; php-fpm pool pinned to appuser; loopback binds for DB/Redis/frontend/backend; stateful services published only to 127.0.0.1
- **Protected against:** Container escape → root pivot; external DB/Redis access.

### [PROT-23] Pagination caps and no user-controlled sorting | ✅ PROPERLY IMPLEMENTED
- **File:** `Controller.php:20-23` (`min(max(per_page,1),100)` on every paginated list) · grep: all `orderBy*` use hardcoded columns (61 hits, none from request input)
- **Protected against:** `per_page=1000000` materialization; sort-based info disclosure (e.g., sorting by internal columns).

### [PROT-24] Queue integrity | ✅ PROPERLY IMPLEMENTED (caveat: VULN-03)
- **File:** `afterCommit()` dispatch, `ShouldBeUnique` idempotency, `tries=3` with DB-driver release() (no infinite retry loop)
- **Protected against:** Duplicate notification emails on retry; zombie retry loops.

### [PROT-25] Financial/money discipline | ✅ PROPERLY IMPLEMENTED
- **File:** `Subscription.php:63-89` (integer-cents `monthlyEquivalent`), `Project.php:95` (`decimal:2`), resources emit strings; subscription deletion blocked (`SubscriptionController.php:98-107`); customer deletion blocked while subscriptions/projects exist (`CustomerController.php:161-167`); published items protected from deletion
- **Protected against:** Float-rounding ledger corruption; destructive deletion of billed/committed records.

### [PROT-26] Frontend rendering discipline | ✅ PROPERLY IMPLEMENTED
- **File:** `ys-web/lib/utils/sanitizeHtml.ts` (DOMPurify allowlist) applied at the only 2 raw-HTML render points (`docs/[slug]/page.tsx:125`, `products/[slug]/page.tsx:252`); `images.remotePatterns` allowlisted to the API origin `/storage/**` only; no `localStorage`/`sessionStorage` tokens; `credentials:'include'` on every fetch; no `eval`/`Function`/`innerHTML`/`postMessage` sinks; closed-set icons/colors/palettes; locale-prefixed menu URLs (external links become internal 404s)
- **Protected against:** DOM-XSS, token theft from storage, next/image SSRF, arbitrary-style injection.
- **Why it works:** Defense-in-depth — the SPA re-sanitizes at render even where the backend now sanitizes at write (caveat: VULN-04 fields render unsanitized).

### [PROT-27] CI gates actually gate | ✅ PROPERLY IMPLEMENTED (caveat: VULN-21)
- **File:** `.github/workflows/ci.yml:55,78,129,149` — pint `--test`, `tsc --noEmit`, real migrations + full `php artisan test` on ephemeral Postgres, `npm run build`, Trivy fs scan (HIGH/CRITICAL → SARIF); release.yml runs `migrate --force` before switching traffic
- **Protected against:** Style/type regressions, broken migrations, unbuilt frontend in releases.

### [PROT-28] Dependency posture after remediation | ✅ PROPERLY IMPLEMENTED
- **File:** `composer audit` 0 advisories (guzzle 7.15.2, commonmark 2.10.0); `npm audit` 0 vulnerabilities (next 16.3.1, sharp 0.35.3, dompurify 3.4.13, isomorphic-dompurify 3.22.0, nanoid 3.3.18 via `overrides`); all packages version-pinned (no `*`); no tarball/git deps; no `.npmrc` (registry default)

---

## SECTION 4: SECURITY GAPS & MISSING CONTROLS

### [GAP-01] No CAPTCHA/2FA on admin login | Severity: HIGH — ✅ REMEDIATED (FIX-16)
- **What Is Missing:** Proof-of-work/CAPTCHA after N failed attempts; TOTP/WebAuthn for admin accounts.
- **Why It Matters:** VULN-07/15 make login the primary attack surface; credential-stuffing against the admin panel is unmitigated beyond rate limits.
- **Recommended Implementation:** Turnstile on the login form after 3 failures; optional TOTP for admin roles.
- **Priority:** Before launch | **Effort:** Medium
- **✅ REMEDIATED (FIX-16):** Cloudflare Turnstile gates the admin login endpoint (CAPTCHA portion; TOTP/WebAuthn remains out of scope). `TURNSTILE_ENABLED` (dev default `false` — flow byte-for-byte unchanged when off), `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, plus `NEXT_PUBLIC_TURNSTILE_SITE_KEY` for the frontend bundle. Backend: `TurnstileService` (app/Domains/Auth/Services) verifies the widget token against `challenges.cloudflare.com/turnstile/v0/siteverify` (secret + response + remoteip) INSIDE `LoginAction::execute` BEFORE any user lookup, bcrypt work, or rate-limit budget burn; failure throws `ValidationException` → **422 VALIDATION_ERROR** with a `turnstile` error. Fail-closed: enabled-without-secret rejects every login. Rate limiting: when enabled, the edge `auth` limiter relaxes to **10/min per IP** (`RATE_LIMIT_AUTH_ATTEMPTS_CAPTCHA`) vs 5/min unverified — the CAPTCHA itself filters bots, so verified humans behind shared NAT egress get headroom. Public endpoints untouched (contact form keeps honeypot + its own limits). Frontend: `components/TurnstileWidget.tsx` renders the invisible-mode widget (explicit render, token polling via `getResponse` at submit, expiry reset, script loaded lazily; renders nothing when no site key) wired into `app/admin/login/page.tsx` — token sent as `turnstile_token`, missing token blocks submit with a friendly error. Tests: `tests/Feature/Auth/TurnstileLoginTest.php` (5 tests / 21 assertions) — missing token → 422, invalid token → 422 (with siteverify payload assertions incl. `remoteip`), valid token → 200 + auth cookie, disabled → 200 with `Http::assertNothingSent()`, and 5 rejected CAPTCHA attempts burn no rate-limit budget (verified login still succeeds immediately). Suite 382/1543 green; pint clean; composer audit 0; frontend tsc/lint/build clean.

### [GAP-02] No password-reset/change flow at all | Severity: HIGH
- **What Is Missing:** VULN-13/23 — zero rotation capability in-band.
- **Why It Matters:** A leaked credential cannot be remediated; compliance (NIST SP 800-63B) requires rotation.
- **Recommended Implementation:** Broker-based reset with hashed tokens + `change-password` endpoint revoking tokens.
- **Priority:** Before launch | **Effort:** Medium

### [GAP-03] No automated security scanning in CI for application code | Severity: MEDIUM
- **What Is Missing:** No ZAP/Semgrep/CodeQL step on PRs (only Trivy fs on deploy); no header-check in CI.
- **Why It Matters:** Regressions like VULN-06/VULN-04 style gaps recur silently.
- **Recommended Implementation:** Semgrep/CodeQL ruleset for Laravel (missing authz, `orWhere` scope breaks, missing sanitizer calls); ZAP baseline against a staging env nightly.
- **Priority:** Post-launch (30 days) | **Effort:** Medium

### [GAP-04] No Web Application Firewall / DDoS protection | Severity: MEDIUM — ✅ REMEDIATED (FIX-17)
- **What Is Missing:** No WAF (ModSecurity/Cloudflare) — request-flood protection at L7.
- **Why It Matters:** VULN-07 + unthrottled admin routes give attackers cheap amplification.
- **Recommended Implementation:** Cloudflare/WAF in front of the edge nginx; nginx `limit_req` per IP at the edge as a first layer.
- **Priority:** Before launch | **Effort:** Small (config) / Medium (managed)
- **✅ REMEDIATED (FIX-17):** Edge `limit_req` zones in `docker/nginx/nginx.conf` (http context — zones cannot live in the vhost) keyed by the real client IP (safe because the edge rewrites X-Forwarded-For itself, FIX-07): `public` 120r/m burst 20, `auth` 10r/m burst 5, `contact` 3r/m burst 2, all `nodelay`, applied in `docker/nginx/sites/default.conf` via regex locations (`^/api/v1/auth/`, `^/api/v1/public/contact$` — evaluated before `^/api/v1/public/` — and `^/api/v1/public/`); admin + health fall through to the unthrottled `/api/` prefix (admin is throttled per-user at the app layer, VULN-27; probes stay exempt). Connection-level cap added: `limit_conn` 20 concurrent conns/IP. Both throttled responses return 429. **NOTE:** nginx cannot express r/h (`rate` supports only r/s and r/m), so the contact zone runs at 3r/m as a coarse flood gate — the true 3/h per IP + 2/h per email budgets stay app-enforced (`throttle:contact`). The app's own limits are untouched, so local dev without nginx behaves identically. Managed WAF (Cloudflare/AWS WAF) for production documented in `docs/deployment-checklist-phase1.md` §4 with the runtime verification steps (nginx -t, `ab -n 100 -c 10` login flood → 429 after ~6 pass, zone independence, contact gate, connection cap) and the `TRUSTED_PROXIES` note for running behind a provider's proxy.

### [GAP-05] No data encryption at rest (DB/queue/backups) | Severity: MEDIUM
- **What Is Missing:** PII columns, queue payloads, backups unencrypted (VULN-03/20).
- **Why It Matters:** GDPR Art. 32; backup theft = full dataset disclosure.
- **Recommended Implementation:** Encrypted backups (age/gpg), `pgcrypto` for sensitive columns (e.g., contact-request phone), encrypted queue payloads where feasible.
- **Priority:** Before launch (backups) / Post-launch (column-level) | **Effort:** Medium

### [GAP-06] No intrusion detection / alerting on auth anomalies | Severity: MEDIUM
- **What Is Missing:** No alert on threshold crossings (N failed logins for one email, new-IP logins, audit deletions), no monitoring rules shipped for auth.
- **Why It Matters:** VULN-01 chains and brute-force campaigns go unnoticed.
- **Recommended Implementation:** Alert rules on `auth.login_failed` velocity + any `audit_logs` row count change; error-tracker on 4xx/5xx spikes.
- **Priority:** Post-launch (30 days) | **Effort:** Small

### [GAP-07] No incident-response plan / data-retention policy for PII | Severity: MEDIUM
- **What Is Missing:** No documented IR runbook; no retention schedule for contact-request PII, audit logs, backups (contact_requests are hard-deletable — good — but no scheduled purging).
- **Why It Matters:** GDPR Art. 5(1)(e) storage limitation.
- **Recommended Implementation:** Document retention periods + scheduled purge jobs + IR runbook.
- **Priority:** Post-launch (30 days) | **Effort:** Small

### [GAP-08] No rate limiting on admin API | Severity: MEDIUM
- **What Is Missing:** VULN-27 — `throttle:admin` per user.
- **Priority:** Before launch | **Effort:** Small

### [GAP-09] No TLS enforcement gate in CI/deploy | Severity: MEDIUM
- **What Is Missing:** VULN-09 — nothing refuses to boot/verify TLS in production.
- **Priority:** Before launch | **Effort:** Small

### [GAP-10] No session timeout controls | Severity: MEDIUM
- **What Is Missing:** VULN-14 idle timeout, token rotation.
- **Priority:** Post-launch (30 days) | **Effort:** Small

### [GAP-11] No virus scanning on uploads | Severity: LOW (nice to have)
- **What Is Missing:** ClamAV integration for uploads.
- **Why It Matters:** Malware distribution via media library (bounded by extension whitelist, but documents could carry payloads in the future).
- **Priority:** Nice to have | **Effort:** Medium

### [GAP-12] No security.txt / disclosure policy / dependency-renovation automation | Severity: LOW
- **What Is Missing:** Dependabot/Renovate for composer/npm/images; `security.txt`.
- **Priority:** Nice to have | **Effort:** Small

---

## SECTION 5: DEPENDENCY AUDIT RESULTS

**Backend (`composer audit` — run 2026-08-16):**

| Package | Installed | Advisory | Severity | Status |
|---|---|---|---|---|
| guzzlehttp/guzzle | 7.15.2 | SSRF via psr7 URI (fixed <7.15.2) | High (historical) | ✅ Fixed by update |
| league/commonmark | 2.10.0 | outdated | — | ✅ Updated |
| (all others) | — | — | — | ✅ 0 advisories |

**Frontend (`npm audit` — run 2026-08-16):**

| Package | Installed | Advisory | Severity | Status |
|---|---|---|---|---|
| dompurify | 3.4.13 | GHSA-55q2-fjhq-7xh7 (IN_PLACE hook XSS, ≤3.4.12) | Moderate | ✅ Fixed (was 3.4.12) |
| nanoid | 3.3.18 (override) | GHSA-2v37-7h3g-55p8 (generator loop, <3.3.18) | High | ✅ Fixed (was 3.3.16) |
| next | 16.3.1 | via bundled postcss ≤8.5.22 + sharp <0.35.0 | High | ✅ Fixed (was 16.2.12) |
| postcss (nested) | 8.5.23 | GHSA-qx2v…/GHSA-6g55…/GHSA-fxqj…/GHSA-r28c… (XSS + sourceMap disclosure ≤8.5.22) | High | ✅ Fixed by next 16.3.1 |
| sharp | 0.35.3 | GHSA-f88m-g3jw-g9cj (libvips CVEs, <0.35.0) | High | ✅ Fixed (was 0.33.x) |
| brace-expansion / js-yaml (dev) | fixed | dev toolchain | High | ✅ Fixed via `npm audit fix` |

**Supply-chain risks:** No typosquat risks (all deps from registry.npmjs.org, no tarball/git refs). Composer packages standard (laravel 12, sanctum 4, mews/purifier 3.4, predis 2.3). Image tags float (VULN-37). `trivy-action@master` unpinned (VULN-21). No abandoned packages identified. Add Dependabot (GAP-12).

---

## SECTION 6: INFRASTRUCTURE SECURITY REVIEW

**Docker:**

| Check | Status | Notes |
|---|---|---|
| Container runs as non-root | ✅ | appuser/nextjs/nginx (1001); php-fpm pinned |
| Secrets not baked into image | ✅ | env-only with `:?` fail-fast; `.dockerignore` excludes env files |
| Base images pinned/updated | ❌ | `nginx:alpine`, `redis:7-alpine`, `postgres:16-alpine` float (VULN-37) |
| Resource limits (memory/CPU) | ❌ | No `deploy.resources.limits` anywhere (runaway-container DoS) |
| External exposure | ✅ | Only edge nginx :80 published; DB/Redis loopback-only |

**Database:**

| Check | Status | Notes |
|---|---|---|
| External access blocked | ✅ | 127.0.0.1 bind |
| SSL enforced | ❌ | No `sslmode` config → `prefer` (VULN-33) |
| Strong password | ⚠️ | `:?` enforced in compose; local `.env` has weak `DB_PASSWORD=229206` (rotate) |
| App user least-privilege | ❌ | App connects as `postgres` superuser → RLS on audit_logs bypassable (VULN-08) |
| Backups encrypted | ❌ | Compressed only, no off-host copy (VULN-20) |

**Redis:**

| Check | Status | Notes |
|---|---|---|
| Password protected | ✅ | `--requirepass ${REDIS_PASSWORD:?}` + authenticated healthcheck |
| External access blocked | ✅ | Loopback-only |
| TLS | ❌ | No `tls-port` (intra-network, acceptable) |

**Nginx:**

| Check | Status | Notes |
|---|---|---|
| server_tokens off | ✅ | `server_tokens off;` both configs |
| Security headers | ✅ | nosniff, X-Frame-Options, X-XSS-Protection 0, Referrer-Policy, X-Permitted-Cross-Domain-Policies; CSP/HSTS delegated to upstream |
| Rate limiting | ❌ | No `limit_req` at edge (GAP-04) |
| TLS | ❌ | Port 80 only (VULN-09) |
| Body size / timeouts | ✅/⚠️ | `client_max_body_size 100M` (vs 10 MB upload cap — OK); request timeouts not reviewed in depth |

**CI/CD:**

| Check | Status | Notes |
|---|---|---|
| Secrets in GitHub Secrets | ✅ | `DEPLOY_SSH_KEY`, `DEPLOY_HOST` via secrets |
| Deploy SSH hardening | ❌ | `StrictHostKeyChecking=no`, key on disk (VULN-21) |
| Action pinning | ❌ | `trivy-action@master` (VULN-21) |
| Test credentials rotated | ✅ | Throwaway secrets on ephemeral services |
| .env.example current, no real secrets | ✅ | All blank; `REDIS_PASSWORD` blank with comment |

**SSL/TLS:** No TLS in-stack; external gateway assumed but unenforced (VULN-09). HSTS only emitted by backend in prod; ignored over HTTP.

---

## SECTION 7: COMPLIANCE MAPPING

**GDPR:**
- **Art. 5(1)(f) / 32 (security of processing)** → VULN-01, VULN-02, VULN-03, VULN-04, VULN-05, VULN-07, VULN-08, VULN-09, VULN-20, VULN-22, VULN-40
- **Art. 25 (data protection by design)** → VULN-18, VULN-02, VULN-24, GAP-07
- **Art. 5(1)(e) (storage limitation)** → GAP-07 (no retention schedule)
- **Art. 33/34 (breach notification readiness)** → GAP-07 (no IR runbook)

**OWASP Top 10 2021:**
- **A01 Broken Access Control** → VULN-01, VULN-02, VULN-06, VULN-10, VULN-16, VULN-18, VULN-41
- **A02 Cryptographic Failures** → VULN-03, VULN-09, VULN-20, VULN-23
- **A03 Injection** → VULN-04, VULN-05, VULN-25
- **A04 Insecure Design** → VULN-07, VULN-15, VULN-17, VULN-19, VULN-24, VULN-27
- **A05 Security Misconfiguration** → VULN-08, VULN-09, VULN-26, VULN-29, VULN-33, VULN-35, VULN-36
- **A06 Vulnerable & Outdated Components** → VULN-21, VULN-37 (dependencies now clean: Section 5)
- **A07 Identification & Authentication Failures** → VULN-11, VULN-12, VULN-13, VULN-14, GAP-01, GAP-02
- **A08 Software & Data Integrity Failures** → VULN-21, VULN-37
- **A09 Security Logging & Monitoring Failures** → VULN-22, GAP-06, VULN-40
- **A10 SSRF** → no SSRF surface found (PROT-11) — N/A

---

## SECTION 8: REMEDIATION ROADMAP

**Phase 1 — Before Production Launch (Critical + High):**

| # | Vulnerability | Effort | Owner |
|---|---|---|---|
| 1 | VULN-01 super_admin escalation via update() | Small (guard + PHPUnit) | Backend |
| 2 | VULN-02 product-scoping for customers/projects/tasks/milestones/contact-requests | Large (migration + controllers + tests) | Backend |
| 3 | VULN-04 stored-XSS: sanitize all rich-text write paths + URL scheme rules | Medium | Backend |
| 4 | VULN-05 SVG sanitizer QName/DOCTYPE bypass | Small | Backend |
| 5 | VULN-06 ungrouped orWhere scope bypass | Small | Backend |
| 6 | VULN-03 plaintext password in queue jobs | Medium (reset flow first, then switch) | Backend |
| 7 | VULN-07 trusted proxies + nginx XFF hardening | Small | Infra |
| 8 | VULN-08 non-superuser DB role | Medium | Infra |
| 9 | VULN-09 TLS gate / in-stack TLS | Medium | Infra |
| 10 | VULN-10 permission wiring (timeline/feature-flags/financials) | Small | Backend |

**Phase 2 — First 30 Days (Medium):**

| # | Vulnerability | Effort | Owner |
|---|---|---|---|
| 11 | VULN-11 timing oracle; VULN-12 account-state enumeration | Small | Backend |
| 12 | VULN-13 password change + reset flow (unblocks VULN-03) | Medium | Backend |
| 13 | VULN-14 idle timeout; VULN-43 token pruning + race | Small | Backend |
| 14 | VULN-15 escalating rate limits + alerting | Medium | Backend |
| 15 | VULN-16 permission-subset role assignment | Small | Backend |
| 16 | VULN-17 GET side-effect; VULN-18 handler assignment | Small/Medium | Backend |
| 17 | VULN-19 search LIMIT pushdown | Small | Backend |
| 18 | VULN-20 encrypted backups + off-host | Medium | Infra |
| 19 | VULN-21 CI pinning + SSH hardening | Small | Infra |
| 20 | VULN-22 logging config | Small | Infra |
| 21 | VULN-24 subscription plan linkage/constraints | Medium | Backend |
| 22 | VULN-25 settings validation; VULN-27 admin throttle | Small | Backend |
| 23 | VULN-26 error masking + 404 renderer | Small | Backend |
| 24 | GAP-01 CAPTCHA/2FA; GAP-04 WAF | Medium | Infra/Backend |

**Phase 3 — Ongoing (Low + Info):**

| # | Vulnerability | Effort | Owner |
|---|---|---|---|
| 25 | VULN-28..VULN-42 (all Low findings) | Small each | Backend/Infra/FE |
| 26 | GAP-03 CI security scans; GAP-06 alerting; GAP-07 retention/IR | Medium | All |
| 27 | GAP-11 ClamAV; GAP-12 security.txt + Dependabot | Medium | Infra |

---

## SECTION 9: VERIFICATION CHECKLIST

- [ ] **VULN-01 fixed** — `PUT /admin/users/{id}` with super_admin role UUID as non-super-admin → 403; PHPUnit regression in `UserControllerTest`
- [ ] **VULN-02 fixed** — scoped admin sees only in-scope customers/projects/tasks/milestones/contact-requests; `DELETE` on out-of-scope → 403
- [ ] **VULN-04 fixed** — `POST` `<script>`/`<svg onload>`/`<a href=javascript:>` to every rich-text endpoint → sanitized; menu `url` rejects `javascript:`/`data:`
- [ ] **VULN-05 fixed** — upload `svg:script`, `xlink:onload`, `<!DOCTYPE…ENTITY…>`, `java\tscript:` → stripped/rejected; `MediaUploadSvgSanitizationTest` extended
- [ ] **VULN-06 fixed** — scoped search by out-of-scope slug → 0 rows; `ProductScopedContentTest` extended
- [ ] **VULN-03 fixed** — `jobs`/`failed_jobs` rows contain no password; reset link used instead
- [ ] **VULN-07 verified** — two machines: 5 failures on A, 6th from B is NOT blocked; `request()->ip()` differs per client
- [ ] **VULN-08 verified** — `\du` shows app role WITHOUT superuser; `SET ROLE ys_app; DELETE FROM audit_logs` → RLS error
- [ ] **VULN-09 verified** — prod login over HTTP refuses cookie; `curl -sI https://… | grep -i strict-transport`
- [ ] **VULN-10 fixed** — `manage_timeline`-only role gains timeline access; `manage_settings`-only loses it; financials gated
- [ ] **VULN-11/12 fixed** — timing delta gone; disabled account returns identical 401 body
- [x] **VULN-13 fixed** — change/forgot/reset endpoints live; password change+reset revoke all tokens; reset tokens hashed + 1h expiry (PHPUnit)
- [x] **VULN-14 fixed** — idle expiry enforced (2h default, env-configurable); idle token deleted + 401 SESSION_EXPIRED; last_used_at refreshed per request
- [x] **VULN-15 fixed** — escalating windows (60s/5m/30m per 24h counter); tier crossings audited; success no longer clears the per-email budget
- [ ] **VULN-16 fixed** — assigned role ⊆ actor permissions enforced
- [ ] **VULN-17 fixed** — GET no longer mutates; explicit POST endpoint
- [ ] **VULN-18 fixed** — handler assignment + transition map
- [x] **VULN-19 fixed** — SQL LIMIT (limit+5 margin) pushed into every per-type search query; total from real COUNT; meta json decoded (latent 500 fixed); ranked + limited verified
- [ ] **VULN-20/21/22 fixed** — backups encrypted; CI pinned + StrictHostKeyChecking=yes; LOG_LEVEL=warning + daily
- [ ] **VULN-24/25 fixed** — plan-linked subscriptions; per-key setting validation
- [ ] **VULN-26/29/30 fixed** — generic 404/500 messages; scalar param validation
- [x] **VULN-27 fixed** — admin throttle in place (300/min per authenticated user, keyed by user ID; 301st request → 429; public endpoints unaffected)
- [x] **GAP-01 fixed** — Turnstile gates admin login (invisible widget; siteverify in LoginAction before auth logic; missing/invalid token → 422; verified budget 10/min; disabled by default in dev)
- [x] **GAP-04 fixed** — edge nginx limit_req zones (public 120r/m+20, auth 10r/m+5, contact 3r/m+2, nodelay, 429) + limit_conn 20/IP; managed WAF documented in deployment checklist §4
- [x] **VULN-34 fixed** — nonce-based strict CSP: `script-src 'self' 'nonce-…' 'strict-dynamic'` (no `'unsafe-inline'`); HSTS prod-only; social URLs allowlisted at render; CSRF demo tokens now CSPRNG (FIX-20)
- [ ] **All PHPUnit tests pass** — current: 265/927 ✅ (extend with regression tests above)
- [ ] **composer audit clean** ✅ (0 advisories)
- [ ] **npm audit clean** ✅ (0 vulnerabilities)
- [ ] **pint --test** ✅ passed
- [ ] **tsc --noEmit / eslint / next build** ✅ passed
- [ ] **Manual penetration test** — replay Section 2 PoCs against staging after fixes
- [ ] **Security headers verified** — securityheaders.com on prod origin
- [ ] **SSL Labs scan** — A+ once TLS is in place (VULN-09)
- [ ] **OWASP ZAP baseline** — nightly against staging (GAP-03)
- [x] **CSP final** — `script-src` without `'unsafe-inline'` (VULN-34)

---

## SECTION 10: APPENDIX — CODE EVIDENCE

### A. VULN-01 — the missing guard (contrast with the safe `store()` path)

```php
// app/Http/Controllers/Admin/UserController.php:47-62  (SAFE — store)
$role = Role::findOrFail($validated['role_id']);
if ($role->slug === 'super_admin' && Auth::user()->role->slug !== 'super_admin') {
    abort(403, 'Only a super admin can create another super admin.');
}

// app/Http/Controllers/Admin/UserController.php:92-114  (VULNERABLE — update)
public function update(Request $request, User $user): JsonResponse
{
    $this->authorize('manage_users');
    if ($user->role->slug === 'super_admin' && Auth::user()->role->slug !== 'super_admin') {
        abort(403, 'Cannot modify a super admin account.');
    }
    $validated = $request->validate([
        'name'     => ['sometimes', 'string', 'max:100'],
        'email'    => ['sometimes', 'email:rfc', Rule::unique('users')->ignore($user->id)],
        'role_id'  => ['sometimes', 'uuid', 'exists:roles,id'],   // ← never checked
        'is_active'=> ['sometimes', 'boolean'],
    ]);
    ...
    $user->update($validated);
}
```

### B. VULN-05 — sanitizer bypass mechanics

```php
// app/Domains/System/Services/MediaUploadService.php:180-201
foreach ($dom->getElementsByTagName('*') as $element) {
    if (in_array(strtolower($element->nodeName), self::UNSAFE_SVG_ELEMENTS, true)) {  // "svg:script" ≠ "script"
        $toRemove[] = $element; continue;
    }
    foreach ($element->attributes as $attribute) {
        $name = strtolower($attribute->nodeName);            // "xlink:onload" fails starts_with('on')
        $value = strtolower(trim($attribute->nodeValue));    // "java\t<script>" survives trim()
        if (str_starts_with($name, 'on')
            || in_array($name, ['href', 'xlink:href', 'src', 'style'], true)
            || str_starts_with($value, 'javascript:')) { $unsafeAttributes[] = $attribute->nodeName; }
    }
}
// DOCTYPE never removed; saveXML() re-emits it with any <!ENTITY> declarations
```

### C. VULN-06 — ungrouped OR

```php
// app/Http/Controllers/Admin/ProductController.php:41-47
->when(! Auth::user()->isSuperAdmin(), fn ($q) => $q->whereIn('id', Auth::user()->products()->pluck('products.id')))
->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
->when($request->query('search'), fn ($q, $search) => $q->where('name_en', 'ilike', "%{$search}%")
    ->orWhere('name_ar', 'ilike', "%{$search}%")
    ->orWhere('slug', 'ilike', "%{$search}%"))
// → WHERE (id IN (mine) AND status=? AND name_en ILIKE ?) OR name_ar ILIKE ? OR slug ILIKE ?
```

### D. VULN-33 refutation evidence (why auth still works without config/auth.php)

```php
// vendor/laravel/sanctum/src/SanctumServiceProvider.php:23-28
config([
    'auth.guards.sanctum' => array_merge([
        'driver' => 'sanctum',
        'provider' => null,
    ], config('auth.guards.sanctum', [])),
]);
// vendor/laravel/sanctum/src/Guard.php:145-149 — null provider ⇒ model check passes
protected function hasValidProvider($tokenable)
{
    if (is_null($this->provider)) { return true; }
    ...
}
```
Per-token `expires_at` is still enforced (`Guard.php:129`), so token auth works end-to-end with the framework-default config merge.