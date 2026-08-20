'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PageHero } from '@/components/shared/PageHero'
import { api } from '@/lib/api/client'
import {
  BUDGET_RANGES,
  CONTACT_PREFERENCES,
  REQUEST_TYPES,
  TIMELINES,
  type BudgetRange,
  type ContactPreference,
  type RequestType,
  type Timeline,
} from '@/types'
import type { PublicSettings } from '@/types'

// safe digits-only number for wa.me (settings store E.164 like +9715…)
function waDigits(value?: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/[^\d]/g, '')
  return digits.length > 0 ? digits : null
}

const TYPE_LABELS: Record<RequestType, { en: string; ar: string }> = {
  website:         { en: 'Website',                 ar: 'موقع إلكتروني' },
  web_platform:    { en: 'Web Platform',            ar: 'منصة ويب' },
  mobile_app:      { en: 'Mobile App',              ar: 'تطبيق جوال' },
  saas:            { en: 'SaaS Product',            ar: 'منتج SaaS' },
  ai_solution:     { en: 'AI Solution',             ar: 'حل ذكاء اصطناعي' },
  ai_agent:        { en: 'AI Agent',                ar: 'وكيل ذكاء اصطناعي' },
  automation:      { en: 'Automation',              ar: 'أتمتة' },
  crm:             { en: 'CRM System',              ar: 'نظام CRM' },
  ui_ux:           { en: 'UI/UX Design',            ar: 'تصميم واجهات وتجربة مستخدم' },
  branding:        { en: 'Branding',                ar: 'هوية بصرية' },
  custom_software: { en: 'Custom Software',         ar: 'برمجيات مخصصة' },
  integration:     { en: 'Integrations',            ar: 'تكاملات' },
  other:           { en: 'Something Else',          ar: 'شيء آخر' },
}

// Small optional contextual questions shown after a request type is picked.
// Each entry is <details key, question text> — kept tiny on purpose.
const CONTEXTUAL_QUESTIONS: Partial<Record<RequestType, Array<[string, { en: string; ar: string }]>>> = {
  website:         [['website_existing', { en: 'Do you already have a website?', ar: 'هل لديك موقع إلكتروني حالياً؟' }]],
  web_platform:    [['system_existing', { en: 'Is there an existing platform to replace or connect with?', ar: 'هل توجد منصة حالية تُستبدل أو تُربط؟' }]],
  mobile_app:      [['platform', { en: 'Android, iOS, or both?', ar: 'أندرويد، iOS، أم كلاهما؟' }], ['app_existing', { en: 'Do you have an existing app?', ar: 'هل لديك تطبيق قائم؟' }]],
  saas:            [['mvp_defined', { en: 'Is the core feature set (MVP) already defined?', ar: 'هل تم تحديد الميزات الأساسية (MVP)؟' }]],
  ai_solution:     [['process', { en: 'What business process should the AI improve?', ar: 'ما العملية التي يجب أن يحسّنها الذكاء الاصطناعي؟' }]],
  ai_agent:        [['process', { en: 'What repetitive task should the agent handle?', ar: 'ما المهمة المتكررة التي سيتولاها الوكيل؟' }]],
  automation:      [['process', { en: 'What task would you like automated?', ar: 'ما المهمة التي تريد أتمتتها؟' }]],
  crm:             [['current_tools', { en: 'Which tools or spreadsheets do you use today?', ar: 'ما الأدوات أو الجداول التي تستخدمونها حالياً؟' }]],
  ui_ux:           [['design_existing', { en: 'Do you have brand guidelines or a current design?', ar: 'هل لديكم هوية بصرية أو تصميم حالي؟' }]],
  branding:        [['design_existing', { en: 'Is this a new brand or a refresh?', ar: 'هل هي هوية جديدة أم تحديث لهوية قائمة؟' }]],
  custom_software: [['system_existing', { en: 'Which software will this replace?', ar: 'ما النّظام الذي سيتم استبداله؟' }]],
  integration:     [['systems', { en: 'Which tools need to talk to each other?', ar: 'ما الأدوات التي يجب ربطها مع بعضها؟' }]],
}

const CONTACT_PREF_LABELS: Record<ContactPreference, { en: string; ar: string }> = {
  email:    { en: 'Email',    ar: 'البريد الإلكتروني' },
  whatsapp: { en: 'WhatsApp', ar: 'واتساب' },
}

const BUDGET_LABELS: Record<BudgetRange, { en: string; ar: string }> = {
  under_10k: { en: 'Under $10K',                ar: 'أقل من 10 آلاف دولار' },
  '10k_30k': { en: '$10k – $30k',               ar: '10–30 ألف دولار' },
  '30k_100k':{ en: '$30k – $100k',              ar: '30–100 ألف دولار' },
  over_100k: { en: 'Over $100k',                ar: 'أكثر من 100 ألف دولار' },
  flexible:  { en: 'Flexible / not sure yet',   ar: 'مرن / غير محدد بعد' },
}

const TIMELINE_LABELS: Record<Timeline, { en: string; ar: string }> = {
  asap:             { en: 'As soon as possible', ar: 'في أقرب وقت' },
  one_three_months: { en: '1 – 3 months',        ar: 'من شهر إلى 3 أشهر' },
  three_six_months: { en: '3 – 6 months',        ar: 'من 3 إلى 6 أشهر' },
  flexible:         { en: 'No fixed deadline',   ar: 'بلا موعد محدد' },
}

const TALK_WA_TEXT_EN = 'Hello! I would like to talk about a project.'
const TALK_WA_TEXT_AR = 'مرحباً! أرغب في الحديث عن مشروع.'

type Mode = 'start' | 'structured' | 'idea' | 'talk'

interface ContactClientProps {
  locale: string
  settings?: PublicSettings
}

interface FormState {
  name: string
  email: string
  contact_preference: ContactPreference
  phone: string
  company_name: string
  budget_range: BudgetRange | ''
  timeline: Timeline | ''
  request_type: RequestType | ''
  message: string
  details: Record<string, string>
}

const emptyForm: FormState = {
  name: '',
  email: '',
  contact_preference: 'email',
  phone: '',
  company_name: '',
  budget_range: '',
  timeline: '',
  request_type: '',
  message: '',
  details: {},
}

const steps: Array<{ id: Mode; icon: string; titleEn: string; titleAr: string; descEn: string; descAr: string }> = [
  {
    id: 'structured', icon: '🎯',
    titleEn: 'I know what I need',     titleAr: 'أعرف ما أحتاجه',
    descEn: 'Pick the right project type and describe the essentials.',
    descAr: 'اختر نوع المشروع المناسب ووصف الأساسيات.',
  },
  {
    id: 'idea', icon: '💡',
    titleEn: 'I have an idea',         titleAr: 'لديّ فكرة',
    descEn: 'Not sure about the details yet? A rough description is fine.',
    descAr: 'لست متأكداً من التفاصيل بعد؟ وصف تقريبي يكفي.',
  },
  {
    id: 'talk', icon: '💬',
    titleEn: "I'd rather talk first", titleAr: 'أفضّل التواصل المباشر',
    descEn: 'Prefer a direct conversation? Reach us instantly.',
    descAr: 'تفضل محادثة فورية؟ تواصل معنا مباشرة.',
  },
]

export default function ContactClient({ locale, settings }: ContactClientProps) {
  const ar   = locale === 'ar'
  const la   = (pair: { en: string; ar: string }) => (ar ? pair.ar : pair.en)
  const str  = (en: string, arText: string) => (ar ? arText : en)

  const contactEmail = settings?.contacts?.support_email ?? 'cantactys@gmail.com'
  const salesEmail   = settings?.contacts?.sales_email ?? undefined
  const waNumber     = waDigits(settings?.contacts?.whatsapp_number)
  const waDisplay    = settings?.contacts?.whatsapp_display ?? waNumber ?? '—'
  const emailValue   = salesEmail || contactEmail

  const [mode, setMode] = useState<Mode>('start')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const set   = (patch: Partial<FormState>) => setForm(p => ({ ...p, ...patch }))
  const questions = form.request_type ? CONTEXTUAL_QUESTIONS[form.request_type] : undefined

  const waHref  = (text: string) => (waDigits(settings?.contacts?.whatsapp_number) ? `https://wa.me/${waDigits(settings?.contacts?.whatsapp_number)}?text=${encodeURIComponent(text)}` : null)
  const talkHref = waHref(ar ? TALK_WA_TEXT_AR : TALK_WA_TEXT_EN)
  const followUpHref = waHref(ar ? 'مرحباً! أودّ متابعة طلبي المتعلّق بمشروع.' : 'Hello! I would like to follow up on my project request.')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('idle')

    if (mode === 'structured' && !form.request_type) {
      setStatus('error')
      return
    }

    setLoading(true)
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      contact_preference: form.contact_preference,
      message: form.message.trim(),
      type: 'general',
    }
    if (form.contact_preference === 'whatsapp') payload.phone = form.phone.trim()
    if (form.company_name.trim()) payload.company_name = form.company_name.trim()
    if (form.budget_range) payload.budget_range = form.budget_range
    if (form.timeline) payload.timeline = form.timeline
    if (mode === 'structured') {
      payload.request_type = form.request_type
      const details = Object.fromEntries(
        Object.entries(form.details).filter(([, v]) => v.trim() !== ''),
      )
      if (Object.keys(details).length > 0) payload.details = details
    }

    try {
      await api.contact(payload, ar ? 'ar' : 'en')
      setStatus('success')
      setForm(emptyForm)
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, htmlFor: string, children: React.ReactNode) => (
    <div>
      <label
        htmlFor={htmlFor}
        style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground-subtle)', marginBottom: '0.375rem' }}
      >
        {label}
      </label>
      {children}
    </div>
  )

  const selectField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: Array<{ value: string; label: string }>,
    ariaLabel: string,
  ) => (
    <div>
      <label htmlFor={`f-${ariaLabel}`} style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground-subtle)', marginBottom: '0.375rem' }}>{label}</label>
      <select id={`f-${ariaLabel}`} aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value)} className="input-base">
        <option value="">{ar ? '— اختر —' : '— select —'}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      {/* Hero */}
      <PageHero
        headingId="contact-heading"
        eyebrow={str('Contact', 'تواصل معنا')}
        title={str('Tell us about your project', 'أخبرنا عن مشروعك')}
        description={str(
          'A precise request, a rough idea, or a direct conversation — we usually get back to you promptly.',
          'طلب محدد، فكرة تقريبية، أو محادثة مباشرة — نعاود التواصل معك عادةً في أقرب وقت.',
        )}
      />

      <section className="section-sm">
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Info */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {talkHref && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} aria-hidden="true">📱</span>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>WhatsApp</p>
                    <a href={talkHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9375rem', color: 'var(--color-accent)', textDecoration: 'none' }}>{waDisplay}</a>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} aria-hidden="true">✉️</span>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                    {str('Email', 'البريد الإلكتروني')}
                  </p>
                  <a href={`mailto:${emailValue}`} style={{ fontSize: '0.9375rem', color: 'var(--color-accent)', textDecoration: 'none' }}>{emailValue}</a>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} aria-hidden="true">🌐</span>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                    {str('Website', 'الموقع')}
                  </p>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--color-foreground)' }}>ys-systems.com</p>
                </div>
              </div>
            </aside>

            {/* Main column */}
            <div className="lg:col-span-2">
              {status === 'success' ? (
                // ── Success (shared by all paths) ───────────────────
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div
                    role="status"
                    style={{ padding: '1.5rem', borderRadius: '1rem', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: '1rem', fontWeight: 500 }}
                  >
                    {str('✓ Your request was sent. We will get back to you soon.', '✓ تم إرسال طلبك بنجاح. سنرد عليك قريباً.')}
                  </div>
                  {followUpHref && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
                        {str('For a faster reply:', 'للحصول على رد أسرع:')}
                      </span>
                      <a
                        href={followUpHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: 8, backgroundColor: '#25D366', color: '#fff', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              ) : mode === 'start' ? (
                /* ─────────── Step 0: choose a path ─────────── */
                <div>
                  <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', marginBottom: '0.25rem' }}>
                    {str('How would you like to start?', 'كيف تريد أن تبدأ؟')}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginBottom: '1.25rem' }}>
                    {str('Choose the option that suits you — you can switch at any time.', 'اختر الطريقة الأنسب لك — يمكنك تغييرها في أي وقت.')}
                  </p>
                  <div role="group" aria-label={str('How to start', 'طريقة البدء')} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {steps.map(step => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setMode(step.id)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '1rem', textAlign: 'start', width: '100%',
                          padding: '1rem 1.25rem', borderRadius: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
                          border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)',
                          color: 'var(--color-foreground)', transition: 'border-color 150ms, background-color 150ms',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} aria-hidden="true">{step.icon}</span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{str(step.titleEn, step.titleAr)}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>{str(step.descEn, step.descAr)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : mode === 'talk' ? (
                /* ─────────── Path C: talk first ─────────── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', marginBottom: '0.25rem' }}>
                      {str('Prefer a direct conversation?', 'تفضّل محادثة مباشرة؟')}
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
                      {str('Pick the easiest channel — one tap away.', 'اختر الطريقة الأسهل لك — بنقرة واحدة.')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {talkHref && (
                      <a
                        href={talkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                          padding: '1.25rem', borderRadius: '0.75rem', textDecoration: 'none',
                          border: '1px solid rgba(37,211,102,0.35)', backgroundColor: 'rgba(37,211,102,0.08)',
                        }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: '#0E7A3D', fontSize: '0.9375rem' }}>{str('WhatsApp', 'واتساب')}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>{waDisplay}</span>
                        </span>
                        <span style={{ fontSize: '1.5rem' }} aria-hidden="true">💬</span>
                      </a>
                    )}
                    <a
                      href={`mailto:${emailValue}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                        padding: '1.25rem', borderRadius: '0.75rem', textDecoration: 'none',
                        border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)',
                      }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-foreground)', fontSize: '0.9375rem' }}>{str('Email', 'البريد الإلكتروني')}</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>{emailValue}</span>
                      </span>
                      <span style={{ fontSize: '1.5rem' }} aria-hidden="true">✉️</span>
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('start')}
                    style={{ alignSelf: 'flex-start', fontSize: '0.8125rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                  >
                    {str('← Choose another way', '← العودة للخيارات الأخرى')}
                  </button>
                </div>
              ) : (
                /* ─────────── Path A & B: the form ─────────── */
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {status === 'error' && (
                    <div role="alert" style={{ padding: '1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', fontSize: '0.875rem' }}>
                      {str(
                        mode === 'structured' && !form.request_type
                          ? 'Please pick a project type before sending.'
                          : 'Failed to send the request. Please check the fields and try again.',
                        mode === 'structured' && !form.request_type
                          ? 'يرجى اختيار نوع المشروع قبل الإرسال.'
                          : 'تعذّر إرسال الطلب. يرجى التحقق من الحقول والمحاولة مجدداً.',
                      )}
                    </div>
                  )}

                  <div>
                    <h2 className="font-display font-semibold" style={{ fontSize: '1.125rem', color: 'var(--color-foreground)', marginBottom: '0.25rem' }}>
                      {mode === 'structured'
                        ? str('Request your project', 'اطلب مشروعك')
                        : str('Describe your idea', 'صفّ فكرتك')}
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginBottom: '1rem' }}>
                      {mode === 'structured'
                        ? str('The more detail you give, the faster we can respond with something useful.', 'كلما أوضحت التفاصيل، ردّنا أسرع بما يفيدك.')
                        : str('A rough description is enough — we will help you narrow it down.', 'وصف تقريبي يكفي — سنساعدك في بلورته.')}
                    </p>
                  </div>

                  {/* Type picker — structured path only */}
                  {mode === 'structured' && (
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
                        {str('What do you need?', 'ماذا تحتاج؟')}
                      </p>
                      <div role="group" aria-label={str('Project type', 'نوع المشروع')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(8.5rem, 1fr))', gap: '0.5rem' }}>
                        {REQUEST_TYPES.map(kind => {
                          const active = form.request_type === kind
                          return (
                            <button
                              key={kind}
                              type="button"
                              aria-pressed={active}
                              onClick={() => set({ request_type: active ? '' : kind })}
                              style={{
                                padding: '0.625rem 0.75rem', borderRadius: 8, cursor: 'pointer',
                                fontSize: '0.8125rem', fontWeight: 500, textAlign: 'start',
                                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                backgroundColor: active ? 'var(--color-accent-subtle)' : 'var(--color-background-subtle)',
                                color: active ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
                                transition: 'all 150ms', fontFamily: 'inherit',
                              }}
                            >
                              {la(TYPE_LABELS[kind])}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Contextual questions — structured path only */}
                  {mode === 'structured' && questions && questions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      {questions.map(([key, q]) => (
                        <div key={key}>
                          <label htmlFor={`q-${key}`} style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground-subtle)', marginBottom: '0.375rem' }}>
                            {la(q)}
                          </label>
                          <input
                            id={`q-${key}`}
                            value={form.details[key] ?? ''}
                            onChange={e => set({ details: { ...form.details, [key]: e.target.value } })}
                            className="input-base"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contact details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {field(str('Full name', 'الاسم الكامل'), 'f-name', (
                      <input id="f-name" required value={form.name} onChange={e => set({ name: e.target.value })} className="input-base" autoComplete="name" />
                    ))}
                    {field(str('Email address', 'البريد الإلكتروني'), 'f-email', (
                      <input id="f-email" required type="email" value={form.email} onChange={e => set({ email: e.target.value })} className="input-base" autoComplete="email" />
                    ))}
                    {field(str('How should we reach you?', 'كيف نتواصل معك؟'), 'f-pref', (
                      <select id="f-pref" value={form.contact_preference} onChange={e => set({ contact_preference: e.target.value as ContactPreference })} className="input-base">
                        {CONTACT_PREFERENCES.map(p => (
                          <option key={p} value={p}>{la(CONTACT_PREF_LABELS[p])}</option>
                        ))}
                      </select>
                    ))}
                    {form.contact_preference === 'whatsapp' && field(str('WhatsApp number', 'رقم واتساب'), 'f-phone', (
                      <input id="f-phone" required type="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} className="input-base" placeholder="+971501234567" autoComplete="tel" />
                    ))}
                    {field(str('Company (optional)', 'اسم الشركة (اختياري)'), 'f-company', (
                      <input id="f-company" value={form.company_name} onChange={e => set({ company_name: e.target.value })} className="input-base" autoComplete="organization" />
                    ))}
                  </div>

                  {/* Budget & timeline — structured path only */}
                  {mode === 'structured' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {selectField(
                        str('Estimated budget (optional)', 'الميزانية التقريبية (اختياري)'),
                        form.budget_range,
                        v => set({ budget_range: v as BudgetRange | '' }),
                        BUDGET_RANGES.map(r => ({ value: r, label: la(BUDGET_LABELS[r]) })),
                        'budget',
                      )}
                      {selectField(
                        str('Expected timeline (optional)', 'الجدول الزمني المتوقع (اختياري)'),
                        form.timeline,
                        v => set({ timeline: v as Timeline | '' }),
                        TIMELINES.map(r => ({ value: r, label: la(TIMELINE_LABELS[r]) })),
                        'timeline',
                      )}
                    </div>
                  )}

                  {/* Message */}
                  {field(str('Project description', 'وصف المشروع'), 'f-message', (
                    <textarea
                      id="f-message"
                      required
                      value={form.message}
                      onChange={e => set({ message: e.target.value })}
                      rows={6}
                      minLength={20}
                      className="input-base"
                      style={{ resize: 'vertical', minHeight: 140 }}
                      placeholder={ar ? 'أخبرنا عن المشروع — الأهداف، النطاق، التفاصيل الحالية…' : 'Tell us about the project — goals, scope, current context…'}
                    />
                  ))}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <Button type="submit" variant="primary" size="lg" loading={loading}>
                      {str('Send request', 'إرسال الطلب')}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setMode('start')}
                      style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                    >
                      {str('← Back', '← رجوع')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}