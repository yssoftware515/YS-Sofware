import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { LocaleSync } from '@/components/shared/LocaleSync'
import { resolveAppUrl } from '@/lib/seo'

const locales = ['en', 'ar'] as const
type Locale   = typeof locales[number]

function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale)
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === 'ar'

  // Resolved from NEXT_PUBLIC_APP_URL when configured, otherwise from the
  // host the request arrived on. Next.js composes every relative URL-based
  // metadata field (Open Graph image, canonical, hreflang) against this, so
  // a link preview always points at the domain the visitor is actually on.
  const metadataBase = new URL(await resolveAppUrl())

  return {
    title: {
      default:  isAr ? 'YS Systems & Software' : 'YS Systems & Software',
      template: '%s | YS Systems & Software',
    },
    description: isAr
      ? 'منصات SaaS وحلول أعمال حديثة وآمنة'
      : 'Scalable, secure, and modern SaaS platforms.',
    metadataBase,
    icons: {
      icon: '/branding/favicon/favicon-32x32.png',
      apple: '/branding/apple/apple-touch-icon.png',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  // Nonce emitted by proxy.ts — required by the inline theme bootstrap
  // script inside ThemeProvider (script-src has no 'unsafe-inline').
  const nonce = (await headers()).get('x-nonce')

  return (
    <ThemeProvider nonce={nonce ?? undefined}>
      <LocaleSync locale={locale} />
      {children}
    </ThemeProvider>
  )
}
