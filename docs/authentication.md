# Authentication

**Verification:** ✅ code-verified · ⚠️ inferred · ❓ unknown

---

## 1. Mechanism (✅ verified)

**Laravel Sanctum personal-access tokens** — NOT JWT (the old docs claimed "JWT-based authentication via Laravel Sanctum" — incorrect; Sanctum uses opaque hashed tokens stored in `personal_access_tokens`).

### Flow

```
POST /api/v1/auth/login {email, password, remember?}
  → LoginAction (rate-limited: 5/min/IP)
  → validates credentials + is_active
  → issues Sanctum token (ability: ['admin']) — name `admin-session`
  → returns {user, token, expires_at}
  → sets HttpOnly cookie "ys_admin_token" (SameSite=strict, Secure in production)
  → audit log entry (auth.login)
```

Subsequent requests: the browser sends the cookie; `CookieToBearer` middleware copies it into `Authorization: Bearer <token>`. Standard `Authorization: Bearer` headers also work (e.g., API tools).

### Token lifecycle (✅ verified from code)

| Setting | Value | Source |
|---|---|---|
| Default TTL | 8 hours | `config/security.php` `admin_token_ttl_hours` |
| Remember TTL | 30 days | `config/security.php` `admin_token_remember_days` |
| Sanctum `expiration` | `null` (no auto-expiry by Sanctum) | `config/sanctum.php` — TTL is enforced at issuance (expires_at value + cookie lifetime) |
| Token prefix | `ys_admin_` | `config/sanctum.php` |

⚠️ **Note:** because Sanctum `expiration` is `null`, an existing token does **not** expire server-side. The 8h/30d expiry is expressed in the issued token's `expires_at` field and the cookie lifetime; the API does not actively enforce `expires_at` per request. Tokens can also be revoked via logout (current token) or by disabling the user (`EnsureUserIsActive` revokes all tokens).

## 2. Session details (✅ verified)

- Cookie: `ys_admin_token` — `HttpOnly`, `SameSite=strict`, `Secure` in production, `path=/`.
- Single-session mode: **enforced at login** — `LoginAction` runs `$user->tokens()->delete()` (revokes ALL previous tokens) before issuing the new one (`LoginAction.php:56`). A separate login invalidates any previous device's token.
- Idle timeout: **none** beyond TTL.
- MFA: **not implemented** (old docs claimed "MFA-ready infrastructure" — ❌ no MFA code found).
- Remember me: increases token TTL to 30 days (`LoginAction`).

## 3. Logout (✅ verified)

- Revokes only the current token; clears the cookie via `Set-Cookie` with negative lifetime.
- Unauthenticated logout → 401.

## 4. Account status (✅ verified)

- `users.is_active` gate: `EnsureUserIsActive` middleware runs on every authenticated route; disabled user → all tokens revoked + 403 `ACCOUNT_DISABLED`.
- `LoginAction` also blocks disabled accounts (403 `ACCOUNT_DISABLED` via `AccountDisabledException`).

## 5. Rate limiting (✅ verified)

| Limiter | Limit | Applied to |
|---|---|---|
| `auth` | 5/min/IP | POST /auth/login (429 + custom JSON) |
| `public` | 120/min/IP | all /public/* GETs |
| `contact` | 3/hour/IP | POST /public/contact |
| `search` | 60/min/IP | GET /public/search |

## 6. Password handling (✅ verified)

- Hashing: bcrypt (Laravel's default driver — the previously documented `PASSWORD_HASH_DRIVER=argon2id` was read by nothing and was removed, Sprint 12 C-7), `hashed` cast.
- Login validation: email (rfc), password `min:8 max:255`.
- User creation (admin): password `min:12` + `confirmed` (`UserController@store`).
- ⚠️ **No password reset flow exists** despite `password_reset_token`/`password_reset_expires_at` columns and hidden fields — no reset endpoint, no reset email, no forgot-password UI. (❓ Old docs' "Session management with configurable timeouts" — partially true.)
- No email verification flow (`email_verified_at` exists but is unused).

## 7. CSRF — stateful Sanctum SPA flow (✅ verified, Phase 5B)

The admin frontend authenticates as a **stateful Sanctum SPA** (not via `Authorization: Bearer` for browser calls):

```
GET /sanctum/csrf-cookie                          → handshake; sets `XSRF-TOKEN` cookie
    ↓
client URL-decodes the cookie value (decodeURIComponent)
    ↓
X-XSRF-TOKEN: <decoded value>   on every state-changing (POST/PUT/PATCH/DELETE) request
    ↓
Laravel's VerifyCsrfToken matches it against the session → 419 on missing/mismatch
```

- Implemented in `ys-web/lib/csrf.ts` (`ensureCsrf`, pre-request token refresh) and the admin request helpers (`lib/admin/api.ts`, `lib/api/client.ts`), which send `credentials: 'include'` and the `X-XSRF-TOKEN` header; the `/auth/me` bootstrap and `AuthProvider` follow the same flow.
- Backend: `Sanctum::statefulApi()` is active (`config/sanctum.php`, `stateful` = localhost domains + FRONTEND_URL host); `GET sanctum/csrf-cookie` is registered (web group). `VerifyCsrfToken` protects the web-group stateful routes; a missing/invalid `X-XSRF-TOKEN` returns **419**.
- `GET /auth/me` is CSRF-exempt (reads the bearer cookie only; 401 when absent/expired).
- `SameSite=strict` (`SESSION_SAME_SITE=lax` for the session cookie, `ys_admin_token` cookie `SameSite=strict`) remains the first line of defense against cross-site requests; the mandatory token header is the second. Pinned by `tests/Feature/Auth/StatefulCsrfFlowTest.php` (4 tests) + live e2e probes.

## 8. Frontend behavior (✅ verified)

- `app/admin/login/page.tsx` — client-side lockout: 5 attempts → 30s.
- `middleware.ts` — redirects to `/admin/login` if cookie `ys_admin_token` missing (presence check only; an expired/invalid cookie still passes the redirect guard, and the API then returns 401).
- `AuthProvider` — calls `/auth/me` on mount; exposes `hasPermission`; `PermissionGate` gates UI elements.
