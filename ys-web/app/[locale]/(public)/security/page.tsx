import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { PageHero } from '@/components/shared/PageHero'
import type { PublicSettings, StaticPage } from '@/types'

const locales = ['en', 'ar'] as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    locale, path: '/security',
    title: locale === 'ar' ? 'الأمان' : 'Security',
    description: locale === 'ar' ? 'تعرف على ممارسات الأمان في YS Systems & Software: التشفير، التحكم في الوصول، وحماية البنية التحتية، وكيف نحافظ على أمان بياناتك.' : 'Learn about security practices at YS Systems & Software: encryption, access control, infrastructure protection, and how we keep your data safe.',
  })
}

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const isAr = locale === 'ar'

  let settings: PublicSettings | undefined
  let cmsPage: StaticPage | undefined
  try {
    [settings, cmsPage] = await Promise.all([
      api.settings(locale),
      api.page('security', locale).catch(() => undefined),
    ])
  } catch (err) { console.error('[public:security] fetch failed:', err) }

  const securityEmail = settings?.contacts?.security_email
  const fallbackSections = isAr ? [
    { title: 'التزامنا بالأمان', body: 'الأمان هو أساس كل ما نبنيه. نتبع أفضل الممارسات في الصناعة لحماية بياناتك والحفاظ على سلامة منصاتنا. فريقنا يقيّم باستمرار ويحسن وضعنا الأمني لمواجهة التهديدات المتطورة.' },
    { title: 'أمان البنية التحتية', body: 'نستخدم طبقات متعددة من الضوابط الأمنية لحماية البنية التحتية لدينا، بما في ذلك جدران الحماية وأنظمة كشف التسلل والتحديثات الأمنية المنتظمة. يتم تخزين البيانات في مراكز بيانات آمنة مع ضوابط وصول صارمة.' },
    { title: 'التشفير', body: 'جميع البيانات المنقولة بينك وبين خوادمنا مشفرة باستخدام TLS/SSL. البيانات المخزنة مشفرة باستخدام معايير تشفير قوية لحمايتها من الوصول غير المصرح به.' },
    { title: 'التحكم في الوصول', body: 'نطبق ضوابط وصول صارمة بناءً على مبدأ أقل امتياز. يتم تأمين الوصول إلى الأنظمة والبيانات بالمصادقة متعددة العوامل ومراجعته بانتظام.' },
    { title: 'تقييم الأمان', body: 'نجري تقييمات أمنية منتظمة، بما في ذلك فحص الثغرات الأمنية ومراجعة الكود، لتحديد ومعالجة المخاطر المحتملة بشكل استباقي.' },
    { title: 'حماية البيانات', body: 'نطبق إجراءات لحماية البيانات الحساسة، بما في ذلك ضوابط الوصول المستندة إلى الأدوار، وتصنيف البيانات، وممارسات التخزين والتخلص الآمنة.' },
  ] : [
    { title: 'Our Security Commitment', body: 'Security is the foundation of everything we build. We follow industry best practices to protect your data and maintain the integrity of our platforms. Our team continuously assesses and improves our security posture to address evolving threats.' },
    { title: 'Infrastructure Security', body: 'We employ multiple layers of security controls to protect our infrastructure, including firewalls, intrusion detection systems, and regular security patching. Data is stored in secure data centers with strict access controls.' },
    { title: 'Encryption', body: 'All data transmitted between you and our servers is encrypted using TLS/SSL. Data at rest is encrypted using strong encryption standards to protect it from unauthorized access.' },
    { title: 'Access Control', body: 'We enforce strict access controls based on the principle of least privilege. Access to systems and data is secured with multi-factor authentication and regularly reviewed.' },
    { title: 'Security Assessment', body: 'We conduct regular security assessments, including vulnerability scanning and code review, to proactively identify and address potential risks.' },
    { title: 'Data Protection', body: 'We implement measures to protect sensitive data, including role-based access controls, data classification, and secure storage and disposal practices.' },
  ]

  let sections = fallbackSections
  try {
    if (cmsPage?.content) {
      const parsed = JSON.parse(cmsPage.content)
      if (Array.isArray(parsed)) sections = parsed
    }
  } catch (err) { console.error('[public:security] fetch failed:', err) }

  const vulnSection = isAr ? {
    title: 'الإبلاغ عن ثغرة أمنية',
    body: 'إذا كنت تعتقد أنك وجدت ثغرة أمنية في أي من منتجاتنا أو خدماتنا، نرحب بإبلاغنا بطريقة مسؤولة. يرجى مراسلتنا عبر البريد الإلكتروني وسنعمل على معالجة التقرير في أقرب وقت ممكن.',
  } : {
    title: 'Report a Vulnerability',
    body: 'If you believe you have found a security vulnerability in any of our products or services, we encourage you to report it to us responsibly. Please email us and we will work to address the report as promptly as possible.',
  }

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
          {sections.map(({ title, body }) => (
            <div key={title}>
              <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', marginBottom: '0.75rem' }}>{title}</h2>
              <p style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{body}</p>
            </div>
          ))}

          {securityEmail && (
            <div style={{ padding: '1.5rem', borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', marginBottom: '0.75rem' }}>{vulnSection.title}</h2>
              <p style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.8, marginBottom: '0.75rem' }}>{vulnSection.body}</p>
              <a href={`mailto:${securityEmail}`} style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9375rem' }}>{securityEmail}</a>
            </div>
          )}
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
