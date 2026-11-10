import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { api }    from '@/lib/api/client'
import { breadcrumbJsonLd, safeJsonLd } from '@/lib/seo'

const CookieConsent = dynamic(() => import('@/components/shared/CookieConsent').then(m => m.CookieConsent))
import type { PublicSettings } from '@/types'

const locales = ['en', 'ar'] as const
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ys-systems.com'

const breadcrumbLabels: Record<string, Record<string, string>> = {
  en: { '': 'Home', '/about': 'About', '/services': 'Services', '/contact': 'Contact', '/privacy': 'Privacy Policy', '/terms': 'Terms of Service', '/faq': 'FAQ', '/security': 'Security', '/cookie-policy': 'Cookie Policy' },
  ar: { '': 'الرئيسية', '/about': 'عن المنصة', '/services': 'الخدمات', '/contact': 'اتصل بنا', '/privacy': 'سياسة الخصوصية', '/terms': 'شروط الخدمة', '/faq': 'الأسئلة الشائعة', '/security': 'الأمان', '/cookie-policy': 'سياسة الكوكيز' },
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
  if (s?.github_url)    sameAs.push(s.github_url)
  if (s?.tiktok_url)    sameAs.push(s.tiktok_url)
  if (s?.instagram_url) sameAs.push(s.instagram_url)
  if (s?.x_url)         sameAs.push(s.x_url)
  if (s?.linkedin_url)  sameAs.push(s.linkedin_url)
  if (sameAs.length === 0) {
    sameAs.push(
      'https://github.com/yehiahwary0-oss',
      'https://www.instagram.com/ys.software',
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

  const settingsResult = await api.settings(locale).catch(() => undefined)
  const settings: PublicSettings | undefined = settingsResult

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
        dangerouslySetInnerHTML={{ __html: await breadcrumbJsonLd(locale, breadcrumbs) }}
      />
      <a href="#main-content" className="skip-link">
        {locale === 'ar' ? 'تخطى إلى المحتوى' : 'Skip to content'}
      </a>
      <Header locale={locale} />
      <main id="main-content" style={{ flex: 1, paddingTop: '4rem' }}>
        {children}
      </main>
      <CookieConsent locale={locale} />
      <Footer locale={locale} settings={settings} />
    </div>
  )
}
