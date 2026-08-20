import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { LocaleSync } from '@/components/shared/LocaleSync'

const locales = ['en', 'ar'] as const
type Locale   = typeof locales[number]

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ys-systems.com'

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

  return {
    title: {
      default:  isAr ? 'YS Systems & Software' : 'YS Systems & Software',
      template: '%s | YS Systems & Software',
    },
    description: isAr
      ? 'منصات SaaS وحلول أعمال حديثة وآمنة'
      : 'Scalable, secure, and modern SaaS platforms.',
    metadataBase: new URL(APP_URL),
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
