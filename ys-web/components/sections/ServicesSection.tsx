import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { AnimatedBox } from '@/components/shared/AnimatedBox'
import type { HomepageSection, Service } from '@/types'

interface ServicesSectionProps {
  locale: string
  services: Service[]
  cmsSection?: HomepageSection
}

export function ServicesSection({ locale, services, cmsSection }: ServicesSectionProps) {
  const isAr = locale === 'ar'
  const Arrow = isAr ? ArrowLeft : ArrowRight

  const title = cmsSection?.title ?? (isAr ? 'خدماتنا' : 'Our Services')
  const subtitle = cmsSection?.subtitle ?? (isAr
    ? 'منتجات جاهزة غير كافية؟ نبني لك ما يناسبك بالضبط.'
    : 'Off-the-shelf products aren\u2019t enough \u2014 we build exactly what your business needs.')

  const featured = services.filter(s => s.is_featured).slice(0, 3)
  const shown = featured.length > 0 ? featured : services.slice(0, 3)

  if (shown.length === 0) return null

  const priced = (s: Service) => {
    if (s.pricing_type === 'custom_quote' || !s.starting_price) {
      return isAr ? 'عرض سعر مخصص' : 'Custom Quote'
    }
    return `${isAr ? 'تبدأ من' : 'Starting at'} ${s.starting_price} ${s.currency ?? ''}`.trim()
  }

  return (
    <section className="section-sm section-divider-top" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="container-site">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '36rem' }}>
            <h2 className="font-display font-semibold text-fluid-xl tracking-tight" style={{ color: 'var(--color-foreground)', marginBottom: '0.7rem' }}>
              {title}
            </h2>
            <p style={{ color: 'var(--color-foreground-muted)', fontSize: '1.0625rem', lineHeight: 1.7 }}>{subtitle}</p>
          </div>
          <Link href={`/${locale}/services`} style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            {isAr ? 'جميع الخدمات' : 'All services'} <Arrow size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {shown.map((service, i) => (
            <AnimatedBox
              key={service.id}
              whileInView
              delay={i * 0.08}
              y={14}
              className="card-hover p-6 rounded-2xl flex flex-col"
              style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', textDecoration: 'none' }}
            >
              <Link href={`/${locale}/services/${service.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                {service.category && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                    {service.category}
                  </span>
                )}
                <h3 className="font-display font-semibold text-[1.0625rem]" style={{ color: 'var(--color-foreground)', marginBottom: '0.5rem' }}>
                  {service.name}
                </h3>
                <p className="text-[0.9375rem] leading-relaxed line-clamp-3" style={{ color: 'var(--color-foreground-muted)', marginBottom: '1.5rem', flex: 1 }}>
                  {service.short_desc}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-accent)' }}>{priced(service)}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-foreground-muted)' }}>
                    {isAr ? 'طلب الخدمة' : 'Request'} <Arrow size={14} />
                  </span>
                </div>
              </Link>
            </AnimatedBox>
          ))}
        </div>
      </div>
    </section>
  )
}