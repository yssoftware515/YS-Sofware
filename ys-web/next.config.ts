import type { NextConfig } from 'next'

// Same env var lib/api/client.ts already reads (includes a path, e.g.
// '.../api/v1') — parsed once here and reused below for next/image's
// remotePatterns too, so there's exactly one source of truth instead of
// two hardcoded localhost values that could drift out of sync with each
// other. Previously both were hardcoded to `http://localhost:8000`, which
// would have silently broken every image the moment a real production API
// domain replaced localhost — CSP would block it, and next/image would
// throw outright ("hostname not configured").
const apiUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
  } catch {
    return new URL('http://localhost:8000')
  }
})()
const apiOrigin = apiUrl.origin

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
        protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: apiUrl.hostname,
        port:     apiUrl.port,
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
}

export default nextConfig
