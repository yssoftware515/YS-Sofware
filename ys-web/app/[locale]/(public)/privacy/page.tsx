import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { PageHero } from '@/components/shared/PageHero'
import type { StaticPage } from '@/types'

const locales = ['en', 'ar'] as const
const fallbackSections = {
  en: [
    { title: 'Information We Collect', body: 'When you contact us through our website — for example, via our contact form — we collect the information you provide directly, such as your name, email address, phone number, subject, and message. We use this information solely to respond to your inquiry and provide the services you\'ve requested.' },
    { title: 'How We Use Your Information', body: 'We use information to provide and improve our services, communicate with you, and ensure security.' },
    { title: 'Information Sharing', body: 'We do not sell your personal information to third parties. We may share it with service providers only when necessary.' },
    { title: 'Data Retention', body: 'We retain the personal information you provide only for as long as necessary to respond to your inquiry, deliver our services, or comply with legal obligations. When it is no longer needed for these purposes, we securely delete it.' },
    { title: 'Security', body: 'We take appropriate security measures to protect your information from unauthorized access or disclosure.' },
    { title: 'Contact Us', body: 'If you have questions about this Privacy Policy, please contact us at cantactys@gmail.com' },
  ],
  ar: [
    { title: 'المعلومات التي نجمعها', body: 'عندما تتواصل معنا عبر موقعنا — مثلاً من خلال نموذج التواصل — نجمع المعلومات التي تقدمها مباشرةً، مثل اسمك وبريدك الإلكتروني ورقم هاتفك وموضوع رسالتك ومحتواها. نستخدم هذه المعلومات فقط للرد على استفسارك وتقديم الخدمات التي طلبتها.' },
    { title: 'كيف نستخدم معلوماتك', body: 'نستخدم المعلومات لتقديم خدماتنا وتحسينها، والتواصل معك، وضمان الأمان.' },
    { title: 'مشاركة المعلومات', body: 'لا نبيع معلوماتك الشخصية لأطراف ثالثة. قد نشاركها مع مزودي الخدمات فقط عند الضرورة.' },
    { title: 'الاحتفاظ بالبيانات', body: 'نحتفظ بالمعلومات الشخصية التي تقدمها لنا فقط للمدة اللازمة للرد على استفسارك أو تقديم خدماتنا أو الامتثال لأي التزامات قانونية. وعندما لا تعود هناك حاجة لهذه المعلومات، نقوم بحذفها بشكل آمن.' },
    { title: 'الأمان', body: 'نتخذ تدابير أمنية مناسبة لحماية معلوماتك من الوصول غير المصرح به أو الإفصاح.' },
    { title: 'الاتصال بنا', body: 'إذا كانت لديك أسئلة حول سياسة الخصوصية، يرجى التواصل معنا على cantactys@gmail.com' },
  ],
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    locale, path: '/privacy',
    title: locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy',
    description: locale === 'ar' ? 'اطلع على سياسة الخصوصية لـ YS Systems & Software. نوضح كيفية جمع واستخدام وحماية معلوماتك الشخصية.' : 'Learn how YS Systems & Software collects, uses, and protects your personal information. Your privacy matters to us.',
  })
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const isAr = locale === 'ar'
  const f = fallbackSections[locale as keyof typeof fallbackSections] ?? fallbackSections.en

  let sections: { title: string; body: string }[] = f
  let page: StaticPage | null = null
  try {
    page = await api.page('privacy', locale)
    if (page?.content) {
      const parsed = JSON.parse(page.content)
      if (Array.isArray(parsed)) sections = parsed
    }
  } catch (err) { console.error('[public:privacy] fetch failed:', err) }

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
        title={isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
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
            {isAr ? 'هل لديك سؤال عن الخصوصية؟' : 'Questions about privacy?'}
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
