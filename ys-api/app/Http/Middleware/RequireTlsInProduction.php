<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * VULN-09 hard gate: refuse to serve plain-HTTP requests when the
 * application is expected to be behind TLS.
 *
 * TLS is "detectable" through $request->secure(), which honors the
 * trusted-proxies chain (TRUSTED_PROXIES, FIX-07): an external gateway
 * that terminates TLS announces X-Forwarded-Proto: https and passes.
 * A production deployment without any TLS termination (or without
 * forwarding the proto header) fails loud instead of shipping the
 * bearer cookie and PII in clear text.
 *
 * Health probes run inside the container over plain HTTP by design
 * (compose healthcheck, release.yml verification) and are exempt.
 */
class RequireTlsInProduction
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('security.tls.require_tls', false)) {
            return $next($request);
        }

        if ($request->is('up') || $request->is('api/v1/health')) {
            return $next($request);
        }

        if (! $request->secure()) {
            return response()->json([
                'success' => false,
                'message' => 'HTTPS is required — TLS must terminate in front of the application.',
                'code' => 'TLS_REQUIRED',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
