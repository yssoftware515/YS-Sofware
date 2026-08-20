import type { Metadata } from 'next'
import { api }              from '@/lib/api/client'
import { buildMetadata, safeJsonLd } from '@/lib/seo'
import { HeroSection }      from '@/components/sections/HeroSection'
import { CapabilitiesSection } from '@/components/sections/CapabilitiesSection'
import { ProductsSection }  from '@/components/sections/ProductsSection'
import { ServicesSection }  from '@/components/sections/ServicesSection'
import { HowWeWorkSection } from '@/components/sections/HowWeWorkSection'
import { CTASection }       from '@/components/sections/CTASection'
import type { Product, Service, PublicSettings, HomepageSection } from '@/types'

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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const [productsResult, settingsResult, sectionsResult, servicesResult] = await Promise.allSettled([
    api.products(locale),
    api.settings(locale),
    api.homepageSections(locale).catch(() => [] as HomepageSection[]),
    api.services(locale).catch(() => [] as Service[]),
  ])

  const products: Product[] =
    productsResult.status === 'fulfilled' ? productsResult.value : []

  const settings: PublicSettings | undefined =
    settingsResult.status === 'fulfilled' ? settingsResult.value : undefined

  const sections: HomepageSection[] =
    sectionsResult.status === 'fulfilled' ? sectionsResult.value : []

  const services: Service[] =
    servicesResult.status === 'fulfilled' ? servicesResult.value : []

  const heroSection      = sections.find(s => s.type === 'hero')
  const whyChoose        = sections.find(s => s.type === 'why_choose')
  const productsSec      = sections.find(s => s.type === 'products')
  const servicesSec      = sections.find(s => s.type === 'services')
  const processSec       = sections.find(s => s.type === 'process')
  const ctaSection       = sections.find(s => s.type === 'cta')

  // Factual organization data only — no invented claims, social links,
  // dates, or contact details. Used for Google's organization markup.
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
      {/*
        WhyChooseSection is now MERGED into HeroSection as a bottom-docked
        features bar. This ensures the entire hero — text, cards, and features —
        is visible above the fold on desktop without scrolling.

        The why_choose CMS section is passed to HeroSection so CMS-driven
        feature items can still be used when configured.
      */}
      <HeroSection
        locale={locale}
        settings={settings}
        cmsSection={heroSection}
        whyChooseSection={whyChoose}
        products={products}
      />
      <CapabilitiesSection locale={locale} cmsSection={sections.find(s => s.type === 'capabilities')} />
      <ProductsSection locale={locale} products={products} cmsSection={productsSec} />
      <ServicesSection locale={locale} services={services} cmsSection={servicesSec} />
      {/* WhyChooseSection REMOVED — now lives inside HeroSection */}
      <HowWeWorkSection locale={locale} cmsSection={processSec} />
      <CTASection locale={locale} cmsSection={ctaSection} settings={settings} />
    </>
  )
}
