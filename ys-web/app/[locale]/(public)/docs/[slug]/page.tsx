import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml'
import { Breadcrumb } from '@/components/shared/Breadcrumb'

const content = {
  en: { back: 'Back to Documentation', min_read: 'min read', docs_crumb: 'Documentation' },
  ar: { back: 'العودة للتوثيق', min_read: 'دقيقة قراءة', docs_crumb: 'التوثيق' },
}

interface ArticleData {
  id: string
  slug: string
  title: string
  content: string
  version_tag: string | null
  reading_time: number | null
  category: { id: string; title: string; slug: string }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  try {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    const res = await fetch(`${API}/public/docs/${slug}`, { headers: { 'Accept-Language': locale } })
    const body = await res.json()
    if (body.success) {
      return buildMetadata({
        locale,
        path: `/docs/${slug}`,
        title: body.data.title,
        description: locale === 'ar'
          ? `توثيق: ${body.data.title} — ${body.data.category?.title ?? ''}`
          : `Documentation: ${body.data.title} — ${body.data.category?.title ?? ''}`,
        type: 'article',
      })
    }
  } catch (err) { console.error('[public:docs-slug] fetch failed:', err) }

  return buildMetadata({
    locale,
    path: `/docs/${slug}`,
    title: 'Documentation',
    description: 'YS Systems & Software documentation.',
    noIndex: true, // unresolvable article — don't index a broken page
  })
}

export default async function DocArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = content[locale as keyof typeof content] ?? content.en

  let article: ArticleData
  try {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    const res  = await fetch(`${API}/public/docs/${slug}`, { headers: { 'Accept-Language': locale }, next: { revalidate: 60 } })
    const body = await res.json()
    if (!body.success) notFound()
    article = body.data
  } catch {
    notFound()
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <article style={{ paddingTop: '7rem', paddingBottom: '5rem' }}>
        <div className="container-site" style={{ maxWidth: '48rem' }}>

          <Breadcrumb
            locale={locale}
            items={[
              { label: t.docs_crumb, href: `/${locale}/docs` },
              { label: article!.category.title },
              { label: article!.title },
            ]}
          />

          {/* Back link */}
          <Link href={`/${locale}/docs`} style={{ marginTop: '1rem',
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', color: 'var(--color-foreground-muted)', textDecoration: 'none', marginBottom: '2rem',
          }}>
            <ArrowLeft size={15} className={locale === 'ar' ? 'arrow-icon' : ''} />
            {t.back}
          </Link>

          {/* Breadcrumb */}
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {article!.category.title}
          </p>

          {/* Title */}
          <h1 className="font-display font-semibold text-fluid-2xl" style={{ color: 'var(--color-foreground)', marginBottom: '1rem', lineHeight: 1.2 }}>
            {article!.title}
          </h1>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
            {article!.reading_time && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
                <Clock size={14} /> {article!.reading_time} {t.min_read}
              </span>
            )}
            {article!.version_tag && (
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-foreground-muted)', padding: '0.2rem 0.625rem', backgroundColor: 'var(--color-background-subtle)', borderRadius: 6 }}>
                {article!.version_tag}
              </span>
            )}
          </div>

          {/* Content */}
          <div
            style={{ color: 'var(--color-foreground-subtle)', lineHeight: 1.8, fontSize: '1rem' }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatContent(article!.content)) }}
          />
        </div>
      </article>
    </div>
  )
}

// Convert plain text paragraphs to HTML if content isn't already HTML
function formatContent(content: string): string {
  // Falls back to wrapping plain-text paragraphs in <p> when the content
  // isn't already HTML. Uses a class, not an inline style — the sanitizer
  // below strips `style` attributes on purpose (same "no inline CSS" policy
  // as the backend's Purifier config), so an inline style here would
  // silently lose its spacing the moment sanitizeHtml() runs.
  if (content.includes('<p>') || content.includes('<div>')) return content
  return content
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p class="mb-6">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}
