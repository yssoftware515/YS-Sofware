<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CookieToBearer
{
    public function handle(Request $request, Closure $next): Response
    {
        $cookieName = config('security.cookies.name', 'ys_admin_token');

        // For stateful (Sanctum) requests EncryptCookies has already
        // decrypted the cookie AND stripped the CookieValuePrefix, so the
        // value here is the raw plainTextToken. Non-stateful requests
        // never get the cookie decrypted, so it can't be used as a Bearer
        // credential (a real Authorization header wins either way).
        if (
            ! $request->bearerToken()
            && $request->hasCookie($cookieName)
        ) {
            $request->headers->set(
                'Authorization',
                'Bearer '.$request->cookie($cookieName)
            );
        }

        return $next($request);
    }
}
