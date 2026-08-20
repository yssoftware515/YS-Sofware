import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Users, MapPin, Briefcase, ArrowRight, ArrowLeft, Mail, Sparkles } from 'lucide-react'
import { api } from '@/lib/api/client'
import { buildMetadata } from '@/lib/seo'
import { AnimatedBox } from '@/components/shared/AnimatedBox'
import type { Career } from '@/types'

const locales = ['en', 'ar'] as const

const content = {
  en: {
    title: 'Careers',
    subtitle:
      'Join a technology company that builds complete digital ecosystems — from design and web platforms to mobile applications, AI automation, and SaaS products used by real businesses.',
    open_positions: 'Open Positions',
    apply: 'Apply Now',
    location: 'Location',
    types: {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contract: 'Contract',
      internship: 'Internship',
    },
    no_jobs_title: 'No open positions right now',
    no_jobs_body:
      'We are not actively hiring at this moment, but we are always open to exceptional talent. If you have the skills and drive to contribute to what we are building, we want to hear from you.',
    no_jobs_cta: 'Get in touch',
    perks_title: 'What working here means',
    perks: [
      'Work directly with the founder and lead architect on decisions that shape the product — your input reaches the top without bureaucracy.',
      'Build and ship features for live production SaaS products — YS-Matrix, YS-Sports, YS-Care — used by real businesses, not internal experiments.',
      'Solve real bilingual (EN/AR) product challenges at scale — from RTL UI engineering across full-stack platforms to localized AI workflows.',
      'Contribute to a complete technology ecosystem: design systems, web platforms, mobile apps, custom business systems, AI automation, and third-party integrations — all under one roof.',
    ],
    badge: 'Join Us',
  },
  ar: {
    title: 'الوظائف',
    subtitle:
      'انضم إلى شركة تقنية تبني أنظمة بيئية رقمية متكاملة — من التصميم والمنصات الإلكترونية إلى تطبيقات الجوال، وأتمتة الذكاء الاصطناعي، ومنتجات SaaS تستخدمها شركات حقيقية.',
    open_positions: 'الوظائف المتاحة',
    apply: 'تقدم الآن',
    location: 'الموقع',
    types: {
      full_time: 'دوام كامل',
      part_time: 'دوام جزئي',
      contract: 'عقد',
      internship: 'تدريب',
    },
    no_jobs_title: 'لا توجد وظائف شاغرة حالياً',
    no_jobs_body:
      'لسنا نُوظّف بنشاط في الوقت الحالي، لكننا دائماً منفتحون على المواهب الاستثنائية. إذا كنت تمتلك المهارات والطاقة للمساهمة فيما نبنيه، نريد أن نسمع منك.',
    no_jobs_cta: 'تواصل معنا',
    perks_title: 'ماذا يعني العمل هنا',
    perks: [
      'اعمل مباشرة مع المؤسس والمهندس الرئيسي على قرارات تشكّل المنتج — مدخلاتك تصل للقمة دون بيروقراطية.',
      'ابنِ واطلق ميزات لمنتجات SaaS حية في الإنتاج — YS-Matrix، YS-Sports، YS-Care — تستخدمها شركات حقيقية، ليس تجارب داخلية.',
      'حل تحديات منتجية ثنائية اللغة (EN/AR) حقيقية على نطاق واسع — من هندسة واجهات RTL عبر منصات Full-Stack إلى سير عمل AI المُوطّن.',
      'ساهم في نظام بيئي تقني متكامل: أنظمة تصميم، ومنصات إلكترونية، وتطبيقات جوال، وأنظمة أعمال مخصصة، وأتمتة ذكاء اصطناعي، وتكاملات خارجية — كل ذلك تحت سقف واحد.',
    ],
    badge: 'انضم إلينا',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = content[locale as keyof typeof content] ?? content.en
  return buildMetadata({
    locale,
    path: '/careers',
    title: t.title,
    description: t.subtitle,
  })
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale)) notFound()
  const t = content[locale as keyof typeof content] ?? content.en
  const isAr = locale === 'ar'

  let careers: Career[] = []
  try {
    careers = await api.careers(locale)
  } catch (err) {
    console.error('[public:careers] fetch failed:', err)
  }

  const departments = [...new Set(careers.map((c) => c.department))].sort()
  const Arrow = isAr ? ArrowLeft : ArrowRight

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      {/* ═══════════════════════════════════════════════════════════════
          HERO — matches ServicesHero / ContactHero pattern
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          paddingTop: '7rem',
          paddingBottom: '5rem',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(10,79,231,0.08), transparent)',
          }}
        />

        <div className="container-site relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: intro */}
            <div>
              <AnimatedBox delay={0}>
                <span
                  className="glass-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                  style={{ color: 'var(--color-accent)' }}
                >
                  <Users size={14} />
                  {t.badge}
                </span>
              </AnimatedBox>

              <AnimatedBox delay={0.1}>
                <h1
                  className="font-display font-semibold tracking-tight text-fluid-2xl"
                  style={{
                    color: 'var(--color-foreground)',
                    marginBottom: '1.5rem',
                  }}
                >
                  {t.title}
                </h1>
              </AnimatedBox>

              <AnimatedBox delay={0.2}>
                <p
                  className="text-fluid-base"
                  style={{
                    color: 'var(--color-foreground-muted)',
                    lineHeight: 1.65,
                    maxWidth: '540px',
                  }}
                >
                  {t.subtitle}
                </p>
              </AnimatedBox>
            </div>

            {/* Right: side card (perks / culture) */}
            <AnimatedBox whileInView delay={0.15}>
              <div
                className="rounded-2xl p-8"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-card-lg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <h2
                  className="font-display font-semibold text-lg mb-5 flex items-center gap-2"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  <Sparkles
                    size={18}
                    style={{ color: 'var(--color-accent)' }}
                  />
                  {t.perks_title}
                </h2>
                <ul className="space-y-4">
                  {t.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: 'var(--chip-blue-bg)',
                          color: 'var(--chip-blue-text)',
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="text-sm"
                        style={{
                          color: 'var(--color-foreground-subtle)',
                          lineHeight: 1.6,
                        }}
                      >
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedBox>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          JOB LISTINGS
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="section"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div className="container-site">
          <AnimatedBox whileInView>
            <div className="flex items-center gap-3 mb-10">
              <h2
                className="font-display font-semibold text-fluid-xl"
                style={{ color: 'var(--color-foreground)' }}
              >
                {t.open_positions}
              </h2>
              {careers.length > 0 && (
                <span
                  className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: 'var(--chip-blue-bg)',
                    color: 'var(--chip-blue-text)',
                    minWidth: '28px',
                    height: '28px',
                  }}
                >
                  {careers.length}
                </span>
              )}
            </div>
          </AnimatedBox>

          {careers.length === 0 ? (
            <AnimatedBox whileInView delay={0.1}>
              <div
                className="relative overflow-hidden rounded-2xl text-center py-16 px-8"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-card-lg)',
                }}
              >
                {/* Subtle glow for intentional presence */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(10,79,231,0.04), transparent)',
                  }}
                />
                <div className="relative z-10">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    <Mail
                      size={24}
                      style={{ color: 'var(--color-foreground-muted)' }}
                    />
                  </div>
                  <h3
                    className="font-display font-semibold text-lg mb-2"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    {t.no_jobs_title}
                  </h3>
                  <p
                    className="text-sm mb-6 max-w-md mx-auto"
                    style={{
                      color: 'var(--color-foreground-muted)',
                      lineHeight: 1.6,
                    }}
                  >
                    {t.no_jobs_body}
                  </p>
                  <Link
                    href={`/${locale}/contact?type=general&subject=Career%20Inquiry`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
                    style={{
                      background: 'var(--color-accent)',
                      color: '#fff',
                      boxShadow: '0 4px 16px rgba(10,79,231,0.25)',
                    }}
                  >
                    {t.no_jobs_cta}
                    <Arrow size={16} />
                  </Link>
                </div>
              </div>
            </AnimatedBox>
          ) : (
            <div className="space-y-12">
              {departments.map((dept, deptIndex) => {
                const deptJobs = careers.filter(
                  (c) => c.department === dept
                )
                return (
                  <AnimatedBox
                    key={dept}
                    whileInView
                    delay={deptIndex * 0.08}
                  >
                    <div>
                      <h3
                        className="font-display font-semibold text-base mb-5 flex items-center gap-2"
                        style={{
                          color: 'var(--color-foreground-subtle)',
                        }}
                      >
                        <Briefcase
                          size={16}
                          style={{ color: 'var(--color-accent)' }}
                        />
                        {dept}
                      </h3>
                      <div className="space-y-3">
                        {deptJobs.map((career, jobIndex) => (
                          <AnimatedBox
                            key={career.id}
                            whileInView
                            delay={jobIndex * 0.06}
                          >
                            <Link
                              href={`/${locale}/contact?type=general&subject=${encodeURIComponent('Application: ' + career.title)}`}
                              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl p-5 transition-all duration-300 hover:border-[color:var(--color-border-strong)] hover:shadow-[var(--shadow-card-open)] hover:-translate-y-0.5"
                              style={{
                                background: 'var(--surface-subtle)',
                                border: '1px solid var(--border-card)',
                                boxShadow: 'var(--shadow-card)',
                                textDecoration: 'none',
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <h4
                                  className="font-display font-semibold text-base mb-1.5 transition-colors duration-300"
                                  style={{
                                    color: 'var(--color-foreground)',
                                  }}
                                >
                                  {career.title}
                                </h4>
                                <div
                                  className="flex flex-wrap items-center gap-3 text-xs"
                                  style={{
                                    color: 'var(--color-foreground-muted)',
                                  }}
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin size={12} />
                                    {career.location}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Briefcase size={12} />
                                    {t.types[
                                      career.type as keyof typeof t.types
                                    ] ?? career.type}
                                  </span>
                                </div>
                              </div>
                              <span
                                className="inline-flex items-center gap-1.5 text-sm font-medium flex-shrink-0"
                                style={{ color: 'var(--color-accent)' }}
                              >
                                {t.apply}
                                <Arrow
                                  size={16}
                                  className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                                />
                              </span>
                            </Link>
                          </AnimatedBox>
                        ))}
                      </div>
                    </div>
                  </AnimatedBox>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}