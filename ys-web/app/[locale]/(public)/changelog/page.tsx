import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { PageHero } from '@/components/shared/PageHero'
import type { Product } from '@/types'

const locales = ['en', 'ar'] as const
const content = {
  en: { eyebrow: 'Changelog', title: 'Changelog', subtitle: 'Track all improvements, fixes, and changes across our products.', select_product: 'Select a product to view its changelog' },
  ar: { eyebrow: 'سجل التغييرات', title: 'سجل التغييرات', subtitle: 'تتبع جميع التحسينات والإصلاحات والتغييرات في منتجاتنا.', select_product: 'اختر منتجاً لعرض سجل التغييرات' },
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = content[locale as keyof typeof content] ?? content.en
  return buildMetadata({ locale, path: '/changelog', title: t.title, description: t.subtitle })
}

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const t = content[locale as keyof typeof content] ?? content.en

  let products: Product[] = []
  try { products = await api.products(locale) } catch (err) { console.error('[public:changelog] fetch failed:', err) }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <PageHero eyebrow={t.eyebrow} title={t.title} description={t.subtitle} />

      <section className="section-sm">
        <div className="container-site">
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-foreground-muted)' }}>
              {locale === 'ar' ? 'لا توجد منتجات حتى الآن.' : 'No products available yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product) => (
                <a key={product.id} href={`/${locale}/products/${product.slug}`} style={{
                  display: 'block', padding: '1.5rem', borderRadius: '1rem',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                  textDecoration: 'none', transition: 'all 200ms',
                }} className="hover:border-border-strong hover:shadow-md">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="font-display font-bold" style={{ fontSize: '0.875rem', color: 'var(--color-accent)' }}>{product.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <h2 className="font-display font-semibold" style={{ color: 'var(--color-foreground)', fontSize: '0.9375rem' }}>{product.name}</h2>
                  </div>
                  {product.current_version && (
                    <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--color-foreground-muted)' }}>
                      Latest: v{product.current_version}
                    </span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
