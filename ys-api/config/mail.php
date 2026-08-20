<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | The mailer used by queued emails (admin welcome, contact-request
    | notifications). Local/.env.example defaults to the `log` mailer so
    | nothing leaves the machine unless MAIL_MAILER is set. Production
    | compose passes MAIL_MAILER (defaulting to `smtp`).
    |
    */

    'default' => env('MAIL_MAILER', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | All mail drivers use a similar configuration. Reserved keys are
    | `transport` (driver name) and `mailers` (failover / mailgun style
    | drivers).
    |
    */

    'mailers' => [

        'smtp' => [
            'transport' => 'smtp',
            'url' => env('MAIL_URL'),
            'host' => env('MAIL_HOST', '127.0.0.1'),
            'port' => env('MAIL_PORT', 1025),
            'encryption' => env('MAIL_ENCRYPTION', 'tls'),
            'username' => env('MAIL_USERNAME'),
            'password' => env('MAIL_PASSWORD'),
            'timeout' => null,
            'local_domain' => env('MAIL_EHLO_DOMAIN'),
        ],

        'log' => [
            'transport' => 'log',
            'channel' => env('MAIL_LOG_CHANNEL'),
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => ['smtp', 'log'],
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    */

    'from' => [
        'address' => env('MAIL_FROM_ADDRESS', 'no-reply@ys-systems.com'),
        'name' => env('MAIL_FROM_NAME', env('APP_NAME', 'YS Systems')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Markdown Mail Settings
    |--------------------------------------------------------------------------
    */

    'markdown' => [
        'theme' => 'default',
        'paths' => [
            resource_path('views/vendor/mail'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Notification Address
    |--------------------------------------------------------------------------
    |
    | Recipient of queued admin notifications (contact requests, admin user
    | creation, ...). REQUIRED in environments that send real mail — when
    | unset, the job logs a warning and skips instead of falling back to a
    | hardcoded personal mailbox.
    |
    */

    'admin_address' => env('MAIL_ADMIN_ADDRESS', ''),
];
