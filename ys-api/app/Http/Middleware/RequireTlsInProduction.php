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

        // CORS preflight requests (OPTIONS with Access-Control-Request-Method)
        // are handled by HandleCors BEFORE this middleware in the global stack.
        // If HandleCors didn't match the path, the preflight falls through here.
        // Rejecting it with 403 prevents the browser from ever seeing CORS headers,
        // even when the origin is valid. Exempt preflights: the browser discards
        // the response anyway if CORS headers are absent, so there is no security
        // downside to letting them pass through to the router (which returns 404/405).
        if ($request->isMethod('OPTIONS')
            && $request->headers->has('Access-Control-Request-Method')) {
            return $next($request);
        }

        if (! $request->secure()) {
            // Diagnostic: log why TLS gate fired so deploy-time
            // misconfigurations are visible in logs without code changes.
            logger('TLS gate blocked request', [
                'url'         => $request->fullUrl(),
                'scheme'      => $request->getScheme(),
                'secure'      => $request->secure(),
                'forwarded'   => $request->headers->get('X-Forwarded-Proto'),
                'trusted'     => $request->getTrustedProxies(),
                'client_ip'   => $request->ip(),
                'server_ip'   => $request->server('SERVER_ADDR'),
                'forward_for' => $request->headers->get('X-Forwarded-For'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'HTTPS is required — TLS must terminate in front of the application.',
                'code'    => 'TLS_REQUIRED',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
