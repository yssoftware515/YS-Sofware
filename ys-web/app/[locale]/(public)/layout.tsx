import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { api }    from '@/lib/api/client'
import { breadcrumbJsonLd, safeJsonLd } from '@/lib/seo'

const CookieConsent = dynamic(() => import('@/components/shared/CookieConsent').then(m => m.CookieConsent))
import type { PublicSettings, Menu } from '@/types'

const locales = ['en', 'ar'] as const
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ys-systems.com'

const breadcrumbLabels: Record<string, Record<string, string>> = {
  en: { '': 'Home', '/about': 'About', '/products': 'Products', '/services': 'Services', '/updates': 'Updates', '/changelog': 'Changelog', '/releases': 'Releases', '/docs': 'Documentation', '/roadmap': 'Roadmap', '/careers': 'Careers', '/contact': 'Contact', '/status': 'Status', '/privacy': 'Privacy Policy', '/terms': 'Terms of Service', '/faq': 'FAQ', '/security': 'Security', '/cookie-policy': 'Cookie Policy' },
  ar: { '': 'الرئيسية', '/about': 'عن المنصة', '/products': 'المنتجات', '/services': 'الخدمات', '/updates': 'المستجدات', '/changelog': 'سجل التغييرات', '/releases': 'الإصدارات', '/docs': 'التوثيق', '/roadmap': 'خارطة الطريق', '/careers': 'الوظائف', '/contact': 'اتصل بنا', '/status': 'حالة النظام', '/privacy': 'سياسة الخصوصية', '/terms': 'شروط الخدمة', '/faq': 'الأسئلة الشائعة', '/security': 'الأمان', '/cookie-policy': 'سياسة الكوكيز' },
}

function buildBreadcrumbs(pathname: string, locale: string) {
  const labels = breadcrumbLabels[locale] ?? breadcrumbLabels.en
  const parts = pathname.replace(/^\/+/g, '').split('/').filter(Boolean)
  const crumbs = [{ name: labels[''] ?? 'Home', item: '' }]
  let current = ''
  for (const part of parts) {
    current += `/${part}`
    const name = labels[current] ?? part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    crumbs.push({ name, item: current })
  }
  return crumbs
}

function organizationJsonLd(locale: string, settings?: PublicSettings) {
  const sameAs: string[] = []
  const s = settings?.social
  if (s?.github_url)   sameAs.push(s.github_url)
  if (s?.tiktok_url)   sameAs.push(s.tiktok_url)
  if (s?.x_url)        sameAs.push(s.x_url)
  if (s?.linkedin_url) sameAs.push(s.linkedin_url)
  if (sameAs.length === 0) {
    sameAs.push(
      'https://github.com/yehiahwary0-oss',
      'https://www.tiktok.com/@yahya.dev8',
    )
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings?.brand?.company_name ?? 'YS Systems & Software',
    url: `${APP_URL}/${locale}`,
    logo: `${APP_URL}/branding/logo/logo.webp`,
    sameAs,
  }
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!(locales as readonly string[]).includes(locale)) notFound()

  const [settingsResult, menusResult, productsResult] = await Promise.allSettled([
    api.settings(locale),
    api.menus(locale),
    api.products(locale),
  ])

  let settings: PublicSettings | undefined
  if (settingsResult.status === 'fulfilled') {
    settings = settingsResult.value
  }

  let menus: Record<string, Menu> | undefined
  if (menusResult.status === 'fulfilled') {
    const raw = menusResult.value
    const arr = Array.isArray(raw) ? raw : []
    menus = {}
    for (const m of arr) {
      if (m.location) menus[m.location] = m
    }
  }

  const products = productsResult.status === 'fulfilled' ? productsResult.value : []

  const h = await headers()
  const pathname = h.get('x-pathname') ?? h.get('next-url') ?? `/${locale}`
  const breadcrumbs = buildBreadcrumbs(pathname.replace(`/${locale}`, ''), locale)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd(locale, settings)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd(locale, breadcrumbs) }}
      />
      <a href="#main-content" className="skip-link">
        {locale === 'ar' ? 'تخطى إلى المحتوى' : 'Skip to content'}
      </a>
      <Header locale={locale} menu={menus?.header} />
      <main id="main-content" style={{ flex: 1, paddingTop: '4rem' }}>
        {children}
      </main>
      <CookieConsent locale={locale} />
      <Footer locale={locale} settings={settings} menus={menus} products={products} />
    </div>
  )
}
