<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Session Driver
    |--------------------------------------------------------------------------
    |
    | This option controls the default session "driver" that will be used on
    | requests. By default, we will use the lightweight file driver, but you
    | may specify any other valid driver here.
    |
    */

    'driver' => env('SESSION_DRIVER', 'file'),

    /*
    |--------------------------------------------------------------------------
    | Session Lifetime
    |--------------------------------------------------------------------------
    */

    'lifetime' => env('SESSION_LIFETIME', 120),

    'expire_on_close' => env('SESSION_EXPIRE_ON_CLOSE', false),

    'encrypt' => env('SESSION_ENCRYPT', false),

    /*
    |--------------------------------------------------------------------------
    | Session File Location / Database Connection
    |--------------------------------------------------------------------------
    */

    'files' => storage_path('framework/sessions'),

    'connection' => env('SESSION_CONNECTION'),

    'store' => env('SESSION_STORE'),

    /*
    |--------------------------------------------------------------------------
    | Session Sweeping Lottery
    |--------------------------------------------------------------------------
    */

    'lottery' => [2, 100],

    /*
    |--------------------------------------------------------------------------
    | Session Cookie Name
    |--------------------------------------------------------------------------
    */

    'cookie' => env('SESSION_COOKIE', 'ys_session'),

    /*
    |--------------------------------------------------------------------------
    | Session Cookie Path / Domain / SameSite
    |--------------------------------------------------------------------------
    |
    | SameSite distinguishes same-site from cross-site requests — not origins.
    | In the docker stack the edge nginx reverses /api/ to the backend on the
    | SAME registrable site as the frontend, so 'strict' cookies are attached
    | and cross-site blocking never applies. If the frontend ever moves to a
    | DIFFERENT registrable domain than the API, 'strict' blocks every
    | cookie-carrying request — that layout needs SameSite=None with a Secure
    | cookie (and a shared SESSION_DOMAIN only when both share one host).
    |
    */

    'path' => '/',

    'domain' => env('SESSION_DOMAIN'),

    'secure' => env('SESSION_SECURE_COOKIE', false),

    'http_only' => true,

    'same_site' => env('SESSION_SAME_SITE', 'strict'),

];
