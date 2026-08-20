import type { MetadataRoute } from 'next'
import { api } from '@/lib/api/client'

const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ys-systems.com'
const LOCALES   = ['en', 'ar'] as const

// Static routes that exist for every locale
const STATIC_ROUTES = [
  '',
  '/about',
  '/products',
  '/services',
  '/updates',
  '/changelog',
  '/releases',
  '/docs',
  '/roadmap',
  '/careers',
  '/contact',
  '/status',
  '/privacy',
  '/terms',
  '/faq',
  '/security',
  '/cookie-policy',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // ── Dynamic: Products ─────────────────────────────────────────────
  try {
    const products = await api.products('en')
    for (const locale of LOCALES) {
      for (const product of products) {
        entries.push({
          url: `${APP_URL}/${locale}/products/${product.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: {
            languages: {
              en: `${APP_URL}/en/products/${product.slug}`,
              ar: `${APP_URL}/ar/products/${product.slug}`,
            },
          },
        })
      }
    }
  } catch {
    // API unavailable at build time — sitemap still returns static routes
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

  // ── Dynamic: Documentation articles ─────────────────────────────────
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    const res  = await fetch(`${API_BASE}/public/docs`, { next: { revalidate: 3600 } })
    const body = await res.json()

    if (body.success) {
      const slugs = new Set<string>()
      const collect = (categories: any[]) => {
        for (const cat of categories) {
          for (const article of cat.articles ?? []) slugs.add(article.slug)
          if (cat.children) collect(cat.children)
        }
      }
      collect(body.data)

      for (const locale of LOCALES) {
        for (const slug of slugs) {
          entries.push({
            url: `${APP_URL}/${locale}/docs/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.6,
            alternates: {
              languages: {
                en: `${APP_URL}/en/docs/${slug}`,
                ar: `${APP_URL}/ar/docs/${slug}`,
              },
            },
          })
        }
      }
    }
  } catch {
    // Graceful degradation
  }

  // Note: no /careers/[id] detail page exists in the frontend yet —
  // the public careers listing links "Apply Now" straight to /contact.
  // Add career detail entries here once that page is built.

  return entries
}
