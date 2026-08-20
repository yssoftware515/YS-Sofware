import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHero } from '@/components/shared/PageHero'
import type { Update } from '@/types'

const locales = ['en', 'ar'] as const
const content = {
  en: {
    eyebrow: 'Updates',
    title: 'Updates', subtitle: 'Latest news, announcements, and updates from YS Systems & Software.',
    types: { announcement: 'Announcement', blog: 'Blog', news: 'News', release: 'Release' },
    read_more: 'Read More',
  },
  ar: {
    eyebrow: 'المستجدات',
    title: 'المستجدات', subtitle: 'آخر الأخبار والإعلانات والمستجدات من YS Systems & Software.',
    types: { announcement: 'إعلان', blog: 'مدونة', news: 'أخبار', release: 'إصدار' },
    read_more: 'اقرأ المزيد',
  },
}

const typeColors: Record<string, string> = {
  announcement: 'var(--color-accent)',
  blog:         '#10B981',
  news:         '#F59E0B',
  release:      '#8B5CF6',
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = content[locale as keyof typeof content] ?? content.en
  return buildMetadata({ locale, path: '/updates', title: t.title, description: t.subtitle })
}

export default async function UpdatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const t = content[locale as keyof typeof content] ?? content.en

  let updates: Update[] = []
  try { updates = await api.updates(locale) } catch (err) { console.error('[public:updates] fetch failed:', err) }

  const featured  = updates.filter(u => u.is_featured)
  const remaining = updates.filter(u => !u.is_featured)

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      {/* Hero */}
      <PageHero eyebrow={t.eyebrow} title={t.title} description={t.subtitle} />

      <section className="section-sm">
        <div className="container-site">
          {updates.length === 0 ? (
            <EmptyState message={locale === 'ar' ? 'لا توجد مستجدات حتى الآن.' : 'No updates yet.'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Featured */}
              {featured.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: '1rem' }}>
                  {featured.map((update) => (
                    <UpdateCard key={update.id} update={update} t={t} featured />
                  ))}
                </div>
              )}

              {/* All updates */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--color-border)', borderRadius: '1rem', overflow: 'hidden' }}>
                {remaining.map((update) => (
                  <UpdateRow key={update.id} update={update} t={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function UpdateCard({ update, t, featured }: { update: Update; t: any; featured?: boolean }) {
  const color = typeColors[update.type] ?? 'var(--color-accent)'
  return (
    <div style={{
      padding: '1.75rem', borderRadius: '1rem', border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: 9999, backgroundColor: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t.types[update.type] ?? update.type}
        </span>
        {update.product && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{update.product.name}</span>
        )}
      </div>
      <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', lineHeight: 1.4 }}>{update.title}</h2>
      <p className="text-sm line-clamp-3" style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.7, flex: 1 }}>{update.content}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
          {new Date(update.published_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}

function UpdateRow({ update, t }: { update: Update; t: any }) {
  const color = typeColors[update.type] ?? 'var(--color-accent)'
  return (
    <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 9999, backgroundColor: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        {t.types[update.type] ?? update.type}
      </span>
      <span className="font-display font-semibold text-sm" style={{ color: 'var(--color-foreground)', flex: 1 }}>{update.title}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>
        {new Date(update.published_at).toLocaleDateString()}
      </span>
    </div>
  )
}
