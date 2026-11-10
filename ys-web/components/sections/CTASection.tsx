import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import type { PublicSettings } from '@/types'
import {
  buildWhatsAppHref,
  normalizeWhatsAppNumber,
  WHATSAPP_DISPLAY_DEFAULT,
  WHATSAPP_NUMBER_DEFAULT,
} from '@/lib/utils/whatsapp'

interface CTASectionProps {
  locale: string
  settings?: PublicSettings
}

const fallback = {
  en: {
    heading: 'Have an idea? Let\u2019s build it.',
    body: 'Tell us what you need \u2014 a website, a store, a platform, or a complete business system. We\u2019ll help you scope it and give you a clear path forward.',
    primary: 'Start a Project',
    primary_url: '/contact',
    secondary: 'Explore Our Services',
    secondary_url: '/services',
    whatsapp_label: 'Chat on WhatsApp',
  },
  ar: {
    heading: 'لديك فكرة؟ لنبنها معاً.',
    body: 'أخبرنا بما تحتاجه \u2014 موقعاً أو متجراً أو منصة أو نظاماً متكاملاً لعملك. سنساعدك في تحديد النطاق ونمنحك مساراً واضحاً للأمام.',
    primary: 'ابدأ مشروعك',
    primary_url: '/contact',
    secondary: 'اكتشف خدماتنا',
    secondary_url: '/services',
    whatsapp_label: 'تواصل عبر واتساب',
  },
}

export function CTASection({ locale, settings }: CTASectionProps) {
  const isAr = locale === 'ar'
  const f = fallback[locale as keyof typeof fallback] ?? fallback.en

  const heading = f.heading
  const body    = f.body

  const ptext   = f.primary
  const stext   = f.secondary
  const purl    = f.primary_url
  const surl    = f.secondary_url

  // WhatsApp link built ONLY from the shared helper — settings number first,
  // code default as the guarded fallback, digits normalized via helper.
  const whatsappHref = buildWhatsAppHref(
    normalizeWhatsAppNumber(settings?.contacts?.whatsapp_number) ?? WHATSAPP_NUMBER_DEFAULT,
    isAr
      ? 'مرحباً، أريد مناقشة مشروع مع YS Systems.'
      : "Hi, I'd like to discuss a project with YS Systems.",
  )
  const whatsappDisplay = settings?.contacts?.whatsapp_display ?? WHATSAPP_DISPLAY_DEFAULT

  return (
    <section className="section-sm section-divider-top" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="container-site" style={{ textAlign: 'center', maxWidth: '42rem', margin: '0 auto' }}>
        <h2 className="font-display font-semibold text-fluid-xl tracking-tight" style={{ color: 'var(--color-foreground)', marginBottom: '1rem' }}>
          {heading}
        </h2>
        <p style={{ color: 'var(--color-foreground-muted)', fontSize: '1.0625rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          {body}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={`/${locale}${purl}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.875rem 2rem', borderRadius: '0.5rem', fontSize: '0.9375rem', fontWeight: 600,
            backgroundColor: 'var(--color-accent)', color: '#fff', textDecoration: 'none',
            transition: 'all 150ms',
          }}>
            {ptext}
          </Link>
          <Link href={`/${locale}${surl}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.875rem 2rem', borderRadius: '0.5rem', fontSize: '0.9375rem', fontWeight: 500,
            border: '1px solid var(--color-border)', color: 'var(--color-foreground)',
            backgroundColor: 'var(--color-background-subtle)', textDecoration: 'none',
            transition: 'all 150ms',
          }}>
            {stext}
          </Link>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.875rem 2rem', borderRadius: '0.5rem', fontSize: '0.9375rem', fontWeight: 600,
                backgroundColor: '#25D366', color: '#fff', textDecoration: 'none',
                transition: 'all 150ms',
              }}
            >
              <MessageCircle size={18} aria-hidden="true" />
              {whatsappDisplay}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}