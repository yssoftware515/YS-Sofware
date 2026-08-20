<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Bootstrap Admin Credentials
    |--------------------------------------------------------------------------
    |
    | Used by AdminUserSeeder to create the initial super admin. Values come
    | exclusively from environment variables — never hardcode secrets. An
    | empty ADMIN_PASSWORD means the seeder refuses to run (fail closed).
    |
    */
    'credentials' => [
        'name' => env('ADMIN_NAME', 'YS Admin'),
        'email' => env('ADMIN_EMAIL', 'admin@ys-systems.com'),
        'password' => env('ADMIN_PASSWORD', ''),
    ],

];
