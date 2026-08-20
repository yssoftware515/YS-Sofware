import type { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ys-systems.com'

/**
 * Production robots.txt configuration.
 *
 * ── Allow rules ──
 *   All crawlers may access the entire public site (products, docs,
 *   updates, FAQ, security, legal pages, etc.).
 *
 * ── Disallow rules ──
 *   /admin and /admin/* are blocked entirely. This covers all admin
 *   sub-routes (products/edit, users, settings, platform, etc.).
 *
 * ── Crawl priority note ──
 *   No Crawl-Delay is set — Google, Bing, and others will use their
 *   default crawl rate. If crawl budget becomes a concern, add:
 *     Crawl-Delay: 10
 *
 * ── Content verification ──
 *   The following public routes are NOT blocked (verified):
 *   /products, /docs, /updates, /faq, /security, /cookie-policy,
 *   /privacy, /terms, /about, /changelog, /releases,
 *   /roadmap, /careers, /contact, /status
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
