import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import Link from 'next/link'
import { Target, Rocket, Layers, Workflow, ShieldCheck, TrendingUp, Sparkles, Eye, Handshake, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AboutHero } from '@/components/shared/AboutHero'
import { FeatureRow, type FeatureRowItem } from '@/components/shared/FeatureRow'
import { AnimatedBox } from '@/components/shared/AnimatedBox'
import type { TimelineEntry, PublicSettings, StaticPage } from '@/types'

const locales = ['en', 'ar'] as const

const fallbackContent = {
  en: {
    eyebrow: 'About YS Software',
    hero_l1: 'Your Long-Term',
    hero_l2: 'Technology Partner —',
    hero_hl: 'Not Just a Vendor',
    hero_subline: 'YS Software brings design, engineering, AI automation, and product development together under one roof — so your business builds, launches, and scales its technology without coordinating five different vendors.',
    title: 'About YS Systems',
    subtitle: 'We build modern, scalable, and secure software systems that solve real business problems.',

    highlights: [
      { titleAccent: '3', title: 'Products', description: 'YS-Matrix, YS-Care, and YS-Sports — one connected ecosystem, not three separate projects.' },
      { titleAccent: 'End-to-End', title: 'Delivery', description: 'From UI/UX and web platforms to custom systems and AI automation, under one technology partner.' },
      { titleAccent: 'Secure', title: 'by Design', description: 'Role-based access, immutable audit logging, and fail-closed permissions built into every system we ship.' },
      { titleAccent: 'Built', title: 'to Scale', description: 'Multi-tenant architecture designed to grow with you — from your first client to your thousandth.' },
    ],

    mission_label: 'Our Mission',
    mission: 'To simplify business complexity through software that is secure, scalable, and genuinely usable — built by people who understand both the code and the business behind it.',
    vision_label: 'Our Vision',
    vision: 'To become the long-term technology partner businesses return to at every stage — from their first product to their full digital ecosystem.',

    values_label: 'What Guides Our Work',
    values: [
      { title: 'Craftsmanship', description: "We'd rather ship something right than ship it fast. Quality isn't a phase — it's the default." },
      { title: 'Transparency', description: 'No inflated claims, no fabricated numbers. What we say about our work is exactly what\u2019s true.' },
      { title: 'Long-Term Partnership', description: 'Relationships that outlast a single project — support, updates, and growth that continue after launch.' },
      { title: 'Continuous Evolution', description: "Your business changes, your customers change — so your technology should too. We build for what's next." },
    ],

    timeline_label: 'Company Timeline',
    type_labels: { founding: 'Founding', product_launch: 'Launch', milestone: 'Milestone', award: 'Award', partnership: 'Partnership' },
    cta_heading: 'Have an idea? Let\u2019s build it.',
    cta_body: 'Tell us what you need \u2014 a product, a platform, or a full system \u2014 and let\u2019s map the way forward.',
    cta_label: 'Start a Conversation',
  },
  ar: {
    eyebrow: 'عن YS Software',
    hero_l1: 'شريكك التقني',
    hero_l2: 'على المدى الطويل —',
    hero_hl: 'وليس مجرد مقاول تنفيذ',
    hero_subline: 'تجمع YS Software بين التصميم والهندسة وأتمتة الذكاء الاصطناعي وتطوير المنتجات في مكان واحد — لتبني أعمالك تقنيتها وتطلقها وتطورها دون التنسيق مع خمس جهات مختلفة.',
    title: 'عن YS Systems',
    subtitle: 'نبني أنظمة برمجية حديثة وقابلة للتوسع وآمنة تحل مشكلات الأعمال الحقيقية.',

    highlights: [
      { titleAccent: '3', title: 'منتجات', description: 'YS-Matrix وYS-Care وYS-Sports — نظام بيئي واحد مترابط، وليست ثلاثة مشاريع منفصلة.' },
      { titleAccent: 'تنفيذ', title: 'متكامل', description: 'من تصميم الواجهات والمواقع إلى الأنظمة المخصصة وأتمتة الذكاء الاصطناعي، عبر شريك تقني واحد.' },
      { titleAccent: 'أمان', title: 'بالتصميم', description: 'صلاحيات قائمة على الأدوار، وسجل تدقيق غير قابل للتعديل، في كل نظام نبنيه.' },
      { titleAccent: 'مبني', title: 'للتوسع', description: 'معمارية متعددة المستأجرين مصممة للنمو معك — من أول عميل إلى الألف.' },
    ],

    mission_label: 'مهمتنا',
    mission: 'تبسيط تعقيد الأعمال من خلال برمجيات آمنة وقابلة للتوسع وسهلة الاستخدام فعليًا — يبنيها فريق يفهم الكود وأعمال العميل معًا.',
    vision_label: 'رؤيتنا',
    vision: 'أن نكون الشريك التقني الذي تعود إليه الشركات في كل مرحلة — من أول منتج لها وحتى منظومتها الرقمية الكاملة.',

    values_label: 'ما يوجّه عملنا',
    values: [
      { title: 'الإتقان', description: 'نفضّل أن ننجز الشيء بشكل صحيح على أن ننجزه بسرعة فقط. الجودة ليست مرحلة، بل هي الافتراضي.' },
      { title: 'الشفافية', description: 'بدون ادعاءات مبالغ فيها أو أرقام وهمية. ما نقوله عن عملنا هو الحقيقة بالضبط.' },
      { title: 'شراكة طويلة الأمد', description: 'علاقات تتجاوز المشروع الواحد — دعم وتحديثات ونمو مستمر بعد الإطلاق.' },
      { title: 'التطور المستمر', description: 'أعمالك تتغيّر وعملاؤك يتغيّرون، لذا تقنيتك يجب أن تتطور أيضًا. نبني لما هو قادم.' },
    ],

    timeline_label: 'التسلسل الزمني للشركة',
    type_labels: { founding: 'تأسيس', product_launch: 'إطلاق', milestone: 'معلم', award: 'جائزة', partnership: 'شراكة' },
    cta_heading: 'لديك فكرة؟ لنبنها معاً.',
    cta_body: 'أخبرنا بما تحتاجه \u2014 منتجاً أو منصة أو نظاماً متكاملاً \u2014 لنتحدد الطريق معاً.',
    cta_label: 'ابدأ محادثة',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const f = fallbackContent[locale as keyof typeof fallbackContent] ?? fallbackContent.en
  try {
    const page = await api.page('about', locale)
    if (page?.title) {
      return buildMetadata({ locale, path: '/about', title: page.title, description: page.excerpt ?? f.hero_subline })
    }
  } catch (err) { console.error('[public:about] fetch failed:', err) }
  return buildMetadata({ locale, path: '/about', title: f.title, description: f.hero_subline })
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const f = fallbackContent[locale as keyof typeof fallbackContent] ?? fallbackContent.en
  const isAr = locale === 'ar'

  let timeline: TimelineEntry[] = []
  let settings: PublicSettings | undefined
  let cmsPage: StaticPage | undefined
  try {
    [timeline, settings, cmsPage] = await Promise.all([
      api.timeline(locale),
      api.settings(locale),
      api.page('about', locale).catch(() => undefined),
    ])
  } catch (err) { console.error('[public:about] fetch failed:', err) }

  const companyName = settings?.brand?.company_name ?? 'YS Systems & Software'

  let sections: { label: string; text: string }[] = []
  if (cmsPage?.content) {
    try {
      const parsed = JSON.parse(cmsPage.content)
      if (Array.isArray(parsed)) sections = parsed
    } catch (err) { console.error('[public:about] fetch failed:', err) }
  }

  const missionLabel = sections[0]?.label ?? f.mission_label
  const missionText  = sections[0]?.text ?? f.mission
  const visionLabel  = sections[1]?.label ?? f.vision_label
  const visionText   = sections[1]?.text ?? f.vision

  const highlightIcons = [Layers, Workflow, ShieldCheck, TrendingUp]
  const highlightItems: FeatureRowItem[] = f.highlights.map((h, i) => ({ ...h, icon: highlightIcons[i] }))

  const valueIcons = [Sparkles, Eye, Handshake, RefreshCw]
  const valueItems: FeatureRowItem[] = f.values.map((v, i) => ({ ...v, icon: valueIcons[i] }))

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <AboutHero
        locale={locale}
        eyebrow={f.eyebrow}
        headlineLine1={f.hero_l1}
        headlineLine2={f.hero_l2}
        headlineHighlight={f.hero_hl}
        subline={f.hero_subline}
        imageAlt={isAr ? `الهوية البصرية لـ ${companyName}` : `${companyName} brand identity`}
      />

      {/* ── Company Highlights ────────────────────────────────────────── */}
      <section className="pt-6 lg:pt-2 pb-16 lg:pb-20" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="container-site">
          <FeatureRow items={highlightItems} accent="violet" />
        </div>
      </section>

      {/* ── Mission / Vision ──────────────────────────────────────────── */}
      <section className="section-sm" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { label: missionLabel, text: missionText, icon: Target },
              { label: visionLabel,  text: visionText,  icon: Rocket },
            ].map(({ label, text, icon: Icon }, i) => (
              <AnimatedBox key={label} whileInView delay={i * 0.1}>
                <div style={{ padding: '2.25rem', borderRadius: '1.25rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', height: '100%' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid #8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <Icon size={22} style={{ color: '#8B5CF6' }} aria-hidden="true" />
                  </div>
                  <h2 className="font-display font-semibold" style={{ color: 'var(--color-foreground)', fontSize: '1.375rem', marginBottom: '1rem' }}>{label}</h2>
                  <p style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.75, fontSize: '1.0625rem' }}>{text}</p>
                </div>
              </AnimatedBox>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Values ────────────────────────────────────────────────── */}
      <section className="section-sm">
        <div className="container-site">
          <h2 className="font-display font-semibold text-fluid-xl text-center" style={{ color: 'var(--color-foreground)', marginBottom: '2.5rem' }}>
            {f.values_label}
          </h2>
          <FeatureRow items={valueItems} accent="violet" />
        </div>
      </section>

      {/* ── Timeline ───────────────────────────────────────────────────── */}
      {timeline.length > 0 && (
        <section className="section-sm" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="container-site" style={{ maxWidth: '56rem' }}>
            <h2 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '3rem', textAlign: 'center' }}>{f.timeline_label}</h2>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: 'var(--color-border)', transform: 'translateX(-50%)' }} className="hidden md:block" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {timeline.map((entry, i) => (
                  <div key={entry.id} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div style={{ textAlign: i % 2 === 0 ? 'right' : 'left', order: i % 2 === 0 ? 0 : 1 }} className="hidden md:block">
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', fontWeight: 600 }}>{new Date(entry.event_date).getFullYear()}</span>
                    </div>
                    <div style={{ padding: '1.25rem 1.5rem', borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', order: i % 2 === 0 ? 1 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {f.type_labels[entry.type as keyof typeof f.type_labels] ?? entry.type}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }} className="md:hidden">· {new Date(entry.event_date).getFullYear()}</span>
                      </div>
                      <h3 className="font-display font-semibold" style={{ color: 'var(--color-foreground)', marginBottom: '0.25rem' }}>{entry.title}</h3>
                      {entry.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', lineHeight: 1.6 }}>{entry.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="section-sm section-divider-top" style={{ backgroundColor: 'var(--color-background-subtle)' }}>
        <div className="container-site" style={{ textAlign: 'center', maxWidth: '40rem', margin: '0 auto' }}>
          <h2 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '1rem' }}>{f.cta_heading}</h2>
          <p style={{ color: 'var(--color-foreground-muted)', marginBottom: '2rem' }}>{f.cta_body}</p>
          <Link href={`/${locale}/contact`} style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="lg">{f.cta_label}</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
