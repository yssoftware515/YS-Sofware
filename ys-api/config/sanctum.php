<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Requests from the following domains/hosts will receive stateful API
    | authentication cookies. These should include your frontend URL so
    | that Sanctum can read/write the session cookies for SPA auth.
    |
    */

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
        env('FRONTEND_URL') ? ','.parse_url(env('FRONTEND_URL'), PHP_URL_HOST) : ''
    ))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | Set to null to never expire tokens (managed by our custom token TTL
    | in config/security.php). Set a value to have Sanctum auto-expire.
    |
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Track Last Used At
    |--------------------------------------------------------------------------
    |
    | VULN-14: Sanctum's own last_used_at stamping is DISABLED. It fires
    | during guard resolution — before any route middleware — so an idle
    | check observing the token would always see it as just-active.
    | EnforceIdleSessionTimeout (alias 'idle') performs the idle check
    | and stamps last_used_at only for sessions that survive the window.
    |
    */

    'last_used_at' => false,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    |
    | Sanctum can prefix new tokens to identify their origin.
    |
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', 'token_'),

];
