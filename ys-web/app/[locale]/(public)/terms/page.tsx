import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { PageHero } from '@/components/shared/PageHero'
import type { StaticPage } from '@/types'

const locales = ['en', 'ar'] as const
const fallbackSections = {
  en: [
    { title: 'Acceptance of Terms', body: 'By using YS Systems & Software services, you agree to be bound by these terms and conditions.' },
    { title: 'Use of Services', body: 'Our services must be used for lawful purposes only. Any use that conflicts with applicable laws is prohibited.' },
    { title: 'Intellectual Property', body: 'All content, software, and trademarks associated with our services are the property of YS Systems & Software.' },
    { title: 'Disclaimer', body: 'We provide our services "as is" without warranties of any kind, either express or implied.' },
    { title: 'Updates to Terms', body: 'We reserve the right to modify these terms at any time. We will notify you of material changes via email.' },
    { title: 'Contact', body: 'For questions about these Terms, please contact us at cantactys@gmail.com' },
  ],
  ar: [
    { title: 'قبول الشروط', body: 'باستخدامك لخدمات YS Systems & Software، فإنك توافق على الالتزام بهذه الشروط والأحكام.' },
    { title: 'استخدام الخدمات', body: 'يجب استخدام خدماتنا للأغراض المشروعة فقط. يُحظر أي استخدام يتعارض مع القوانين المعمول بها.' },
    { title: 'الملكية الفكرية', body: 'جميع المحتوى والبرمجيات والعلامات التجارية المرتبطة بخدماتنا هي ملك لـ YS Systems & Software.' },
    { title: 'إخلاء المسؤولية', body: 'نقدم خدماتنا "كما هي" دون ضمانات صريحة أو ضمنية من أي نوع.' },
    { title: 'تحديثات الشروط', body: 'نحتفظ بحق تعديل هذه الشروط في أي وقت. سنبلغك بالتغييرات الجوهرية عبر البريد الإلكتروني.' },
    { title: 'التواصل', body: 'للاستفسار عن هذه الشروط، يرجى التواصل معنا على cantactys@gmail.com' },
  ],
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    locale, path: '/terms',
    title: locale === 'ar' ? 'شروط الخدمة' : 'Terms of Service',
    description: locale === 'ar' ? 'شروط وأحكام استخدام خدمات YS Systems & Software. تعرف على حقوقك وواجباتك عند استخدام منصاتنا.' : 'The terms and conditions governing the use of YS Systems & Software products and services. Understand your rights and obligations.',
  })
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const isAr = locale === 'ar'
  const f = fallbackSections[locale as keyof typeof fallbackSections] ?? fallbackSections.en

  let sections: { title: string; body: string }[] = f
  let page: StaticPage | null = null
  try {
    page = await api.page('terms', locale)
    if (page?.content) {
      const parsed = JSON.parse(page.content)
      if (Array.isArray(parsed)) sections = parsed
    }
  } catch (err) { console.error('[public:terms] fetch failed:', err) }

  const lastUpdated = page?.published_at
    ? new Intl.DateTimeFormat(isAr ? 'ar' : 'en-US', { dateStyle: 'long' }).format(Date.parse(page.published_at))
    : undefined
  const heroDescription = lastUpdated
    ? (isAr ? `آخر تحديث: ${lastUpdated}` : `Last updated: ${lastUpdated}`)
    : undefined

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <PageHero
        eyebrow={isAr ? 'قانوني' : 'Legal'}
        title={isAr ? 'شروط الخدمة' : 'Terms of Service'}
        description={heroDescription}
        maxWidth="48rem"
      />

      <section className="section-sm">
        <div className="container-site" style={{ maxWidth: '48rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {sections.map(({ title, body }) => (
            <div key={title}>
              <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', marginBottom: '0.75rem' }}>{title}</h2>
              <p style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-sm section-divider-top" style={{ backgroundColor: 'var(--color-background-subtle)' }}>
        <div className="container-site" style={{ textAlign: 'center', maxWidth: '36rem', marginInline: 'auto' }}>
          <h2 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '0.75rem' }}>
            {isAr ? 'هل لديك استفسار عن الشروط؟' : 'Questions about our terms?'}
          </h2>
          <p style={{ color: 'var(--color-foreground-muted)', marginBottom: '1.5rem' }}>
            {isAr ? 'نحن هنا للإجابة على استفساراتك.' : "We're here to answer your questions."}
          </p>
          <a href={`/${locale}/contact`} style={{ display: 'inline-flex', padding: '0.625rem 1.5rem', borderRadius: 10, backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            {isAr ? 'تواصل معنا' : 'Contact Us'}
          </a>
        </div>
      </section>
    </div>
  )
}
