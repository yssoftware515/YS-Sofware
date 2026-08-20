# Queued Jobs - Deep Dive

**Source of truth:** `ys-api/app/Jobs/SendAdminUserCreatedJob.php`, `ys-api/app/Jobs/SendContactRequestNotificationJob.php` (code-verified). **Date:** 2026-08-07

> + = verified from source | ~ = inferred | ? = unknown

Only **two** jobs exist in the codebase: +

| Job | Purpose | Queue of record |
|---|---|---|
| `SendAdminUserCreatedJob` | Welcome email to a newly created admin user | Redis (`config('queue.default')`) |
| `SendContactRequestNotificationJob` | Notify admin of a new contact form submission | Redis |

## Shared design decisions (documented in code comments)

1. **`ShouldBeUnique`** on both jobs with `uniqueId()` - prevents duplicate emails if a job retries. +
   - Admin welcome: `admin-welcome-{userId}`
   - Contact: `contact-notification-{contactRequestId}`
2. **`afterCommit()` at dispatch site** - job is pushed to the queue only after the enclosing DB transaction commits. This is intentional: the worker must not run before the row exists (see contact-request-flow.md). +
3. **Guard clauses in `handle()`** - if the target model is not found (race condition), the job `release(s)` back onto the queue instead of failing permanently. +
4. **`failed()` hook** logs to the `Log` channel (no email alert, no dead-letter queue). +
5. Retry shape: `$tries = 3`, `$timeout = 30` seconds. Back-off: 30s for admin welcome, 60s for contact. +

## SendAdminUserCreatedJob

- Created by `AdminUserController::store` (admin creates a user). Dispatched with:
  `dispatch(new SendAdminUserCreatedJob($userId, $plaintextPassword))->afterCommit()` (see note in job docblock). +
- `handle()` loads `User::with('role')`; if missing, `release(5)` and return. Otherwise `Mail::send('emails.admin-welcome', [...])` with `password` = the **plaintext** temporary password passed at dispatch. +
  - {user, password, loginUrl = config('app.url') . '/admin/login'} +
  - Blade template: `ys/views/emails/admin-welcome.blade.php` (verified file exists). +
- The passed password is the raw value from the controller, i.e. the plaintext chosen by the admin. It is **not** the hashed DB value. ~ (payload construction is in controller, verified: see users admin controller)
- Security note: emailing a plaintext provisional password is by design the "welcome" flow (see security.md notes on password policies). To change, generate a reset-token flow instead.

## SendContactRequestNotificationJob

- Dispatched by `SubmitContactRequestAction` after the `ContactRequest` INSERT (transaction). +
- `handle()` guards: `ContactRequest::find(...)`; missing -> `release(5)` with a warning log.
- Sends `Mail::send('emails.contact-notification', ['contact' => $contact], ...)` to `config('mail.admin_address')` (`MAIL_ADMIN_ADDRESS` — REQUIRED; when unset the job logs a warning and skips, no hardcoded fallback). +
  - Subject: `"[{$type}] New contact from {$contact->name}"`. +
  - Blade: `emails/contact-notification.blade.php` (verified existence). +
- Lateness: job marked `ShouldQueue` so it requires a configured queue worker to run. No `dispatchNow`. If the worker is down, the queue accumulates and notification lateness grows. This is fine for a contact form.

## Failure / retry behavior

- Both jobs: `tries=3`, `backoff` (30s / 60s). +
- When `release()` is used, Laravel's queue coordinator re-schedules per backoff. +
- After final attempt fails, `failed()` writes to log only; no mailbox bounce handling, no exponential backoff configured beyond fixed backs. +
- No dead-letter (Redis stream) workflow present. Task of an ops decision, not a bug. =

## Count inconsistencies (docs vs code)

- 3 "phases" texts in older docs refer to "5 jobs with a watchdog" - inaccurate. Today: exactly 2 jobs. +