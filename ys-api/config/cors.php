<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Settings for cross-origin requests. The frontend is a separate origin,
    | so CORS must allow credentialed requests for cookie-based auth.
    |
    */

    // api/*       — all versioned API routes (/api/v1/...)
    // sanctum/*   — CSRF cookie handshake (GET /sanctum/csrf-cookie)
    //               lives outside the /api/v1 prefix; the browser needs
    //               CORS headers to read the XSRF-TOKEN cookie it sets.
    'paths' => ['api/*', 'sanctum/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => true,

];
