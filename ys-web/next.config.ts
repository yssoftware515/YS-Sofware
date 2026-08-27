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
// need the absolute Railway backend origin — fall back to API_BACKEND_URL
// or localhost.
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

const apiOrigin = resolveApiOrigin()

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
    remotePatterns: [
      {
        protocol: apiOrigin.startsWith('https') ? 'https' : 'http',
        hostname: new URL(apiOrigin).hostname,
        port: new URL(apiOrigin).port,
        pathname: '/storage/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
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
