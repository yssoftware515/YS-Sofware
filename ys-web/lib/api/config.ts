/**
 * Single source of truth for the API base URL.
 *
 * Every file that reads NEXT_PUBLIC_API_URL must import from here instead
 * of declaring its own `const API = process.env.NEXT_PUBLIC_API_URL ?? ...`.
 * This eliminates drift between 38+ call sites and guarantees the /api/v1
 * prefix is always present.
 *
 * Vercel deployment uses a dual-mode setup:
 *   - NEXT_PUBLIC_API_URL=/api/v1        → browser CSR (proxied via rewrites)
 *   - API_BACKEND_URL=<Railway origin>   → SSR/build (direct fetch)
 *
 * During SSR/build (typeof window === 'undefined'), relative URLs can't be
 * resolved, so we fall back to API_BACKEND_URL + the relative path.
 */

const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/**
 * The validated API base URL. Always includes /api/v1.
 *
 * Relative URLs (starting with /) are passed through as-is — the
 * browser resolves them against the current origin, and Vercel rewrites
 * handle the proxy to Railway.
 *
 * During SSR/build, relative URLs are resolved against API_BACKEND_URL
 * (the Railway origin) so static page generation works.
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

/**
 * Resolve the full API URL for server-side fetching (SSR/build).
 *
 * Browser-side code should use API_BASE (relative) so rewrites handle the
 * proxy. Server-side code (getServerSideProps, ISR, build-time static
 * generation) runs outside the browser and has no Vercel edge proxy, so
 * it needs the absolute Railway URL.
 */
export function serverApiBase(): string {
  // Already absolute — use as-is
  if (!raw.startsWith('/')) return API_BASE

  // Relative: resolve against API_BACKEND_URL (Railway origin)
  const backend = process.env.API_BACKEND_URL
  if (backend) {
    const origin = backend.replace(/\/+$/, '')
    const path = raw.replace(/\/+$/, '') || '/api/v1'
    return `${origin}${path}`
  }

  // Fallback: localhost (local dev has a backend)
  return 'http://localhost:8000/api/v1'
}

function normalizeApiBase(value: string): string {
  // Relative URLs (e.g. '/api/v1') — used on Vercel with rewrites
  if (value.startsWith('/')) {
    // During SSR/build, resolve against the backend origin
    if (typeof window === 'undefined') {
      return serverApiBase()
    }
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
