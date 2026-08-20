<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Rate Limits
    |--------------------------------------------------------------------------
    */
    'rate_limits' => [
        'public_api' => env('RATE_LIMIT_PUBLIC_API', 120),
        'auth_attempts' => env('RATE_LIMIT_AUTH_ATTEMPTS', 5),
        // Per-IP budget for Turnstile-verified login requests (GAP-01):
        // higher than the unverified budget because the CAPTCHA already
        // filters bot traffic.
        'auth_attempts_captcha' => env('RATE_LIMIT_AUTH_ATTEMPTS_CAPTCHA', 10),
        // Secondary per-account limit: blocks credential stuffing / password
        // spraying against a single account even when it originates from
        // many different IPs. Applies per hashed email, separate window
        // from the per-IP limit above.
        'auth_per_email' => env('RATE_LIMIT_AUTH_PER_EMAIL', 10),
        'contact' => env('RATE_LIMIT_CONTACT', 3),
        // Per-email limit on the public contact form — stops a single
        // address (or an attacker rotating IPs) flooding the inbox.
        'contact_email' => env('RATE_LIMIT_CONTACT_EMAIL', 2),
        'search' => env('RATE_LIMIT_SEARCH', 60),
        // VULN-13: forgot-password spray guard per IP (edge) and the
        // stronger per-email budget enforced inside the action.
        'forgot' => env('RATE_LIMIT_FORGOT', 5),
        'forgot_per_email' => env('RATE_LIMIT_FORGOT_PER_EMAIL', 3),
        // VULN-27: per authenticated admin user (not per IP). 300/min
        // is a generous ceiling for real panel work while capping
        // scripted scraping. Revisit with lower caps on audit-logs /
        // dashboard/stats if telemetry shows abuse.
        'admin_throttle' => env('RATE_LIMIT_ADMIN', 300),
    ],

    /*
    |--------------------------------------------------------------------------
    | Login Lockout Escalation (VULN-15)
    |--------------------------------------------------------------------------
    |
    | The per-email login lockout escalates with the account's failure
    | history over a rolling window: the lockout window after the burst
    | gate trips (auth_per_email) is chosen from the tiers below, based
    | on the 24h failure counter. A single burst gets 60s; a repeat
    | offender within 24h gets 5 minutes, then 30 minutes. The per-IP
    | and per-burst gates themselves are unchanged.
    |
    */
    'auth_lockout' => [
        'escalation_window_hours' => env('AUTH_LOCKOUT_ESCALATION_HOURS', 24),
        'tiers' => [
            ['failures' => 5, 'window_seconds' => 60],
            ['failures' => 10, 'window_seconds' => 300],
            ['failures' => PHP_INT_MAX, 'window_seconds' => 1800],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | CAPTCHA — Cloudflare Turnstile (GAP-01)
    |--------------------------------------------------------------------------
    |
    | Turnstile gates the admin login endpoint. When enabled, LoginAction
    | verifies the widget token against Cloudflare BEFORE any user lookup,
    | bcrypt work, or rate-limit budget burn, and rejects the login with
    | 422 when verification fails. The edge throttle for the login route
    | also relaxes from 5/min to 10/min when enabled, because verified
    | requests carry a much lower brute-force risk (the CAPTCHA itself
    | already filters bot traffic).
    |
    | Fail-closed: if enabled but the secret key is missing, every login
    | is rejected — a broken CAPTCHA integration must never silently
    | disable the control. Set TURNSTILE_ENABLED=false (dev default) to
    | bypass entirely; the login flow is then byte-for-byte unchanged.
    |
    */
    'captcha' => [
        'turnstile' => [
            'enabled' => (bool) filter_var(env('TURNSTILE_ENABLED', false), FILTER_VALIDATE_BOOL),
            'site_key' => env('TURNSTILE_SITE_KEY', ''),
            'secret_key' => env('TURNSTILE_SECRET_KEY', ''),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | File Upload Security
    |--------------------------------------------------------------------------
    */
    'uploads' => [
        'max_file_size' => env('MEDIA_MAX_FILE_SIZE', 10240), // KB

        // Allowed MIME types — never trust client-provided MIME
        'allowed_mime_types' => [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/svg+xml',
            'application/pdf',
        ],

        // Disallowed extensions regardless of MIME
        'blocked_extensions' => [
            'php', 'php3', 'php4', 'php5', 'phtml',
            'exe', 'sh', 'bat', 'cmd', 'com',
            'js', 'ts', 'html', 'htm',
            'py', 'rb', 'pl',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Session Security
    |--------------------------------------------------------------------------
    */
    'session' => [
        'admin_token_ttl_hours' => 8,
        'admin_token_remember_days' => 30,
        // VULN-14: sliding idle timeout (hours). A bearer session whose
        // last authenticated request is older than this is killed (token
        // deleted, 401 SESSION_EXPIRED). The absolute TTL above remains
        // the hard ceiling regardless of activity.
        'idle_timeout_hours' => (float) env('SESSION_IDLE_TIMEOUT_HOURS', 2),
    ],

    /*
    |--------------------------------------------------------------------------
    | Auth Cookie
    |--------------------------------------------------------------------------
    |
    | Attributes of the HttpOnly cookie that carries the Sanctum bearer
    | token to the admin frontend. The domain intentionally stays null
    | (host-only cookie) unless explicitly set: a cookie's Domain must
    | be a suffix of the response host, so deriving it from FRONTEND_URL
    | would break cross-host setups. Set AUTH_COOKIE_DOMAIN only when the
    | admin UI is served from a subdomain of the API host (or vice versa)
    | and a shared domain is required.
    |
    */
    'cookies' => [
        'name' => env('AUTH_COOKIE_NAME', 'ys_admin_token'),
        // Host-only unless explicitly set: an empty AUTH_COOKIE_DOMAIN in
        // an env file must behave exactly like an unset one (an empty
        // Domain attribute would produce a malformed Set-Cookie).
        'domain' => env('AUTH_COOKIE_DOMAIN') ?: null,
        'secure' => env('AUTH_COOKIE_SECURE'),
        // CHIPS (Cookies Having Independent Partitioned State): only
        // meaningful with Secure cookies. Config files cannot call
        // app()->isProduction() (the container is not booted yet), so
        // the production default is applied by the deployment env —
        // set AUTH_COOKIE_PARTITIONED=true in production.
        'partitioned' => env('AUTH_COOKIE_PARTITIONED', 'false') === 'true',
    ],

    /*
    |--------------------------------------------------------------------------
    | Trusted Proxies (P6-03)
    |--------------------------------------------------------------------------
    |
    | CIDR list of proxies allowed to announce X-Forwarded-Proto /
    | X-Forwarded-For. Kept in configuration (instead of a raw env() call
    | in bootstrap) so it survives `php artisan config:cache` and is
    | inspectable/testable like the rest of the security surface.
    | Empty string means no proxy is trusted (direct connections only).
    |
    */
    'proxy' => [
        'trusted_cidrs' => env('TRUSTED_PROXIES', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | TLS Enforcement (VULN-09)
    |--------------------------------------------------------------------------
    |
    | Hard deploy gate: when enabled (production default), every HTTP
    | request served without a detectable TLS termination is refused.
    | TLS termination is detected via $request->secure() — the trusted-
    | proxies chain (TRUSTED_PROXIES) lets an external gateway announce
    | X-Forwarded-Proto: https. In-container health probes are exempt.
    |
    */
    'tls' => [
        // Explicit REQUIRE_TLS wins; otherwise the gate is on only in
        // production. filter_var parses 'true'/'false' strings correctly.
        'require_tls' => env('REQUIRE_TLS') !== null
            ? (bool) filter_var(env('REQUIRE_TLS'), FILTER_VALIDATE_BOOL)
            : env('APP_ENV') === 'production',
    ],

];
