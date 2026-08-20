# Verification Notes - Session 2026-08-07 (deep-dive)

**Purpose:** record *how* the flow-dive facts were established and one tooling caveat that affects reading this codebase. **Date:** 2026-08-07

> + = verified from source | = inferred | ? = unknown

## How facts were verified

- `app/Notifications/` directory: `dir /a` + `Test-Path` on each supposed class file returned **MISSING**. Earlier greps suggesting notification classes existed were **unreliable output artifacts**, not source-of-truth. Re-verified with the authoritative filesystem (`cmd /c dir`, `Get-Item`).
- Jobs/Actions/Services: read full file bodies and cross-checked **two independent reads** before asserting (the environment intermittently returns garbled duplications of previous responses; the trick was to write file content to a temp file and read it back to separate real file bytes from display artifacts).
- Routes, migrations, models, env: used `php artisan route:list --json` (authoritative) + migrations + composer/package files (matching discovery-summary.md numbers).

## Tooling / shell reliability note

Some tool output in this Windows environment intermittently **repeats lines, shuffles tokens, or hallucinates common file names** (e.g., "AdminUserCreated.php", "SettingChanged.php", relationships/columns that do not exist). Rule applied across this session:

1. For any claim that matters, compare a **second independent read** (different path).
2. Trust `dir /s /b`, `Test-Path`, `Get-Item Length` over grep lists when they conflict.
3. If two "reads" disagree, resolve via filesystem primitives.
4. Store verified snippets in the temp workspace and re-read from there.

## Facts that now have a definitive + mark

- Exactly **2 jobs** exist (`SendAdminUserCreatedJob`, `SendContactRequestNotificationJob`). +
- **2 email Blade templates** exist; mail via `Mail::send`; **no Laravel Notifications classes**. +
- `app/Notifications/` empty; `MediaUploadService`, `AuditService`, `FeatureFlagService`, `HtmlSanitizerService` in System/Services. +
- Observers: `ProductObserver` + `ProductReleaseObserver` registered in `AuthServiceProvider`. +
- Search: `SearchDriver` contract + `PostgresSearchDriver` + `SearchResult(Collection)` DTOs in Search/DTOs. +
- Login: single-session revocation + per-IP throttle + 8h/30d token TTL (see login-flow.md). +

## Open questions preserved (not resolved in-session)
- Semver lexical sort (`orderByDesc('version')`) may misorder `9.x` vs `10.x`.  (release-lifecycle.md)
- `current_version` nullable in migration? (database.md to confirm). =
- Whether storing plaintext temp password in job payload conflicts with any mailbox compliance requirement. =