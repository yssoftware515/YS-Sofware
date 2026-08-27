const XSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_COOKIE_PATH = '/sanctum/csrf-cookie'

/**
 * Centralized Laravel Sanctum SPA CSRF handshake.
 *
 * The API is configured with `statefulApi()` (ys-api/bootstrap/app.php),
 * so browser requests that carry an Origin/Referer matching a stateful
 * domain run through Sanctum's CSRF middleware. Non-GET requests must
 * echo the XSRF-TOKEN cookie (URL-decoded) in the X-XSRF-TOKEN header —
 * without it the API answers HTTP 419. The cookie is set (and refreshed
 * on every stateful response) by the GET /sanctum/csrf-cookie endpoint,
 * which lives at the API ORIGIN root, not under the /api/v1 prefix.
 *
 * Server-side (SSR/ISR) fetches have no browser cookies and no Origin,
 * so they are never CSRF-gated; every function here is a no-op there.
 */

function isBrowser(): boolean {
  return typeof document !== 'undefined'
}

/** Read the XSRF-TOKEN cookie, URL-decoded exactly as the API expects. */
export function readXsrfToken(): string | null {
  if (!isBrowser()) return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${XSRF_COOKIE}=([^;]*)`))
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

/**
 * Build the absolute or relative URL for the CSRF cookie endpoint.
 *
 * When API_BASE is relative (e.g. '/api/v1' on Vercel with rewrites),
 * the CSRF endpoint is also relative: '/sanctum/csrf-cookie'. The
 * browser resolves it against the current origin, and the Vercel
 * rewrite proxies it to Railway.
 *
 * When API_BASE is absolute (e.g. 'http://localhost:8000/api/v1'),
 * derive the origin and prefix the CSRF path.
 */
function csrfUrl(apiBase: string): string {
  if (apiBase.startsWith('/')) {
    // Relative — same-origin via Vercel rewrite
    return CSRF_COOKIE_PATH
  }
  try {
    return `${new URL(apiBase).origin}${CSRF_COOKIE_PATH}`
  } catch {
    return CSRF_COOKIE_PATH
  }
}

let inflight: Promise<void> | null = null

/**
 * Ensure the CSRF cookie exists before the next non-GET request.
 * Concurrent callers share one prefetch; the cookie is then refreshed
 * server-side on every stateful response (2h lifetime).
 */
export function ensureXsrfToken(apiBase: string): Promise<void> {
  if (!isBrowser() || readXsrfToken()) return Promise.resolve()
  if (inflight) return inflight
  inflight = fetch(csrfUrl(apiBase), {
    method: 'GET',
    credentials: 'include',
  })
    .catch(() => {
      // A failed prefetch must not break the caller: without the cookie
      // the API answers 419, which is the correct fail-closed behavior.
    })
    .then(() => {
      inflight = null
    })
  return inflight
}