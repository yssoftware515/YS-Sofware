import type { NextConfig } from 'next'

// Same env var lib/api/client.ts already reads (includes a path, e.g.
// '.../api/v1') — parsed once here and reused below for next/image's
// remotePatterns too, so there's exactly one source of truth instead of
// two hardcoded localhost values that could drift out of sync with each
// other. Previously both were hardcoded to `http://localhost:8000`, which
// would have silently broken every image the moment a real production API
// domain replaced localhost — CSP would block it, and next/image would
// throw outright ("hostname not configured").
// NEXT_PUBLIC_API_URL may be relative (e.g. '/api/v1' on Vercel) which
// can't be parsed by new URL(). For rewrites and image remotePatterns we
// need the absolute backend origin — API_BACKEND_URL is the source for it
// on Vercel, and the absolute NEXT_PUBLIC_API_URL elsewhere.
function resolveApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  if (raw.startsWith('/')) {
    const backend = process.env.API_BACKEND_URL
    if (backend) return backend.replace(/\/+$/, '')
    return 'http://localhost:8000'
  }
  try {
    return new URL(raw).origin
  } catch {
    return 'http://localhost:8000'
  }
}

// The API origin can only be resolved at BUILD time. If the deployment
// forgot API_BACKEND_URL (and NEXT_PUBLIC_API_URL is the relative '/api/v1'
// used on Vercel), the origin silently degrades to localhost:8000 — and a
// remotePatterns entry for `localhost` is both wrong in production and
// rejected by Next.js 16's local-IP protection. In that case we declare no
// remote pattern at all rather than a bogus one: the branding artwork is
// served from /public (unoptimized), so nothing depends on it.
const resolvedApiOrigin = resolveApiOrigin()
const apiIsLocalhost = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/.test(resolvedApiOrigin)
const apiOrigin = resolvedApiOrigin

const nextConfig: NextConfig = {
  // Standalone output is required for the Docker deployment path
  // (ys-web/Dockerfile copies .next/standalone and runs node server.js).
  // Vercel does not need or want this — its build pipeline handles output
  // packaging itself. The DOCKER_BUILD env var is set in the Dockerfile's
  // builder stage; Vercel and local dev never set it, so standalone is
  // off by default and only activates when explicitly requested.
  ...(process.env.DOCKER_BUILD === 'true' && { output: 'standalone' }),
  compress:       true,
  poweredByHeader: false,

  images: {
    // Only declare a remote pattern when the API origin is a real host.
    // A localhost/127.0.0.1 origin would be rejected by Next.js 16's
    // local-IP protection and serves no purpose in a real deployment.
    remotePatterns: apiIsLocalhost
      ? []
      : [
          {
            protocol: apiOrigin.startsWith('https') ? 'https' : 'http',
            hostname: new URL(apiOrigin).hostname,
            port: new URL(apiOrigin).port,
            pathname: '/storage/**',
          },
        ],
    formats: ['image/avif', 'image/webp'],
    // Optimized variants are immutable — cache them for a week instead of
    // revalidating every 60s (the default), cutting repeat optimizer work.
    minimumCacheTTL: 604800,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control',          value: 'on' },
          { key: 'Referrer-Policy',                 value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options',          value: 'nosniff' },
          { key: 'X-Frame-Options',                 value: 'DENY' },
          { key: 'Permissions-Policy',              value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
      {
        source: '/sanctum/:path*',
        destination: `${apiOrigin}/sanctum/:path*`,
      },
    ]
  },
}

export default nextConfig
