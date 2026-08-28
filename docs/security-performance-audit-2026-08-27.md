# Security & Performance Audit — 2026-08-27

**Audience:** Owner
**Author:** OpenCode (code review — read-only clone, changes applied only for Low-severity same-pattern fixes)
**Date:** 2026-08-27

---

## Scope

System-wide audit for N+1/round-trip-heavy queries, RLS edge cases, cross-origin/session config issues, and standard web security surface. Cross-checked against `docs/known-issues.md` and `docs/technical-debt.md` to avoid duplication.

---

## Findings

### PERF-01 — CustomerController::show() sequential count queries (Low)

**Location:** `ys-api/app/Domains/Billing/Controllers/Admin/CustomerController.php:90-97`

4 separate `->count()` calls against the `projects` relation:
```php
$customer->projects()->where('status', 'active')->count();
$customer->projects()->where('status', 'on_hold')->count();
$customer->projects()->where('status', 'completed')->count();
$customer->projects()->...->whereDate(..., '<', today())->count();
```
Plus 2 `loadCount` calls at line 82. **Total: 6 DB queries** where 2 would suffice.

**Impact:** Minor — show endpoint, not list. But identical to the DashboardService pattern already fixed in commit `04cd98a`.
**Status:** AUTO-FIXED (same pattern as already-approved dashboard optimization)

---

### PERF-02 — MediaController::referenceCounts() sequential count queries (Low)

**Location:** `ys-api/app/Domains/Cms/Controllers/Admin/MediaController.php:129-150`

4 separate `->count()` calls on delete guard:
```php
Product::...->count();
Service::...->count();
StaticPage::...->count();
ProductMedia::...->count();
```

**Impact:** Minor — delete guard, not hot path. But same pattern.
**Status:** AUTO-FIXED (same pattern as already-approved dashboard optimization)

---

### SEC-01 — RLS on audit_logs silently bypassed by table ownership (Medium)

**Location:** `ys-api/database/migrations/2025_01_01_000012_audit_logs_row_level_security.php:16-27`

The migration docblock explicitly warns: "PostgreSQL table owners bypass RLS." Since migrations run as the app user, the app user owns `audit_logs` and RLS is silently nullified. The migration relies on a separate step transferring table ownership to a superuser — this must be verified in production.

**Impact:** Medium — if table ownership transfer was not performed, RLS provides zero protection.
**Status:** REPORT ONLY (requires production verification; do not fix in this pass)

---

### SEC-02 — FailedJob model uses $guarded = [] (Low)

**Location:** `ys-api/app/Domains/System/Models/FailedJob.php:22`

`$guarded = []` allows mass assignment on all fields. However, `FailedJob` is a read-only model with no public write path — the queue system writes to this table directly.

**Impact:** Low — no public write endpoint targets this model. Acceptable.
**Status:** REPORT ONLY (no fix needed; documenting for completeness)

---

### SEC-03 — No explicit MIME whitelist in MediaController::store() (Low)

**Location:** `ys-api/app/Domains/Cms/Controllers/Admin/MediaController.php:65`

File validation is `['required', 'file', 'max:10240']` — no explicit MIME type whitelist at the controller level. File type validation is delegated to `MediaUploadService`.

**Impact:** Low — validation exists in the service layer. Controller-level whitelist would be defense-in-depth.
**Status:** REPORT ONLY (service layer handles it; no vulnerability)

---

### SEC-04 — reset-password has no route-level throttle (Info)

**Location:** `ys-api/routes/api.php:74`

No dedicated throttle on password reset endpoint. The 256-bit reset token is the guard — brute-forcing is infeasible.

**Impact:** Info — by design. Token entropy is the defense.
**Status:** REPORT ONLY (no fix needed)

---

### CFG-01 — All config/env assumptions verified clean (Info)

- `localhost` references are all `env()` defaults, not hardcoded
- `config/session.php` secure flag correctly uses `APP_ENV === 'production'`
- `config/cors.php` single origin from env, no wildcards
- `config/sanctum.php` localhost defaults + dynamic FRONTEND_URL

**Impact:** Info — no issues found.
**Status:** NO ACTION NEEDED

---

### QUERY-01 — Other admin controllers verified clean (Info)

All other admin list/index endpoints use single paginated queries with eager loads:
- `ProjectController::index()` — 1 query
- `ProductController::index()` — 1 query
- `ContactRequestController::index()` — 1 query
- `UserController::index()` — 1 query
- `TaskController::index()` — 1 query
- `AuditLogController::index()` — 1 query
- All CMS controllers — 1 query each

**Impact:** Info — no N+1 issues found beyond PERF-01 and PERF-02.
**Status:** NO ACTION NEEDED

---

## Summary

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| PERF-01 | Low | CustomerController 6 queries → 2 | AUTO-FIXED |
| PERF-02 | Low | MediaController 4 queries → 1 | AUTO-FIXED |
| SEC-01 | Medium | RLS bypassed by table ownership | REPORT ONLY |
| SEC-02 | Low | FailedJob $guarded = [] | REPORT ONLY |
| SEC-03 | Low | No MIME whitelist at controller | REPORT ONLY |
| SEC-04 | Info | reset-password no throttle | REPORT ONLY |
| CFG-01 | Info | Config/env clean | NO ACTION |
| QUERY-01 | Info | Other controllers clean | NO ACTION |

---

## Cross-reference with existing docs

- **D-03 / TD-18:** `lib/platform` dead code — RESOLVED by commit `829d59b` (84 files / 6,050 lines deleted)
- **K-38:** `TRUSTED_PROXIES` / `REQUIRE_TLS` absent from `.env.example` — RESOLVED by commit `78e0012`
- No duplicate findings with `known-issues.md` or `technical-debt.md`
