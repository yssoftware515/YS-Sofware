import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { PageHero } from '@/components/shared/PageHero'

const locales = ['en', 'ar'] as const
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface HealthData {
  status: 'ok' | 'degraded'
  checks: Record<string, 'ok' | 'error'>
}

// ── STATUS ───────────────────────────────────────────────────────────
// Sprint 3: the old page fabricated "all systems operational" for
// services we don't actually monitor (Storage, Email, Website).
// The only truthful source of live status is the backend /health
// endpoint, which reports the infrastructure we CAN verify.

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    locale, path: '/status',
    title: locale === 'ar' ? 'حالة النظام' : 'System Status',
    description: locale === 'ar' ? 'حالة البنية التحتية لأنظمة YS Systems & Software' : 'Live infrastructure status of YS Systems & Software',
  })
}

export default async function StatusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()

  const isAr = locale === 'ar'

  let health: HealthData | null = null
  let checkedAt: string | null = null
  try {
    const res = await fetch(`${API_BASE}/health`, { next: { revalidate: 60 } })
    if (res.ok) {
      const json = await res.json()
      health = json.data as HealthData
      checkedAt = new Date().toISOString()
    }
  } catch (err) {
    console.error('[public:status] health fetch failed:', err)
  }

  const componentLabels: Record<string, { en: string; ar: string }> = {
    database: { en: 'Database', ar: 'قاعدة البيانات' },
    cache: { en: 'Cache', ar: 'ذاكرة التخزين المؤقت' },
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <PageHero
        eyebrow={isAr ? 'الحالة' : 'Status'}
        title={isAr ? 'حالة النظام' : 'System Status'}
        maxWidth="48rem"
        actions={
          health ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 9999, backgroundColor: health.status === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: health.status === 'ok' ? '#10B981' : '#F59E0B', fontSize: '0.875rem', fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: health.status === 'ok' ? '#10B981' : '#F59E0B' }} />
              {health.status === 'ok'
                ? (isAr ? 'جميع الأنظمة الأساسية تعمل' : 'All core systems operational')
                : (isAr ? 'يوجد تدهور جزئي في النظام' : 'Partial system degradation')}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 9999, backgroundColor: 'rgba(100,116,139,0.1)', color: 'var(--color-foreground-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-foreground-muted)' }} />
              {isAr ? 'تعذر الاتصال بخدمة الفحص' : 'Status check unavailable'}
            </div>
          )
        }
      />

      <section className="section-sm">
        <div className="container-site" style={{ maxWidth: '48rem' }}>
          {health ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(health.checks).map(([key, status]) => {
                  const label = componentLabels[key] ?? { en: key, ar: key }
                  const ok = status === 'ok'
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.125rem 1.5rem', borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-foreground)' }}>
                        {isAr ? label.ar : label.en}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ok ? '#10B981' : '#EF4444', fontWeight: 500 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: ok ? '#10B981' : '#EF4444' }} />
                        {ok ? (isAr ? 'يعمل' : 'Operational') : (isAr ? 'معطل' : 'Down')}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p style={{ marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', textAlign: 'center' }}>
                {isAr
                  ? `آخر تحديث: ${checkedAt ? new Date(checkedAt).toLocaleString('ar') : '—'}`
                  : `Last checked: ${checkedAt ? new Date(checkedAt).toLocaleString() : '—'}`}
              </p>
            </>
          ) : (
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-foreground-muted)', textAlign: 'center', maxWidth: '36rem', margin: '0 auto', lineHeight: 1.8 }}>
              {isAr
                ? 'تعذر التحقق من حالة البنية التحتية حالياً. إذا كنت تواجه مشكلة، تواصل معنا عبر صفحة الاتصال.'
                : 'We couldn\u2019t reach our health check right now. If you are experiencing an issue, please reach out through our contact page.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}