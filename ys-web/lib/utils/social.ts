const SOCIAL_ALLOWLIST = [
  'github.com',
  'instagram.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
]

/**
 * Social links rendered into <a href> in the footer.
 *
 * https-only and the host must be one of the allowlisted social platforms
 * (www. prefix tolerated). Rejects javascript:, data:, unknown hosts, and
 * anything with embedded credentials.
 */
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
