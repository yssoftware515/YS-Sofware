'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { SectionCard } from '@/components/admin/SectionCard'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { adminGet, API } from '@/lib/admin/api'
import type { HomepageSection } from '@/types'

interface SectionFormData {
  type: string
  title_en: string
  title_ar: string
  subtitle_en: string
  subtitle_ar: string
  content: string
  sort_order: number
  is_enabled: boolean
}

const typeOptions = [
  { value: 'hero', label: 'Hero' },
  { value: 'capabilities', label: 'What We Do' },
  { value: 'products', label: 'Products' },
  { value: 'services', label: 'Services' },
  { value: 'why_choose', label: 'Why Choose Us' },
  { value: 'process', label: 'How We Work' },
  { value: 'cta', label: 'Call to Action' },
  { value: 'stats', label: 'Statistics' },
]

interface HomepageSectionFormProps {
  sectionId?: string
}

export function HomepageSectionForm({ sectionId }: HomepageSectionFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(sectionId)

  const [form, setForm] = useState<SectionFormData>({
    type: 'hero', title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '',
    content: '{}', sort_order: 0, is_enabled: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (!sectionId) return
    adminGet<HomepageSection>(`/admin/homepage-sections/${sectionId}`).then(data => {
      setForm({
        type: data.type,
        title_en: (data as any).title_en ?? data.title ?? '',
        title_ar: (data as any).title_ar ?? '',
        subtitle_en: (data as any).subtitle_en ?? data.subtitle ?? '',
        subtitle_ar: (data as any).subtitle_ar ?? '',
        content: JSON.stringify(data.content ?? {}, null, 2),
        sort_order: data.sort_order,
        is_enabled: (data as any).is_enabled ?? true,
      })
    }).catch(() => { show('error', 'Failed to load section.'); router.push('/admin/homepage') })
    .finally(() => setLoading(false))
  }, [sectionId, router, show])

  const update = <K extends keyof SectionFormData>(k: K, v: SectionFormData[K]) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n })
    if (k === 'content') setJsonError(null)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.type) e.type = 'Required.'
    if (!form.title_en.trim()) e.title_en = 'Required.'
    if (!form.title_ar.trim()) e.title_ar = 'Required.'
    try { JSON.parse(form.content) } catch { setJsonError('Invalid JSON.'); return false }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix errors.'); return }

    let parsedContent: Record<string, unknown> = {}
    try { parsedContent = JSON.parse(form.content) } catch { setJsonError('Invalid JSON.'); return }

    setSaving(true)
    try {
      const url = isEdit ? `${API}/admin/homepage-sections/${sectionId}` : `${API}/admin/homepage-sections`
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title_en: form.title_en,
          title_ar: form.title_ar,
          subtitle_en: form.subtitle_en,
          subtitle_ar: form.subtitle_ar,
          content: parsedContent,
          sort_order: form.sort_order,
          is_enabled: form.is_enabled,
        }),
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
      show('success', isEdit ? 'Section updated.' : 'Section created.')
      router.push('/admin/homepage')
    } catch { show('error', 'Network error.') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isEdit ? 'Edit Section' : 'New Section'}
        subtitle={isEdit ? `Editing: ${form.title_en || form.type}` : 'Add a new homepage section'}
        backHref="/admin/homepage"
        actions={<Button type="submit" variant="primary" size="sm" loading={saving}><Save size={15} /> {isEdit ? 'Save Changes' : 'Create Section'}</Button>}
      />
      <div style={{ maxWidth: '46rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SectionCard title="Section Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Section Type" required error={errors.type}>
              <select value={form.type} onChange={e => update('type', e.target.value)}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem' }}>
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Sort Order">
              <Input type="number" value={form.sort_order} onChange={e => update('sort_order', Number(e.target.value))} min={0} />
            </Field>
          </div>
          <Checkbox label="Enabled (visible on the homepage)" checked={form.is_enabled} onChange={e => update('is_enabled', e.target.checked)} />
        </SectionCard>

        <SectionCard title="Localized Content">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Title" required error={errors.title_en}>
              <Input value={form.title_en} onChange={e => update('title_en', e.target.value)} placeholder="Hero Section" />
            </Field>
            <Field label="Arabic Title" required error={errors.title_ar}>
              <Input value={form.title_ar} onChange={e => update('title_ar', e.target.value)} placeholder="قسم البطل" dir="rtl" />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Subtitle">
              <Input value={form.subtitle_en} onChange={e => update('subtitle_en', e.target.value)} placeholder="Section subtitle" />
            </Field>
            <Field label="Arabic Subtitle">
              <Input value={form.subtitle_ar} onChange={e => update('subtitle_ar', e.target.value)} placeholder="العنوان الفرعي" dir="rtl" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Content Data (JSON)" description="Section-specific structured data in JSON format">
          <Field label="Content" error={jsonError ?? errors.content}>
            <Textarea
              value={form.content}
              onChange={e => update('content', e.target.value)}
              rows={10}
              style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
            />
          </Field>
        </SectionCard>
      </div>
    </form>
  )
}
