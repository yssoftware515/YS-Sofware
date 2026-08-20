import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { PageHero } from '@/components/shared/PageHero'
import type { StaticPage } from '@/types'

const locales = ['en', 'ar'] as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    locale, path: '/cookie-policy',
    title: locale === 'ar' ? 'سياسة ملفات تعريف الارتباط' : 'Cookie Policy',
    description: locale === 'ar' ? 'تعرف على كيفية استخدام YS Systems & Software لملفات تعريف الارتباط، وأنواعها، وكيفية إدارة تفضيلاتك بسهولة.' : 'Learn how YS Systems & Software uses cookies, the types we set, and how you can manage your cookie preferences at any time.',
  })
}

export default async function CookiePolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const isAr = locale === 'ar'

  const fallbackSections = isAr ? [
    { title: 'ما هي ملفات تعريف الارتباط؟', body: 'ملفات تعريف الارتباط هي ملفات نصية صغيرة يتم وضعها على جهاز الكمبيوتر أو الجهاز المحمول الخاص بك عند زيارة موقع ويب. تُستخدم على نطاق واسع لجعل مواقع الويب تعمل أو تعمل بكفاءة أكبر، بالإضافة إلى توفير معلومات لأصحاب الموقع.' },
    { title: 'كيف نستخدم ملفات تعريف الارتباط', body: 'نستخدم ملفات تعريف الارتباط والتخزين المحلي المشابه للأغراض التالية:\n\n• أساسية: مطلوبة لتشغيل موقعنا — مثل حفظ تفضيلك لملفات تعريف الارتباط واختيارك للشكل الفاتح أو الغامق.\n\n• تحليلية: لا نستخدم حاليًا أي ملفات تعريف ارتباط تحليلية أو تتبع. إذا أضفناها مستقبلًا، سنحدّث هذه السياسة ونطلب موافقتك مرة أخرى.' },
    { title: 'الموافقة', body: 'عند زيارتك لموقعنا لأول مرة، سنعرض لك نافذة منبثقة تشرح سياسة ملفات تعريف الارتباط الخاصة بنا. يمكنك اختيار قبول جميع ملفات تعريف الارتباط أو رفض ملفات تعريف الارتباط غير الأساسية أو تخصيص تفضيلاتك. يتم تخزين تفضيلاتك في متصفحك لاستخدامها في الزيارات المستقبلية.' },
    { title: 'إدارة التفضيلات', body: 'يمكنك تغيير تفضيلات ملفات تعريف الارتباط الخاصة بك في أي وقت عن طريق ضبط إعدادات متصفحك. يمكن لمعظم المتصفحات حذف ملفات تعريف الارتباط أو رفضها. يرجى ملاحظة أن تعطيل ملفات تعريف الارتباط الأساسية قد يؤثر على وظائف موقعنا.' },
    { title: 'جهات خارجية', body: 'لا نستخدم خدمات جهات خارجية تضع ملفات تعريف ارتباط غير أساسية دون موافقتك الصريحة. أي ملفات تعريف ارتباط تابعة لجهات خارجية سنطلبها سيتم إدارتها وفقًا لسياسات الخصوصية الخاصة بها.' },
    { title: 'الاتصال بنا', body: 'إذا كانت لديك أسئلة حول سياسة ملفات تعريف الارتباط الخاصة بنا، يرجى التواصل معنا على cantactys@gmail.com.' },
  ] : [
    { title: 'What Are Cookies?', body: 'Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work or work more efficiently, as well as to provide information to the site owners.' },
    { title: 'How We Use Cookies', body: 'We use cookies and similar local storage for the following purposes:\n\n• Essential: required for our website to function — for example, remembering your cookie preference and your light/dark theme selection.\n\n• Analytics: we do not currently use analytics or tracking cookies. If we introduce them in the future, we will update this policy and ask for your consent again.' },
    { title: 'Consent', body: 'When you first visit our site, we will show you a pop-up explaining our cookie policy. You can choose to accept all cookies, reject non-essential cookies, or customize your preferences. Your preferences are stored in your browser for use on future visits.' },
    { title: 'Managing Preferences', body: 'You can change your cookie preferences at any time by adjusting your browser settings. Most browsers allow you to delete or reject cookies. Please note that disabling essential cookies may affect the functionality of our site.' },
    { title: 'Third Parties', body: 'We do not use any third-party services that place non-essential cookies without your explicit consent. Any third-party cookies we may request will be managed according to their respective privacy policies.' },
    { title: 'Contact Us', body: 'If you have any questions about our Cookie Policy, please contact us at cantactys@gmail.com.' },
  ]

  let sections = fallbackSections
  let page: StaticPage | null = null
  try {
    page = await api.page('cookie-policy', locale)
    if (page?.content) {
      const parsed = JSON.parse(page.content)
      if (Array.isArray(parsed)) sections = parsed
    }
  } catch (err) { console.error('[public:cookie-policy] fetch failed:', err) }

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
        title={isAr ? 'سياسة ملفات تعريف الارتباط' : 'Cookie Policy'}
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
            {isAr ? 'هل لديك سؤال عن الكوكيز؟' : 'Questions about cookies?'}
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
