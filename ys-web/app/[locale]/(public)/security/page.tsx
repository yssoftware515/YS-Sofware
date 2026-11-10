import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { PageHero } from '@/components/shared/PageHero'
import type { PublicSettings } from '@/types'

const locales = ['en', 'ar'] as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return await buildMetadata({
    locale, path: '/security',
    title: locale === 'ar' ? 'الأمان' : 'Security',
    description: locale === 'ar' ? 'تعرف على ممارسات الأمان في YS Systems & Software: التشفير، التحكم في الوصول، وحماية البنية التحتية، وكيف نحافظ على أمان بياناتك.' : 'Learn about security practices at YS Systems & Software: encryption, access control, infrastructure protection, and how we keep your data safe.',
  })
}

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const isAr = locale === 'ar'

  const settings: PublicSettings | undefined = await api.settings(locale).catch(() => undefined)

  const securityEmail = settings?.contacts?.security_email
  const fallbackSections = isAr ? [
    { title: 'نهجنا في الأمان', body: 'الأمان جزء أساسي من طريقة بنائنا. نطبّق ممارسات معيارية في الصناعة — تشمل اتصالات مشفّرة، وضوابط وصول صارمة، وفحص تلقائي للثغرات في مكتباتنا البرمجية — ونواصل تطوير مستوى الأمان لدينا مع نمو المنصة.' },
    { title: 'التشفير', body: 'جميع البيانات المنقولة بين متصفحك وخوادمنا مشفّرة باستخدام TLS. قاعدة بياناتنا الإنتاجية تقوم أيضًا بتشفير كل البيانات المخزّنة باستخدام معيار AES-256، وهي ميزة توفرها البنية التحتية لقاعدة البيانات لدينا.' },
    { title: 'التحكم في الوصول', body: 'نطبّق مبدأ أقل الصلاحيات اللازمة. كل عضو في الفريق له دور محدد ومحدود، والوصول لكل نظام أو منتج يُمنح صراحةً، وليس ممنوحًا افتراضيًا.' },
    { title: 'ممارسات مستمرة', body: 'نُجري فحصًا تلقائيًا للثغرات والمكتبات البرمجية كجزء من عملية التطوير لدينا، ونراجع أنظمتنا مع بناء وإطلاق كل ميزة جديدة.' },
    { title: 'التعامل مع البيانات', body: 'المعلومات التي تشاركها معنا — مثلاً عبر نموذج التواصل — تُخزَّن بشكل آمن، والوصول إليها مقتصر على أعضاء الفريق الذين يحتاجونها لأداء عملهم. نحتفظ بها فقط للمدة اللازمة للرد عليك أو تقديم خدماتنا.' },
    { title: 'الإبلاغ عن ثغرة أمنية', body: 'إذا كنت تعتقد أنك اكتشفت ثغرة أمنية، نشجعك على إبلاغنا بشكل مسؤول. نأخذ كل بلاغ على محمل الجد ونرد بأسرع وقت ممكن.' },
  ] : [
    { title: 'Our Approach to Security', body: 'Security is foundational to how we build. We apply industry-standard practices — including encrypted connections, strict access controls, and automated dependency scanning — and we continue to invest in our security posture as the platform grows.' },
    { title: 'Encryption', body: 'All data transmitted between your browser and our servers is encrypted using TLS. Our production database also encrypts all stored data at rest using AES-256 encryption, provided by our database infrastructure.' },
    { title: 'Access Control', body: 'We enforce access based on the principle of least privilege. Every team member has a specific, limited role, and access to each product or system is explicitly granted rather than assumed by default.' },
    { title: 'Ongoing Practices', body: 'We run automated dependency and vulnerability scanning as part of our development process, and we review our systems as we build and ship new features.' },
    { title: 'Data Handling', body: 'Information you share with us — for example through our contact form — is stored securely and access to it is limited to team members who need it to do their work. We retain it only as long as necessary to respond to you or provide our services.' },
    { title: 'Report a Vulnerability', body: 'If you believe you\'ve found a security vulnerability, we encourage you to report it to us responsibly. We take all reports seriously and will respond as quickly as we can.' },
  ]

  const sections = fallbackSections

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <PageHero
        eyebrow={isAr ? 'الأمان' : 'Security'}
        title={isAr ? 'الأمان في YS Systems' : 'Security at YS Systems'}
        description={isAr ? 'كيف نحمي منصاتنا وبياناتك.' : 'How we protect our platforms and your data.'}
        maxWidth="48rem"
      />

      <section className="section-sm">
        <div className="container-site" style={{ maxWidth: '48rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {sections.map(({ title, body }) => {
            const isVuln = isAr ? title === 'الإبلاغ عن ثغرة أمنية' : title === 'Report a Vulnerability'
            return (
              <div key={title}>
                <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', marginBottom: '0.75rem' }}>{title}</h2>
                <p style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.8, marginBottom: isVuln && securityEmail ? '0.75rem' : undefined, whiteSpace: 'pre-line' }}>{body}</p>
                {isVuln && securityEmail && (
                  <a href={`mailto:${securityEmail}`} style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9375rem' }}>{securityEmail}</a>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="section-sm section-divider-top" style={{ backgroundColor: 'var(--color-background-subtle)' }}>
        <div className="container-site" style={{ textAlign: 'center', maxWidth: '36rem', marginInline: 'auto' }}>
          <h2 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '0.75rem' }}>
            {isAr ? 'أسئلة حول الأمان؟' : 'Questions about security?'}
          </h2>
          <p style={{ color: 'var(--color-foreground-muted)', marginBottom: '1.5rem' }}>
            {isAr ? 'نحن هنا للإجابة على استفساراتك.' : 'We\'re here to answer your questions.'}
          </p>
          <a href={`/${locale}/contact`} style={{ display: 'inline-flex', padding: '0.625rem 1.5rem', borderRadius: 10, backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            {isAr ? 'تواصل معنا' : 'Contact Us'}
          </a>
        </div>
      </section>
    </div>
  )
}
