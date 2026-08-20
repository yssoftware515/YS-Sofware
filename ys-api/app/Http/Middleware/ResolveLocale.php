<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the request locale from the Accept-Language header.
 *
 * Only locales the application can actually serve are accepted (en, ar).
 * Region variants (ar-EG, en-US) map to their base language. The highest
 * priority range that matches wins (q-values are respected). When nothing
 * matches the application falls back to the default locale.
 *
 * The resolved locale is applied globally, so controllers and resources
 * reading app()->getLocale() localize their output for API clients that
 * send Accept-Language.
 */
class ResolveLocale
{
    /** Locales the backend can serve. Keep in sync with the web frontend. */
    private const SUPPORTED = ['en', 'ar'];

    public function handle(Request $request, Closure $next): Response
    {
        app()->setLocale($this->resolve($request->header('Accept-Language')));

        return $next($request);
    }

    /**
     * Returns the best supported locale for the given header, or the
     * current (default) locale when nothing matches.
     */
    private function resolve(string|int|array|null $header): string
    {
        if (is_string($header) && $header !== '') {
            foreach ($this->parse($header) as $language => $quality) {
                $base = strtolower(strtok($language, '-'));

                if (in_array($base, self::SUPPORTED, true)) {
                    return $base;
                }
            }
        }

        return app()->getLocale();
    }

    /**
     * Parses an Accept-Language header into an ordered list of
     * language-range => quality pairs, highest quality first.
     *
     * @return array<string, float>
     */
    private function parse(string $header): array
    {
        $ranges = [];

        foreach (explode(',', $header) as $range) {
            $parts = array_map('trim', explode(';', trim($range)));
            $tag = strtolower($parts[0]);

            if ($tag === '' || $tag === '*') {
                continue;
            }

            $quality = 1.0;
            if (isset($parts[1])) {
                $pair = explode('=', $parts[1]);
                $q = isset($pair[1]) ? (float) $pair[1] : 1.0;
                $quality = max(0.0, min(1.0, $q));
            }

            $ranges[$tag] = $quality;
        }

        arsort($ranges, SORT_REGULAR);

        return $ranges;
    }
}
