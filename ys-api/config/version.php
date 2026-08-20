<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Build / Release Version
    |--------------------------------------------------------------------------
    |
    | Reported by the /api/v1/health endpoint so an operator can tell at a
    | glance which release answers. APP_VERSION is set by the deployment
    | environment (root .env.example); it is not wired through config/app.php
    | because that file is not present in this application.
    |
    */

    'app' => env('APP_VERSION', '1.0.0'),

];
