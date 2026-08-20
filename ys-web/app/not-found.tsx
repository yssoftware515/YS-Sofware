import Link from 'next/link'
import { headers } from 'next/headers'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const locales = ['en', 'ar'] as const
const defaultLocale = 'en'

const content = {
  en: {
    title: 'Page not found',
    body: "The page you're looking for doesn't exist or has been moved.",
    home: '← Back to Home',
    products: 'Browse Products',
  },
  ar: {
    title: 'الصفحة غير موجودة',
    body: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
    home: '→ العودة للرئيسية',
    products: 'تصفح المنتجات',
  },
}

export default async function NotFound() {
  const headersList = await headers()
  // The URL itself always carries a locale prefix by the time a 404 is
  // reached — middleware.ts redirects any locale-less path to /en/... —
  // but we don't have route params here, so Accept-Language is the most
  // reliable signal not-found.tsx actually has access to.
  const acceptLang = headersList.get('accept-language') ?? ''
  const locale = locales.find(l => acceptLang.startsWith(l)) ?? defaultLocale
  const t = content[locale]

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      <Header locale={locale} />

      <main style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', paddingTop: '7rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '32rem' }}>
          <div className="font-display font-bold" style={{ fontSize: '8rem', lineHeight: 1, color: 'var(--color-background-muted)', marginBottom: '1.5rem' }}>
            404
          </div>
          <h1 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '1rem' }}>
            {t.title}
          </h1>
          <p style={{ color: 'var(--color-foreground-muted)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            {t.body}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/${locale}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.875rem 2rem', borderRadius: 8, fontSize: '0.9375rem', fontWeight: 500,
              backgroundColor: 'var(--color-accent)', color: '#fff', textDecoration: 'none',
            }}>
              {t.home}
            </Link>
            <Link href={`/${locale}/products`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.875rem 2rem', borderRadius: 8, fontSize: '0.9375rem', fontWeight: 500,
              border: '1px solid var(--color-border)', color: 'var(--color-foreground)', textDecoration: 'none',
            }}>
              {t.products}
            </Link>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
