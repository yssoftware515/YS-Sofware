import { AnimatedBox } from '@/components/shared/AnimatedBox'
import type { HomepageSection } from '@/types'
import { processContentSchema, type ProcessItemData } from '@/lib/cms/schemas'
import { validateCmsContent } from '@/lib/cms/validate'

interface HowWeWorkSectionProps {
  locale: string
  cmsSection?: HomepageSection
}

interface Step {
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
}

const fallbackSteps: Step[] = [
  {
    title_en: 'Tell Us What You Need',
    title_ar: 'أخبرنا بما تحتاجه',
    description_en: 'A short conversation about your goal, timeline, and constraints — no obligation.',
    description_ar: 'محادثة قصيرة عن هدفك والجدول الزمني والقيود — دون أي التزام.',
  },
  {
    title_en: 'We Scope & Quote',
    title_ar: 'نحدد النطاق والعرض',
    description_en: 'We map the work, propose the approach, and give you a clear price before anything starts.',
    description_ar: 'نحدد العمل ونقترح النهج ونعطيك سعراً واضحاً قبل أن يبدأ أي شيء.',
  },
  {
    title_en: 'We Build & You Review',
    title_ar: 'نبني وأنت تراجع',
    description_en: 'Development in visible stages — you review progress and give direction along the way.',
    description_ar: 'تطوير على مراحل واضحة — تراجع التقدم وتوجهنا على طول الطريق.',
  },
  {
    title_en: 'Testing & Quality',
    title_ar: 'الاختبار والجودة',
    description_en: 'We test across browsers, devices, and languages before anything is handed over.',
    description_ar: 'نختبر على المتصفحات والأجهزة واللغات قبل تسليم أي شيء.',
  },
  {
    title_en: 'Launch & Support',
    title_ar: 'الإطلاق والدعم',
    description_en: 'We ship, monitor, and stay available after launch with continued support.',
    description_ar: 'نطلق ونتابع ونبقى متاحين بعد الإطلاق مع دعم مستمر.',
  },
]

function parseCmsSteps(raw: ProcessItemData[]): Step[] {
  return raw.map((item) => ({
    title_en: item.title_en ?? '',
    title_ar: item.title_ar ?? '',
    description_en: item.description_en ?? '',
    description_ar: item.description_ar ?? '',
  }))
}

export function HowWeWorkSection({ locale, cmsSection }: HowWeWorkSectionProps) {
  const isAr = locale === 'ar'
  const cmsContent = validateCmsContent(cmsSection, processContentSchema)
  const steps: Step[] = cmsContent?.items?.length
    ? parseCmsSteps(cmsContent.items)
    : fallbackSteps

  return (
    <section className="section-sm section-divider-top" style={{ backgroundColor: 'var(--color-background-subtle)' }}>
      <div className="container-site">
        <div style={{ textAlign: 'center', maxWidth: '40rem', margin: '0 auto 2.75rem' }}>
          <h2 className="font-display font-semibold text-fluid-xl tracking-tight" style={{ color: 'var(--color-foreground)', marginBottom: '0.875rem' }}>
            {isAr ? 'كيف نعمل' : 'How We Work'}
          </h2>
          <p style={{ color: 'var(--color-foreground-muted)', fontSize: '1.0625rem', lineHeight: 1.7 }}>
            {isAr
              ? 'عملية واضحة وشفافة من الاتصال الأول حتى الإطلاق.'
              : 'A clear, transparent process — from first contact to launch.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {steps.map((step, i) => (
            <AnimatedBox
              key={`${step.title_en}-${i}`}
              whileInView
              delay={i * 0.08}
              y={14}
              className="p-5 rounded-2xl flex flex-col"
              style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
            >
              <span
                aria-hidden="true"
                className="font-display font-bold mb-3"
                style={{
                  fontSize: '1.75rem',
                  lineHeight: 1,
                  background: 'linear-gradient(135deg, var(--color-accent), #8B5CF6)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display font-semibold text-[1rem] mb-2" style={{ color: 'var(--color-foreground)' }}>
                {isAr ? step.title_ar : step.title_en}
              </h3>
              <p className="text-[0.875rem] leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
                {isAr ? step.description_ar : step.description_en}
              </p>
            </AnimatedBox>
          ))}
        </div>
      </div>
    </section>
  )
}