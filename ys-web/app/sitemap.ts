import type { MetadataRoute } from 'next'
import { api } from '@/lib/api/client'
import { resolveAppUrl } from '@/lib/seo'

const LOCALES   = ['en', 'ar'] as const

// Static routes that exist for every locale
const STATIC_ROUTES = [
  '',
  '/about',
  '/services',
  '/contact',
  '/privacy',
  '/terms',
  '/faq',
  '/security',
  '/cookie-policy',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const APP_URL = await resolveAppUrl()

  const entries: MetadataRoute.Sitemap = []

  // ── Static routes — both locales ────────────────────────────────────
  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      entries.push({
        url: `${APP_URL}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.7,
        alternates: {
          languages: {
            en: `${APP_URL}/en${route}`,
            ar: `${APP_URL}/ar${route}`,
          },
        },
      })
    }
  }

  // ── Dynamic: Services ─────────────────────────────────────────────
  try {
    const services = await api.services('en')
    for (const locale of LOCALES) {
      for (const service of services) {
        entries.push({
          url: `${APP_URL}/${locale}/services/${service.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: {
            languages: {
              en: `${APP_URL}/en/services/${service.slug}`,
              ar: `${APP_URL}/ar/services/${service.slug}`,
            },
          },
        })
      }
    }
  } catch {
    // API unavailable at build time — sitemap still returns static routes
  }

  return entries
}
