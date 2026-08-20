'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { SectionCard } from '@/components/admin/SectionCard'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { API } from '@/lib/admin/api'
import { FAQ_STATUSES, DEFAULT_FAQ_STATUS, type FaqStatus } from '@/lib/admin/faq'

interface FaqFormData {
  question_en: string
  question_ar: string
  answer_en: string
  answer_ar: string
  highlight_en: string
  highlight_ar: string
  category: string
  status: FaqStatus
  sort_order: number
}

interface FaqFormProps {
  faqId?: string
  initialData?: Partial<FaqFormData>
}

export function FaqForm({ faqId, initialData }: FaqFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(faqId)

  const [form, setForm] = useState<FaqFormData>({
    question_en: '', question_ar: '', answer_en: '', answer_ar: '',
    highlight_en: '', highlight_ar: '',
    category: '', status: DEFAULT_FAQ_STATUS, sort_order: 0,
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof FaqFormData>(k: K, v: FaqFormData[K]) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.question_en.trim()) e.question_en = 'Required.'
    if (!form.question_ar.trim()) e.question_ar = 'Required.'
    if (!form.answer_en.trim()) e.answer_en = 'Required.'
    if (!form.answer_ar.trim()) e.answer_ar = 'Required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix errors.'); return }
    setSaving(true)
    try {
      const url = isEdit ? `${API}/admin/faqs/${faqId}` : `${API}/admin/faqs`
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        if (body.errors) {
          const fe: Record<string, string> = {}
          Object.entries(body.errors).forEach(([k, msgs]) => { fe[k] = (msgs as string[])[0] })
          setErrors(fe)
        }
        show('error', body.message ?? 'Failed to save.')
        return
      }
      show('success', isEdit ? 'FAQ updated.' : 'FAQ created.')
      router.push('/admin/faq')
    } catch { show('error', 'Network error.') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isEdit ? 'Edit FAQ' : 'New FAQ'}
        subtitle={isEdit ? 'Update this FAQ entry' : 'Add a new frequently asked question'}
        backHref="/admin/faq"
        actions={<Button type="submit" variant="primary" size="sm" loading={saving}><Save size={15} /> {isEdit ? 'Save Changes' : 'Create FAQ'}</Button>}
      />
      <div style={{ maxWidth: '42rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SectionCard title="Question & Answer">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Question" required error={errors.question_en}>
              <Input value={form.question_en} onChange={e => update('question_en', e.target.value)} placeholder="How do I get started?" />
            </Field>
            <Field label="Arabic Question" required error={errors.question_ar}>
              <Input value={form.question_ar} onChange={e => update('question_ar', e.target.value)} placeholder="كيف أبدأ؟" dir="rtl" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Answer" required error={errors.answer_en}>
              <Textarea value={form.answer_en} onChange={e => update('answer_en', e.target.value)} rows={4} placeholder="Detailed answer..." />
            </Field>
            <Field label="Arabic Answer" required error={errors.answer_ar}>
              <Textarea value={form.answer_ar} onChange={e => update('answer_ar', e.target.value)} rows={4} dir="rtl" placeholder="إجابة مفصلة..." />
            </Field>
          </div>
        </SectionCard>
        <SectionCard title="Highlights" description="Optional chips shown when the question is open — separate items with •">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Highlights">
              <Input value={form.highlight_en} onChange={e => update('highlight_en', e.target.value)} placeholder="Design • Build • Systems" />
            </Field>
            <Field label="Arabic Highlights">
              <Input value={form.highlight_ar} onChange={e => update('highlight_ar', e.target.value)} dir="rtl" placeholder="تصميم • بناء • أنظمة" />
            </Field>
          </div>
        </SectionCard>
        <SectionCard title="Organization">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Category" hint="Group similar questions">
              <Input value={form.category} onChange={e => update('category', e.target.value)} placeholder="General, Billing, Support..." />
            </Field>
            <Field label="Sort Order">
              <Input type="number" value={form.sort_order} onChange={e => update('sort_order', Number(e.target.value))} min={0} />
            </Field>
            <Field label="Status" hint="Only published FAQs appear on the public page">
              <Select value={form.status} onChange={e => update('status', e.target.value as FaqStatus)}>
                {FAQ_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </Select>
            </Field>
          </div>
        </SectionCard>
      </div>
    </form>
  )
}
