# Login Flow - Deep Dive

**Source of truth:** `ys-api/app/Domains/Auth/Actions/LoginAction.php` (code-verified), `AuthController::login` (dispatch path). **Date:** 2026-08-07

> + = verified from source | ~ = inferred | ? = unknown

## Sequence

1. **Validation** - controller validates email/password before calling `LoginAction` (field rules in controller). `LoginDTO` carries `email`, `password`, `ipAddress`, `remember`. +
2. **Rate limit check** before any DB work:
   - Key: `login:{ip}` (per-IP). +
   - Max attempts: `config('security.rate_limits.auth_attempts')` (default **5**). +
   - On exceed: throws `InvalidCredentialsException("Too many login attempts...", 429)` - message leaks only the seconds remaining. +
3. **Find user** - `User::with('role')->where('email', ...)->first()`. Role is eager-loaded so authorization gates reuse it without an extra query. +
4. **Credential check** - `Hash::check($dto->password, $user->password)` (Argon2id). On failure:
   - `RateLimiter::hit()` - increments the per-IP counter.
   - Audit event `auth.login_failed` with context `{email, ip}` (no password).
   - Throws `InvalidCredentialsException`. +
5. **Active check** - `$user->isActive()`; inactive accounts throw `AccountDisabledException`. +
6. **On success**:
   - `RateLimiter::clear(...)` resets the per-IP counter.
   - Persists `last_login_at` / `last_login_ip`.
   - **Single-session policy:** `$user->tokens()->delete()` revokes every previously issued token.
   - Creates Sanctum PAT: name `admin-session`, abilities `['admin']`, `expiresAt` = 30 days when `remember`, else 8 hours.
   - Audit `auth:login` with resourceId + userId.
   - Returns `{user, token, expires_at}`; the controller sets the HttpOnly cookie `ys_admin_token`. (cookie details: [authentication.md](authentication.md)) +

## Security properties

- **Brute force:** per-IP throttling applies on failed attempts; counter clears on success. +
- **Single-session:** each new login revokes all previous tokens - only one admin device can hold a valid session under this scheme. +
- **TTL note:** Sanctum `expiration` is `null` (see [security.md](security.md) S-08); token lifetime is bounded by the per-token `expires_at` only. + Sprint 1: `EnsureUserIsActive` now enforces `expires_at` per-request (401 TOKEN_EXPIRED).
- **Audit trail** exists for both success (`auth:login`) and failure (`auth:login_failed`), with IP. +

## Cookie transport

- Cookie `admin_token` set by `AuthController` after the action returns. +
- `SameSite=strict` - CSRF-resistant for same-origin SPA. +
- Laravel cookie encryption applies (`encrypt()` middleware sets `Set-Cookie`). =

## Notes / risks

- Failed logins are audited with request IP only; `user_id` is null because nothing is authenticated. +
- `AuditService`'s `Auth::id()` fallback is only valid in HTTP context; the login action passes ids explicitly (see [audit-service.md](audit-service.md)). +