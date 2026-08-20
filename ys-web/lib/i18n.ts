export const locales       = ['en', 'ar'] as const
export const defaultLocale = 'en' as const
export type Locale         = typeof locales[number]

export function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale)
}

/** t() helper — pass messages object and key path */
export function t(messages: Record<string, unknown>, key: string): string {
  const parts = key.split('.')
  let current: unknown = messages
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return key
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : key
}
