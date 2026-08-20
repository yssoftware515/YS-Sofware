import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHero } from '@/components/shared/PageHero'
import type { Product } from '@/types'

const locales = ['en', 'ar'] as const
const content = {
  en: { eyebrow: 'Releases', title: 'Release Center', subtitle: 'Latest versions and release notes for all YS products.' },
  ar: { eyebrow: 'الإصدارات', title: 'مركز الإصدارات', subtitle: 'أحدث الإصدارات وملاحظات الإصدار لجميع منتجات YS.' },
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = content[locale as keyof typeof content] ?? content.en
  return buildMetadata({ locale, path: '/releases', title: t.title, description: t.subtitle })
}

export default async function ReleasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const t = content[locale as keyof typeof content] ?? content.en

  let products: Product[] = []
  try { products = await api.products(locale) } catch (err) { console.error('[public:releases] fetch failed:', err) }

  const withVersions = products.filter(p => p.current_version)

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <PageHero eyebrow={t.eyebrow} title={t.title} description={t.subtitle} />

      <section className="section-sm">
        <div className="container-site">
          {withVersions.length === 0 ? (
            <EmptyState message={locale === 'ar' ? 'لا توجد إصدارات حتى الآن.' : 'No releases yet.'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--color-border)', borderRadius: '1rem', overflow: 'hidden' }}>
              {withVersions.map((product) => (
                <a key={product.id} href={`/${locale}/products/${product.slug}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-surface)', textDecoration: 'none',
                }} className="hover:bg-background-subtle">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="font-display font-bold" style={{ fontSize: '0.875rem', color: 'var(--color-accent)' }}>{product.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold" style={{ color: 'var(--color-foreground)', fontSize: '0.9375rem' }}>{product.name}</h3>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>{product.short_desc}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-accent)', flexShrink: 0 }}>
                    v{product.current_version}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
