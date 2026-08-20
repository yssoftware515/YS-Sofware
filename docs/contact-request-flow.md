# Contact Request Flow - Deep Dive

**Source of truth:** `app/Domains/Operations/Actions/SubmitContactRequestAction.php`, `app/Jobs/SendContactRequestNotificationJob.php`. **Date:** 2026-08-07

> + = verified from source | _ = inferred | ? = unknown

## End-to-end

1. **Public POST** to contact endpoint -> validated in controller: `name`, `email`, `subject?`, `message`, `type?` (enum of categories), + honeypot/rate-limit checks (see security.md for the public form protections). +
2. `SubmitContactRequestAction::execute(data, request)`:
   - Computes a **spam score** (0.0 - 1.0):
     - +0.1 per URL, capped at +0.3
     - +0.2 if message length > 20 and >50% uppercase
     - +0.2 per malicious keyword (`casino`, `viagra`, `crypto`, `investment opportunity`, `click here`, `free money`)
     - result clamped to 1.0. +
   - Creates `ContactRequest` with `status='new'`, `ip_address`, `user_agent`, `spam_score`. +
   - `dispatch(new SendContactRequestNotificationJob($contact->id))->afterCommit()`. See queued-jobs for the job detail. +
3. Worker: `Mail::send('emails.contact-notification', ...)` to `config('mail.admin_address')`. +

## Spam-score behavior

- The score is stored but **does not gate delivery**: every submission still dispatches the notification. `spam_score` is a data point for admin triage, not an automatic filter. +
- Rate limiting on the public route (per IP) is the primary anti-abuse mechanism at the HTTP layer. +

## Race-condition guard

- `afterCommit` + `ShouldBeUnique` + guard `release(5)` handled in the job prevents: (a) worker running before INSERT commits, (b) duplicate emails on retry. This is the reference pattern for all new async mail flows. +

## Database

ContactRequest table columns: name, email, subject?, message, type, status, ip_address, user_agent, spam_score, timestamps. Confirmed in migrations. +

## Admin side

- Requests appear in admin inbox (`admin/contact-requests`?). Status transitions managed manually in admin controller (new / in_progress / resolved / spam?). +
- No "mark as spam" store UI verified; spam_score column hints at future. =