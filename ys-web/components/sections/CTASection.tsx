import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import type { HomepageSection, PublicSettings } from '@/types'
import { ctaContentSchema, type CtaContent } from '@/lib/cms/schemas'
import { validateCmsContent, validateUrl } from '@/lib/cms/validate'

interface CTASectionProps {
  locale: string
  cmsSection?: HomepageSection
  settings?: PublicSettings
}

const fallback = {
  en: {
    heading: 'Have an idea? Let\u2019s build it.',
    body: 'Tell us what you need \u2014 a product, a custom platform, or a complete system. We\u2019ll help you scope it and give you a clear path forward.',
    primary: 'Start a Project',
    primary_url: '/contact',
    secondary: 'Browse Products',
    secondary_url: '/products',
    whatsapp_label: 'Chat on WhatsApp',
  },
  ar: {
    heading: 'لديك فكرة؟ لنبنها معاً.',
    body: 'أخبرنا بما تحتاجه \u2014 منتجاً أو منصة مخصصة أو نظاماً متكاملاً. سنساعدك في تحديد النطاق ونمنحك مساراً واضحاً للأمام.',
    primary: 'ابدأ مشروعك',
    primary_url: '/contact',
    secondary: 'استعرض المنتجات',
    secondary_url: '/products',
    whatsapp_label: 'تواصل عبر واتساب',
  },
}

export function CTASection({ locale, cmsSection, settings }: CTASectionProps) {
  const isAr = locale === 'ar'
  const f = fallback[locale as keyof typeof fallback] ?? fallback.en

  const heading = cmsSection?.title ?? f.heading
  const body    = cmsSection?.subtitle ?? f.body

  const content = validateCmsContent(cmsSection, ctaContentSchema)
  const ptext   = (isAr ? content?.primary_text_ar : content?.primary_text_en) ?? f.primary
  const stext   = (isAr ? content?.secondary_text_ar : content?.secondary_text_en) ?? f.secondary
  const purl    = validateUrl(content?.primary_url, f.primary_url)
  const surl    = validateUrl(content?.secondary_url, f.secondary_url)

  const whatsappNumber = settings?.contacts?.whatsapp_number
  const whatsappDisplay = settings?.contacts?.whatsapp_display ?? (isAr ? 'واتساب' : 'WhatsApp')

  // WhatsApp link built ONLY from admin-managed settings — never hardcoded.
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}${isAr ? '?text=' + encodeURIComponent('مرحباً، أريد مناقشة مشروع مع YS Systems.') : '?text=' + encodeURIComponent("Hi, I'd like to discuss a project with YS Systems.")}`
    : null

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