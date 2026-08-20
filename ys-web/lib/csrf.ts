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

/** Derive the API origin root (where /sanctum/csrf-cookie lives). */
export function apiOrigin(apiBase: string): string {
  try {
    return new URL(apiBase).origin
  } catch {
    return apiBase
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
  inflight = fetch(`${apiOrigin(apiBase)}${CSRF_COOKIE_PATH}`, {
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