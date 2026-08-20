import { existsSync } from 'fs'
import path from 'path'

/**
 * productAssets — bridges the gap between the CMS-driven `product.cover_image`
 * / `product.media` (uploaded via the admin media library, the long-term
 * source of truth) and a static asset a product owner can drop straight into
 * `public/branding/products/<slug>/` before the CMS entry has an image.
 *
 * Callers should ALWAYS prefer the CMS-provided URL first and only fall
 * back to these helpers when it's null. That keeps the admin media library
 * as the real source of truth; this is purely a graceful bridge so a page
 * doesn't ship with an empty icon-only card just because nobody has opened
 * the admin panel to attach the asset yet.
 *
 * `existsSync` runs at request time on the server (these are only called
 * from Server Components) — if the file hasn't been uploaded, the helper
 * returns null and callers fall through to the existing icon/initials
 * placeholder. Never returns a path to a file that doesn't exist, so a
 * broken <Image> is impossible.
 */

const PRODUCTS_DIR = path.join(process.cwd(), 'public', 'branding', 'products')

function resolveIfExists(slug: string, filename: string): string | null {
  const absolutePath = path.join(PRODUCTS_DIR, slug, filename)
  // Guard against path traversal via an unexpected slug value.
  if (!absolutePath.startsWith(PRODUCTS_DIR)) return null
  return existsSync(absolutePath) ? `/branding/products/${slug}/${filename}` : null
}

/** Marketing/discovery cover — used on product listing & discovery cards. */
export function getProductCoverFallback(slug: string): string | null {
  return resolveIfExists(slug, `${slug}-cover.webp`)
}

/** Real in-product screenshot — used as the product detail page's main visual. */
export function getProductDashboardFallback(slug: string): string | null {
  return resolveIfExists(slug, `${slug}-dashboard.webp`)
}
