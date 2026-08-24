import type { Metadata } from 'next'
import { Suspense } from 'react'
import { api }              from '@/lib/api/client'
import { buildMetadata, safeJsonLd } from '@/lib/seo'
import { HeroSection }      from '@/components/sections/HeroSection'
import { CapabilitiesSection } from '@/components/sections/CapabilitiesSection'
import { ProductsSection }  from '@/components/sections/ProductsSection'
import { ServicesSection }  from '@/components/sections/ServicesSection'
import { HowWeWorkSection } from '@/components/sections/HowWeWorkSection'
import { CTASection }       from '@/components/sections/CTASection'
import type { Product, Service, PublicSettings, HomepageSection } from '@/types'

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

  return buildMetadata({
    locale,
    path: '',
    title: isAr ? 'YS Systems & Software — شركة تقنيات رقمية' : 'YS Systems & Software — Digital Technology Company',
    description: isAr
      ? 'منتجات برمجية، منصات مخصصة، حلول ذكاء اصطناعي وأتمتة \u2014 نبني التقنيات التي تشغل الأعمال وتنمّيها.'
      : 'Software products, custom platforms, AI solutions, and automation \u2014 we build the technology that runs and grows your business.',
  })
}

async function ProductsData({ locale }: { locale: string }) {
  const products = await api.products(locale).catch(() => [] as Product[])
  return <ProductsSection locale={locale} products={products} />
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

  const [productsResult, settingsResult, sectionsResult] = await Promise.allSettled([
    api.products(locale),
    api.settings(locale),
    api.homepageSections(locale).catch(() => [] as HomepageSection[]),
  ])

  const products: Product[] =
    productsResult.status === 'fulfilled' ? productsResult.value : []

  const settings: PublicSettings | undefined =
    settingsResult.status === 'fulfilled' ? settingsResult.value : undefined

  const sections: HomepageSection[] =
    sectionsResult.status === 'fulfilled' ? sectionsResult.value : []

  const heroSection      = sections.find(s => s.type === 'hero')
  const whyChoose        = sections.find(s => s.type === 'why_choose')
  const productsSec      = sections.find(s => s.type === 'products')
  const servicesSec      = sections.find(s => s.type === 'services')
  const processSec       = sections.find(s => s.type === 'process')
  const ctaSection       = sections.find(s => s.type === 'cta')

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ys-systems.com'
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'YS Systems & Software',
    url: `${APP_URL}/${locale}`,
    logo: `${APP_URL}/branding/logo/logo.webp`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }}
      />
      <HeroSection
        locale={locale}
        settings={settings}
        cmsSection={heroSection}
        whyChooseSection={whyChoose}
        products={products}
      />
      <Suspense fallback={<SectionSkeleton />}>
        <CapabilitiesSection locale={locale} cmsSection={sections.find(s => s.type === 'capabilities')} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ProductsData locale={locale} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <ServicesData locale={locale} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <HowWeWorkSection locale={locale} cmsSection={processSec} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <CTASection locale={locale} cmsSection={ctaSection} settings={settings} />
      </Suspense>
    </>
  )
}
