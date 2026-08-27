/**
 * Single source of truth for the API base URL.
 *
 * Every file that reads NEXT_PUBLIC_API_URL must import from here instead
 * of declaring its own `const API = process.env.NEXT_PUBLIC_API_URL ?? ...`.
 * This eliminates drift between 38+ call sites and guarantees the /api/v1
 * prefix is always present.
 *
 * On Vercel, set NEXT_PUBLIC_API_URL to '/api/v1' (relative) so the
 * next.config.ts rewrite proxies requests to the Railway backend.
 * This makes cookies (XSRF-TOKEN, session) work as same-origin.
 */

const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/**
 * The validated API base URL. Always includes /api/v1.
 *
 * Relative URLs (starting with /) are passed through as-is — the
 * browser resolves them against the current origin, and Vercel rewrites
 * handle the proxy to Railway.
 */
export const API_BASE = normalizeApiBase(raw)

/**
 * The API origin root (scheme + host + port, no path). Used for CSP
 * connect-src and CSRF cookie handshakes where the request targets
 * the origin root (e.g., /sanctum/csrf-cookie) instead of /api/v1/...
 *
 * For relative URLs this resolves to the current page's origin.
 */
export function getApiOrigin(): string {
  if (API_BASE.startsWith('/')) {
    if (typeof window !== 'undefined') return window.location.origin
    return ''  // SSR: empty string means same-origin relative fetch
  }
  return new URL(API_BASE).origin
}

function normalizeApiBase(value: string): string {
  // Relative URLs (e.g. '/api/v1') — used on Vercel with rewrites
  if (value.startsWith('/')) {
    return value.replace(/\/+$/, '') || '/api/v1'
  }

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
