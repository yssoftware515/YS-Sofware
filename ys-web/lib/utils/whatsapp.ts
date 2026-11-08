/**
 * WhatsApp link helpers — single source of truth used by the hero CTA,
 * footer, contact page and admin panel. Numbers are stored in international
 * digits-only format (e.g. '201000703581') either in admin settings or as
 * code defaults; wa.me links must be digits-only as well.
 */

/** New company WhatsApp number (international, digits-only). */
export const WHATSAPP_NUMBER_DEFAULT = '201000703581'

/** Human-readable display version. */
export const WHATSAPP_DISPLAY_DEFAULT = '+20 100 070 3581'

export function normalizeWhatsAppNumber(number: string | null | undefined): string | null {
  if (typeof number !== 'string') return null
  const digits = number.replace(/[^0-9]/g, '')
  return digits ? digits : null
}

export function buildWhatsAppHref(
  number: string | null | undefined,
  message?: string,
): string | null {
  const digits = normalizeWhatsAppNumber(number) ?? WHATSAPP_NUMBER_DEFAULT
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
