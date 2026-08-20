<?php

namespace App\Domains\System\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * HealthCheckService — the SINGLE source of truth for the health block
 * (database + cache connectivity) consumed by the public /health
 * endpoint and the admin dashboard's health block. One implementation,
 * two call sites; the response shape is part of the deployment contract
 * (see tests/Feature/Public/HealthContractTest). No application
 * version/build fingerprint is ever included here.
 */
final class HealthCheckService
{
    public function checks(): array
    {
        $checks = [];
        try {
            DB::connection()->getPdo();
            $checks['database'] = 'ok';
        } catch (\Exception) {
            $checks['database'] = 'error';
        }
        try {
            // Use the app's configured default cache store rather than
            // hardcoding 'redis' — keeps the check meaningful in every
            // environment (local dev without Redis, testing, staging,
            // production) instead of reporting a false "degraded".
            Cache::put('_health_check', 1, 10);
            $checks['cache'] = 'ok';
        } catch (\Exception) {
            $checks['cache'] = 'error';
        }

        $allOk = ! in_array('error', $checks, true);

        return [
            'status' => $allOk ? 'ok' : 'degraded',
            'checks' => $checks,
        ];
    }
}