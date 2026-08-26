/**
 * Single source of truth for the API base URL.
 *
 * Every file that reads NEXT_PUBLIC_API_URL must import from here instead
 * of declaring its own `const API = process.env.NEXT_PUBLIC_API_URL ?? ...`.
 * This eliminates drift between 38+ call sites and guarantees the /api/v1
 * prefix is always present.
 */

const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/**
 * The validated API base URL. Always includes /api/v1.
 *
 * If the env var is set WITHOUT the /api/v1 suffix, this module appends
 * it — so the backend's apiPrefix: 'api/v1' is always reachable.
 */
export const API_BASE = normalizeApiBase(raw)

/**
 * The API origin (scheme + host + port, no path). Used for CSP connect-src
 * and CSRF cookie handshakes where the request targets the origin root
 * (e.g., /sanctum/csrf-cookie) instead of /api/v1/...
 */
export const API_ORIGIN = new URL(API_BASE).origin

function normalizeApiBase(value: string): string {
  try {
    const url = new URL(value)
    // Ensure the path always ends with /api/v1
    const path = url.pathname.replace(/\/+$/, '') // strip trailing slashes
    if (!path.endsWith('/api/v1')) {
      url.pathname = path + '/api/v1'
    }
    return url.toString().replace(/\/+$/, '') // no trailing slash
  } catch {
    // Malformed URL — fall back to localhost
    return 'http://localhost:8000/api/v1'
  }
}
