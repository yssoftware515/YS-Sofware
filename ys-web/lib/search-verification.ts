/**
 * Centralized search engine verification configuration.
 *
 * All verification tokens are sourced from environment variables so they
 * can differ per environment (local, staging, production) without code
 * changes. Empty variables produce no meta tag.
 *
 * Supported search engines:
 *   NEXT_PUBLIC_GOOGLE_VERIFICATION  → <meta name="google-site-verification">
 *   NEXT_PUBLIC_BING_VERIFICATION    → <meta name="msvalidate.01">
 *   NEXT_PUBLIC_YANDEX_VERIFICATION  → <meta name="yandex-verification">
 *
 * IndexNow is a push protocol (not a meta tag). Use `submitIndexNow()` to
 * notify search engines when content changes.
 */

export interface SearchVerificationMeta {
  name: string
  content: string
}

let googleToken: string | undefined
let bingToken: string | undefined
let yandexToken: string | undefined

try {
  googleToken = process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined
  bingToken   = process.env.NEXT_PUBLIC_BING_VERIFICATION   || undefined
  yandexToken = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined
} catch {
  // Not in a Next.js environment — tokens stay undefined
}

/**
 * Returns the array of <meta> tag descriptors needed for search engine
 * verification. Only tokens that are actually set produce a tag.
 */
export function getVerificationMetaTags(): SearchVerificationMeta[] {
  const tags: SearchVerificationMeta[] = []

  if (googleToken) {
    tags.push({ name: 'google-site-verification', content: googleToken })
  }
  if (bingToken) {
    tags.push({ name: 'msvalidate.01', content: bingToken })
  }
  if (yandexToken) {
    tags.push({ name: 'yandex-verification', content: yandexToken })
  }

  return tags
}

/**
 * Submit URLs to IndexNow for immediate indexing.
 *
 * Call this after publishing or updating important content so search
 * engines discover the change without waiting for the next crawl.
 *
 * @example
 *   await submitIndexNow(['https://ys-systems.com/en/products/new-product'])
 */
export async function submitIndexNow(urls: string[]): Promise<void> {
  const key = process.env.NEXT_PUBLIC_INDEXNOW_KEY

  if (!key) {
    // IndexNow not configured — production should set INDEXNOW_KEY
    return
  }

  const host = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ys-systems.com'

  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: host.replace(/^https?:\/\//, ''),
        key,
        keyLocation: `${host}/${key}.txt`,
        urlList: urls,
      }),
    })
  } catch {
    // IndexNow is best-effort — failures are non-critical
  }
}
