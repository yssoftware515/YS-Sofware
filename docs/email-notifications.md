# Email & Notifications - Verified Architecture

**Source of truth:** verified file tree + code reads. **Date:** 2026-08-07

> + = verified from source | = inferred | ? = unknown

## Headline correction

**There are NO Laravel Notification classes.** `app/Notifications/` exists but is **empty** (verified: `dir /a` shows 0 files). The only import of `Illuminate\Notifications` in the codebase is the `Notifiable` trait on the `User` model.

This contradicts earlier documentation/summaries that listed notification classes (`AdminUserCreated`, `ContactRequestReceived`, `SettingChanged`, `Admin\ProductUpdateNotification`). Those summaries were inaccurate or refer to plans never implemented. **All mail is sent via `Mail::send` with Blade templates.**

## The two real email paths (verified)

| Email | Trigger | Template | Recipient | Subject |
|---|---|---|---|---|
| Admin welcome | Admin creates a user (admin panel) | `resources/views/emails/admin-welcome.blade.php` | the created admin | "Your YS Systems Admin Account" |
| Contact notification | Public contact form | `resources/views/emails/contact-notification.blade.php` | `config('mail.admin_address')` | `[{type}] New contact from {name}` |

Both are dispatched through queued jobs (see [queued-jobs.md](queued-jobs.md)) with `afterCommit()` + `ShouldBeUnique` + guard `release()`.

## Blade templates

Exactly two templates exist under `ys-api/resources/views/emails/`: `admin-welcome.blade.php`, `contact-notification.blade.php`. (directory listing verified) +

The mail packages: In `composer.json`, common Laravel mailers (e.g., `symfony/mailer`) are the transport. `MAIL_*` env configures SMTP. Mailhog is wired in docker-compose for dev. (configuration.md)

## Implications

- Search "Notification" in code: only `User` model's `Notifiable`. Any planned notification-center functionality (in-app badges, websockets, notification preferences) is **not implemented server-side** and the frontend has no page for it (consistent with verified broken-integration list).
- The phrase "notifications" in admin UI/docs refers to the contact-request and welcome **emails**, not a notification system.
- To add new transactional emails: follow the job + Blade template pattern, not Laravel Notifications (nothing currently uses `Notification`).