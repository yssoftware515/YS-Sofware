import type { Metadata } from 'next'
import { Suspense } from 'react'
import { api }              from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { HeroSection }      from '@/components/sections/HeroSection'
import { CapabilitiesSection } from '@/components/sections/CapabilitiesSection'
import { ServicesSection }  from '@/components/sections/ServicesSection'
import { HowWeWorkSection } from '@/components/sections/HowWeWorkSection'
import { CTASection }       from '@/components/sections/CTASection'
import type { Service, PublicSettings } from '@/types'

function SectionSkeleton() {
  return (
    <div className="w-full py-20" style={{ background: 'var(--color-background)' }}>
      <div className="max-w-site mx-auto px-6">
        <div className="h-8 w-48 rounded-lg animate-shimmer mb-4" style={{ background: 'var(--color-background-muted)' }} />
        <div className="h-4 w-72 rounded animate-shimmer" style={{ background: 'var(--color-background-muted)' }} />
      </div>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'

  return await buildMetadata({
    locale,
    path: '',
    title: isAr ? 'YS Systems & Software — شركة منتجات رقمية متكاملة' : 'YS Systems & Software — Integrated Digital Products Company',
    description: isAr
      ? 'شركة منتجات رقمية متكاملة: مواقع ومتاجر ومنصات وتطبيقات، أنظمة شركات و ERP، تصميم UI/UX، وحلول ذكاء اصطناعي وأتمتة — مع استشارات مجانية تساعدك على بناء أفضل نسخة من مشروعك.'
      : 'An integrated digital products company: websites, e-commerce, platforms and apps, business systems & ERP, UI/UX design, plus AI and automation — with free consultations that help you build the best version of your project.',
  })
}

async function ServicesData({ locale }: { locale: string }) {
  const services = await api.services(locale).catch(() => [] as Service[])
  return <ServicesSection locale={locale} services={services} />
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const settings = await api.settings(locale).catch(() => undefined)

  return (
    <>
      <HeroSection
        locale={locale}
        settings={settings}
      />
      <Suspense fallback={<SectionSkeleton />}>
        <CapabilitiesSection locale={locale} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ServicesData locale={locale} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <HowWeWorkSection locale={locale} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <CTASection locale={locale} settings={settings} />
      </Suspense>
    </>
  )
}
