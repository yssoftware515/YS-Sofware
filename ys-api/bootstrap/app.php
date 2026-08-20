<?php

use App\Http\Middleware\CookieToBearer;
use App\Http\Middleware\EnforceIdleSessionTimeout;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\RequireTlsInProduction;
use App\Http\Middleware\ResolveLocale;
use App\Http\Middleware\SecurityHeaders;
use App\Providers\AppServiceProvider;
use App\Providers\AuthServiceProvider;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Symfony\Component\HttpKernel\Exception\HttpException;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Applied to every request
        $middleware->append(SecurityHeaders::class);
        $middleware->append(ForceJsonResponse::class);
        $middleware->append(ResolveLocale::class);
        $middleware->append(RequireTlsInProduction::class);

        // CookieToBearer MUST run after Sanctum's stateful stack
        // (EncryptCookies) has decrypted the incoming cookies — the auth
        // cookie travels encrypted (EncryptCookies + CookieValuePrefix),
        // and a Bearer header built from the raw cookie value can never
        // match a token row (Phase 4B P1 defect: cookie auth 401'd on
        // every real request). Placing it in the api group AFTER
        // EnsureFrontendRequestsAreStateful keeps Bearer working for
        // non-stateful clients (real Authorization header) and fixes
        // cookie auth for stateful SPA requests.
        $middleware->api(append: [
            CookieToBearer::class,
        ]);

        // The router priority-sorts the route middleware stack, and
        // unlisted middleware stay in place — Authenticate would land
        // BEFORE CookieToBearer (framework defaults put Authenticate
        // right after the stateful middleware, with SubstituteBindings
        // last), reintroducing the 401. Pin CookieToBearer to run
        // immediately after the stateful stack and before any auth
        // check (see Phase 4B).
        $middleware->prependToPriorityList(
            AuthenticatesRequests::class,
            CookieToBearer::class,
        );

        // Named middleware aliases
        $middleware->alias([
            'active' => EnsureUserIsActive::class,
            'idle' => EnforceIdleSessionTimeout::class,
        ]);

        // Sanctum stateful domains (cookie-based auth for SPA)
        $middleware->statefulApi();

        // VULN-07: per-IP rate limits collapse into a global budget
        // behind the edge nginx when the proxy is untrusted — Laravel
        // ignores X-Forwarded-For and $request->ip() returns the proxy
        // container IP for EVERY client. Trust ONLY explicitly listed
        // proxy CIDRs from TRUSTED_PROXIES (comma-separated). Absent or
        // empty means no proxies are trusted (local dev). The edge nginx
        // overwrites X-Forwarded-For with $remote_addr, so client-supplied
        // values never survive to this app.
        //
        // NOTE: the trusted-proxy list itself is resolved in a booted()
        // callback below, NOT here — the 'config' binding does not exist
        // yet while these middleware callbacks run inside
        // Application::create(). TrustProxies reads the static state on
        // every request, so deferring the resolution until after the
        // providers boot preserves the exact runtime semantics (P6-03).
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Laravel 12 replaces the App\Exceptions\Handler class-based approach
        // with closures registered here. This renders() call provides the
        // consistent { success, message, code, errors } JSON shape used
        // across the entire API for every exception type.
        $exceptions->render(function (ValidationException $e, $request) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'code' => 'VALIDATION_ERROR',
                'errors' => $e->errors(),
            ], 422);
        });

        $exceptions->render(function (AuthenticationException $e, $request) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        });

        $exceptions->render(function (HttpException $e, $request) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'An error occurred.',
                'code' => 'HTTP_ERROR',
            ], $e->getStatusCode());
        });

        // Middleware-thrown responses (throttle:auth's custom 429 JSON,
        // Sanctum's redirects, …) carry their own full response — hand
        // it through untouched instead of letting the generic Throwable
        // renderer below rewrite it into a 500.
        $exceptions->render(function (HttpResponseException $e, $request) {
            return $e->getResponse();
        });

        $exceptions->render(function (Throwable $e, $request) {
            $status = 500;
            $message = app()->environment('production')
                ? 'An unexpected error occurred.'
                : $e->getMessage();

            return response()->json([
                'success' => false,
                'message' => $message,
                'code' => 'SERVER_ERROR',
            ], $status);
        });
    })
    ->withProviders([
        AppServiceProvider::class,
        AuthServiceProvider::class,
    ])
    ->create();

// P6-03 (config-cache hygiene): TRUSTED_PROXIES lives in
// config/security.php (proxy.trusted_cidrs) and is resolved here after
// the providers boot, when the 'config' binding is available. TrustProxies
// consumes the static state on every request, so the behavior is identical
// to the previous bootstrap-time env() read (empty => trust no proxy).
$app->booted(function () {
    $trustedProxies = array_values(array_filter(array_map(
        'trim',
        explode(',', (string) config('security.proxy.trusted_cidrs', '')),
    )));

    if ($trustedProxies !== []) {
        TrustProxies::at($trustedProxies);
        TrustProxies::withHeaders(
            Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_PROTO
                | Request::HEADER_X_FORWARDED_HOST,
        );
    }
});

return $app;
