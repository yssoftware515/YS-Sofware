import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHero } from '@/components/shared/PageHero'
import type { RoadmapItem } from '@/types'

const locales = ['en', 'ar'] as const
const content = {
  en: {
    eyebrow: 'Roadmap',
    title: 'Roadmap', subtitle: "Where we're heading — our public roadmap of planned features and improvements.",
    statuses: { planned: 'Planned', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' },
    priorities: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' },
    target: 'Target', quarter: 'Quarter', version: 'Version',
  },
  ar: {
    eyebrow: 'خارطة الطريق',
    title: 'خارطة الطريق', subtitle: 'إلى أين نتجه — خارطة الطريق العامة للميزات والتحسينات المخططة.',
    statuses: { planned: 'مخطط', in_progress: 'قيد التنفيذ', completed: 'مكتمل', cancelled: 'ملغى' },
    priorities: { low: 'منخفض', medium: 'متوسط', high: 'عالٍ', critical: 'حرج' },
    target: 'الهدف', quarter: 'الربع', version: 'الإصدار',
  },
}

const statusStyles: Record<string, { bg: string; color: string; dot: string }> = {
  planned:     { bg: 'var(--color-background-muted)', color: 'var(--color-foreground-muted)', dot: '#71717A' },
  in_progress: { bg: 'rgba(10,79,231,0.1)',          color: 'var(--color-accent)',           dot: 'var(--color-accent)' },
  completed:   { bg: 'rgba(16,185,129,0.1)',           color: '#10B981',                       dot: '#10B981' },
  cancelled:   { bg: 'rgba(239,68,68,0.1)',            color: '#EF4444',                       dot: '#EF4444' },
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = content[locale as keyof typeof content] ?? content.en
  return buildMetadata({ locale, path: '/roadmap', title: t.title, description: t.subtitle })
}

export default async function RoadmapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const t = content[locale as keyof typeof content] ?? content.en

  let items: RoadmapItem[] = []
  try { items = await api.roadmap(locale) } catch (err) { console.error('[public:roadmap] fetch failed:', err) }

  const grouped = {
    in_progress: items.filter(i => i.status === 'in_progress'),
    planned:     items.filter(i => i.status === 'planned'),
    completed:   items.filter(i => i.status === 'completed'),
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <PageHero eyebrow={t.eyebrow} title={t.title} description={t.subtitle} />

      <section className="section-sm">
        <div className="container-site">
          {items.length === 0 ? (
            <EmptyState message={locale === 'ar' ? 'لا توجد عناصر في خارطة الطريق حتى الآن.' : 'No roadmap items yet.'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {Object.entries(grouped).map(([status, statusItems]) => {
                if (!statusItems.length) return null
                const style = statusStyles[status] ?? statusStyles.planned
                const label = t.statuses[status as keyof typeof t.statuses]

                return (
                  <div key={status}>
                    {/* Status header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: style.dot, flexShrink: 0 }} />
                      <h2 className="font-display font-semibold" style={{ color: 'var(--color-foreground)', fontSize: '1.125rem' }}>{label}</h2>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', padding: '0.125rem 0.625rem', backgroundColor: 'var(--color-background-muted)', borderRadius: 9999 }}>
                        {statusItems.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {statusItems.map((item) => (
                        <div key={item.id} style={{ padding: '1.25rem', borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                            <h3 className="font-display font-semibold" style={{ fontSize: '0.9375rem', color: 'var(--color-foreground)', lineHeight: 1.4 }}>{item.title}</h3>
                            <span style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: 9999, backgroundColor: style.bg, color: style.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {item.priority}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-sm line-clamp-2" style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.6 }}>{item.description}</p>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                            {item.target_quarter && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>📅 {item.target_quarter}</span>
                            )}
                            {item.target_version && (
                              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-foreground-muted)' }}>v{item.target_version}</span>
                            )}
                            {item.product && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginLeft: 'auto' }}>{item.product.name}</span>
                            )}
                          </div>
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
