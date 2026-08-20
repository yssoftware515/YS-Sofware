import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHero } from '@/components/shared/PageHero'

const locales = ['en', 'ar'] as const
const content = {
  en: { eyebrow: 'Docs', title: 'Documentation', subtitle: 'Everything you need to get started with YS products.', no_docs: 'No documentation available yet.', articles: 'articles', min_read: 'min read' },
  ar: { eyebrow: 'التوثيق', title: 'التوثيق', subtitle: 'كل ما تحتاجه للبدء مع منتجات YS.', no_docs: 'لا يوجد توثيق متاح حتى الآن.', articles: 'مقالة', min_read: 'دقيقة قراءة' },
}

interface DocArticle {
  id: string; slug: string; title_en: string; title_ar: string; reading_time_minutes: number | null
}
interface DocCategory {
  id: string; slug: string; title_en: string; title_ar: string
  articles: DocArticle[]
  children: { id: string; title_en: string; title_ar: string; articles: DocArticle[] }[]
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = content[locale as keyof typeof content] ?? content.en
  return buildMetadata({ locale, path: '/docs', title: t.title, description: t.subtitle })
}

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const t = content[locale as keyof typeof content] ?? content.en

  let categories: DocCategory[] = []
  try {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    const res = await fetch(`${API}/public/docs`, { headers: { 'Accept-Language': locale }, next: { revalidate: 60 } })
    const body = await res.json()
    if (body.success) categories = body.data
  } catch (err) { console.error('[public:docs] fetch failed:', err) }

  const isAr = locale === 'ar'

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <PageHero eyebrow={t.eyebrow} title={t.title} description={t.subtitle} maxWidth="56rem" />

      <section className="section-sm">
        <div className="container-site">
          {categories.length === 0 ? (
            <EmptyState message={t.no_docs} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {categories.map((category) => {
                const title = isAr ? category.title_ar : category.title_en
                const allArticles = [...category.articles, ...category.children.flatMap(c => c.articles)]

                if (allArticles.length === 0 && category.children.every(c => c.articles.length === 0)) return null

                return (
                  <div key={category.id} style={{ padding: '1.75rem', borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', marginBottom: '0.375rem' }}>{title}</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginBottom: '1.25rem' }}>
                      {allArticles.length} {t.articles}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {category.articles.map((article) => (
                        <Link key={article.id} href={`/${locale}/docs/${article.slug}`} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.625rem 0.75rem', borderRadius: 8, textDecoration: 'none',
                          fontSize: '0.875rem', color: 'var(--color-foreground)',
                        }} className="hover:bg-background-subtle">
                          <span>{isAr ? article.title_ar : article.title_en}</span>
                          {article.reading_time_minutes && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>
                              {article.reading_time_minutes} {t.min_read}
                            </span>
                          )}
                        </Link>
                      ))}

                      {category.children.map((child) => (
                        <div key={child.id} style={{ marginTop: '0.5rem' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', padding: '0.375rem 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isAr ? child.title_ar : child.title_en}
                          </p>
                          {child.articles.map((article) => (
                            <Link key={article.id} href={`/${locale}/docs/${article.slug}`} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '0.625rem 0.75rem 0.625rem 1.5rem', borderRadius: 8, textDecoration: 'none',
                              fontSize: '0.875rem', color: 'var(--color-foreground)',
                            }} className="hover:bg-background-subtle">
                              <span>{isAr ? article.title_ar : article.title_en}</span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
