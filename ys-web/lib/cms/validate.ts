import type { HomepageSection } from '@/types'
import type { z } from 'zod'

const SAFE_PROTOCOLS = ['https:', 'http:', 'mailto:', 'tel:']

// Social links rendered into <a href> in the footer. Stricter than
// validateUrl: https-only and host must be one of the allowlisted social
// platforms (www. prefix tolerated). Rejects javascript:, data:, unknown
// hosts, and anything with embedded credentials.
const SOCIAL_ALLOWLIST = [
  'github.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
]

export function validateSocialUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined

  const trimmed = url.trim()
  if (!trimmed) return undefined

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return undefined
    if (parsed.username || parsed.password) return undefined

    const host = parsed.hostname.toLowerCase()
    const bareHost = host.startsWith('www.') ? host.slice(4) : host
    if (!SOCIAL_ALLOWLIST.includes(bareHost)) return undefined

    return trimmed
  } catch {
    return undefined
  }
}

export function validateUrl(url: unknown, defaultUrl: string): string {
  if (typeof url !== 'string') return defaultUrl

  const trimmed = url.trim()
  if (!trimmed) return defaultUrl

  if (trimmed.startsWith('/')) return trimmed

  try {
    const parsed = new URL(trimmed)
    if (SAFE_PROTOCOLS.includes(parsed.protocol)) return trimmed
  } catch {
    // not a valid URL, fall through to default
  }

  return defaultUrl
}

export function validateCmsContent<T>(
  section: HomepageSection | undefined | null,
  schema: z.ZodType<T>,
): T | null {
  if (!section?.content) return null

  const result = schema.safeParse(section.content)
  if (!result.success) {
    console.warn(
      `[CMS] Schema validation failed for section "${section.type}":`,
      result.error.message,
    )
    return null
  }

  return result.data as T
}
