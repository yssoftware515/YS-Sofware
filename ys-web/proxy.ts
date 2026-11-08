import { NextRequest, NextResponse } from 'next/server'

const locales       = ['en', 'ar'] as const
const defaultLocale = 'en'

const isDev = process.env.NODE_ENV === 'development'

// Same derivation as next.config.ts — single source of truth for the API
// origin, used in the CSP connect-src/img-src directives.
const apiUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  // Relative URLs (e.g. '/api/v1' on Vercel) — rewrites proxy everything,
  // so 'self' in CSP is sufficient and no external origin is needed.
  if (raw.startsWith('/')) return null
  try {
    return new URL(raw)
  } catch {
    return new URL('http://localhost:8000')
  }
})()

// Strict CSP with a per-request nonce (Next.js applies the nonce to its own
// inline scripts and bundles automatically). `'unsafe-inline'` is deliberately
// absent from script-src — the only inline script (the locale/dir bootstrap in
// app/layout.tsx) carries the nonce explicitly. `'unsafe-eval'` is dev-only
// (React dev tooling). style-src keeps 'unsafe-inline' because the app sets
// inline style attributes (nonces do not cover style attributes).
function cspHeader(nonce: string): string {
  const apiOrigin = apiUrl?.origin ?? ''
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self'${apiOrigin ? ' ' + apiOrigin : ''} data: blob:`,
    `connect-src 'self'${apiOrigin ? ' ' + apiOrigin : ''}`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
  ]
  return directives.join('; ')
}

function nextWithSecurity(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader(nonce))

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', cspHeader(nonce))
  response.headers.set('x-nonce', nonce)

  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }

  return response
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('ys_admin_token')?.value
    if (!token && pathname !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return nextWithSecurity(request)
  }

  // Skip Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/health') ||
    pathname.includes('.')
  ) {
    return nextWithSecurity(request)
  }

  // Legacy public routes removed during the 2026 cleanup (products, docs,
  // updates, releases, roadmap, changelog, status, careers). Old live links,
  // search indexes and bookmarks are 308-redirected to the closest surviving
  // page instead of 404ing.
  const locale = pathname.match(/^\/(en|ar)(?:\/|$)/)?.[1] ?? defaultLocale
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/'

  const legacyRedirect = (): string | null => {
    // /products/* and /ecosystem/* → /services
    if (/^\/(products|ecosystem)(\/.*)?$/.test(rest)) return `/${locale}/services`
    // /docs/* → /faq
    if (/^\/docs(\/.*)?$/.test(rest)) return `/${locale}/faq`
    // /careers → /contact (applications went straight to /contact anyway)
    if (/^\/careers(\/.*)?$/.test(rest)) return `/${locale}/contact`
    // /updates, /releases, /changelog, /roadmap, /status → /about
    if (/^\/(updates|releases|changelog|roadmap|status)$/.test(rest)) return `/${locale}/about`
    return null
  }

  const legacy = legacyRedirect()
  if (legacy) {
    return NextResponse.redirect(new URL(legacy, request.url), 308)
  }

  // Check if already has locale prefix
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )
  if (hasLocale) return nextWithSecurity(request)

  // Redirect to default locale
  return NextResponse.redirect(
    new URL(`/${defaultLocale}${pathname}`, request.url)
  )
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}