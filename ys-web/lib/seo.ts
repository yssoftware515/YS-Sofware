import type { Metadata } from 'next'
import { SeoRegistry } from '@/lib/platform/registries/SeoRegistry'

const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ys-systems.com'
const DEFAULT_OG      = '/branding/social/og-image.webp'
const DEFAULT_TWITTER = '/branding/social/twitter-card.webp'
const SITE_NAME_EN = 'YS Systems & Software'
const SITE_NAME_AR = 'واي إس سيستمز آند سوفتوير'

/**
 * Serialize a JSON-LD object for safe injection into a <script
 * type="application/ld+json"> block. JSON.stringify alone is NOT safe:
 * a `</script>` sequence inside any string value (admin-authored product
 * descriptions, FAQ answers, CMS settings — or even a hostile URL path
 * segment) would break out of the script element and become executable
 * HTML/JS. Escaping every `<` as \u003c (a pure JSON escape, decoded
 * back by any JSON parser) makes breakout impossible. U+2028/U+2029 are
 * also escaped — they are valid JSON but invalid in JavaScript strings,
 * which breaks some strict validators.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * Central SEO registry singleton.
 * Platform modules, marketplace products, and future extensions register
 * their SEO metadata here. `buildMetadata()` automatically consults this
 * registry so every route gets consistent metadata without each page
 * needing to call `buildMetadata()` manually.
 */
export const seoRegistry = new SeoRegistry()

export interface BreadcrumbItem {
  name: string
  item: string
}

interface BuildMetadataOptions {
  locale: string
  path: string              // e.g. '/products/ys-matrix' — no locale prefix
  title: string
  description: string
  image?: string            // absolute or relative OG image path
  noIndex?: boolean         // for draft/private content that slipped through
  type?: 'website' | 'article'
  publishedTime?: string    // ISO date, for article type
}

/**
 * Central SEO metadata builder. Every page.tsx generateMetadata() should
 * funnel through this so canonical URLs, hreflang alternates, and Open
 * Graph tags stay consistent across the entire site without each page
 * re-implementing the same boilerplate.
 */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
  noIndex = false,
  type = 'website',
  publishedTime,
}: BuildMetadataOptions): Metadata {
  const isAr        = locale === 'ar'
  const siteName    = isAr ? SITE_NAME_AR : SITE_NAME_EN
  const canonicalUrl = `${APP_URL}/${locale}${path}`
  const ogImage      = image ?? DEFAULT_OG
  const ogImageUrl   = ogImage.startsWith('http') ? ogImage : `${APP_URL}${ogImage}`
  // Twitter/X gets its own dedicated card asset by default (twitter-card.webp,
  // sized/cropped for its card format) rather than silently reusing the OG
  // image. A page-specific `image` override still applies to both, since
  // that's a real asset for that exact page (e.g. a product cover).
  const twitterImage    = image ?? DEFAULT_TWITTER
  const twitterImageUrl = twitterImage.startsWith('http') ? twitterImage : `${APP_URL}${twitterImage}`

  // Consult SeoRegistry for registered contributions.
  // Page-provided params take precedence over registry data.
  const contribution = seoRegistry.findByRoute(path)
  const registryTitle = contribution ? (isAr ? contribution.titleAr : contribution.titleEn) : undefined
  const registryDesc  = contribution ? (isAr ? contribution.descriptionAr : contribution.descriptionEn) : undefined

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${APP_URL}/en${path}`,
        ar: `${APP_URL}/ar${path}`,
        'x-default': `${APP_URL}/en${path}`,
      },
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      locale: isAr ? 'ar_AR' : 'en_US',
      type,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      ...(type === 'article' && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [twitterImageUrl],
    },
  }
}

/**
 * Convenience wrapper for pages driven by the SeoRegistry.
 * Looks up SEO metadata from the registry for the given route, falls back
 * to sensible defaults when no registration exists.
 *
 * Useful for:
 * - Future CMS-driven pages that don't have hardcoded metadata exports
 * - Platform modules that register their routes via `seoRegistry.registerContribution()`
 * - Marketplace products that want SEO without creating page.tsx files
 *
 * Page-level overrides (title, description, etc.) are still supported via the second argument.
 */
export function buildMetadataFromRegistry(
  locale: string,
  path: string,
  overrides?: Partial<BuildMetadataOptions>,
): Metadata {
  const isAr = locale === 'ar'
  const contribution = seoRegistry.findByRoute(path)
  const registryTitle = contribution ? (isAr ? contribution.titleAr : contribution.titleEn) : undefined
  const registryDesc  = contribution ? (isAr ? contribution.descriptionAr : contribution.descriptionEn) : undefined

  return buildMetadata({
    locale,
    path,
    title: overrides?.title ?? registryTitle ?? (isAr ? 'YS Systems & Software' : 'YS Systems & Software'),
    description: overrides?.description ?? registryDesc ?? (isAr ? 'منصة برمجية حديثة' : 'Modern software platform'),
    image: overrides?.image,
    noIndex: overrides?.noIndex,
    type: overrides?.type,
    publishedTime: overrides?.publishedTime,
  })
}

/**
 * Generate BreadcrumbList JSON-LD from an array of breadcrumb items.
 * Each item has a human-readable `name` and a relative `item` path (no locale prefix).
 */
export function breadcrumbJsonLd(
  locale: string,
  items: BreadcrumbItem[],
): string {
  const itemListElement = items.map((crumb, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: crumb.name,
    item: `${APP_URL}/${locale}${crumb.item}`,
  }))

  return safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  })
}
