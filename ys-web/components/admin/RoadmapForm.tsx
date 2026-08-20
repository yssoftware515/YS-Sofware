'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export interface RoadmapFormData {
  product_id: string | null
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  target_version: string
  target_quarter: string
  is_public: boolean
}

const emptyForm: RoadmapFormData = {
  product_id: null, title_en: '', title_ar: '', description_en: '', description_ar: '',
  status: 'planned', priority: 'medium', target_version: '', target_quarter: '', is_public: true,
}

interface RoadmapFormProps {
  itemId?: string
  initialData?: Partial<RoadmapFormData>
}

export function RoadmapForm({ itemId, initialData }: RoadmapFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(itemId)

  const [form, setForm]       = useState<RoadmapFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [saving, setSaving]   = useState(false)
  const [products, setProducts] = useState<{ id: string; name_en: string }[]>([])

  useEffect(() => {
    fetch(`${API}/admin/products?per_page=100`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => { if (body.success) setProducts(body.data) })
      .catch(() => {})
  }, [])

  const update = <K extends keyof RoadmapFormData>(key: K, value: RoadmapFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.title_en.trim()) newErrors.title_en = 'English title is required.'
    if (!form.title_ar.trim()) newErrors.title_ar = 'Arabic title is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix the errors before submitting.'); return }

    setSaving(true)
    const url    = isEdit ? `${API}/admin/roadmap/${itemId}` : `${API}/admin/roadmap`
    const method = isEdit ? 'PUT' : 'POST'

    const payload = {
      ...form,
      product_id: form.product_id || null,
      target_version: form.target_version || null,
      target_quarter: form.target_quarter || null,
    }

    try {
      const res  = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()

      if (!res.ok || !body.success) {
        if (body.errors) {
          const fieldErrors: Record<string, string> = {}
          Object.entries(body.errors).forEach(([key, msgs]) => { fieldErrors[key] = (msgs as string[])[0] })
          setErrors(fieldErrors)
        }
        show('error', body.message ?? 'Failed to save roadmap item.')
        return
      }

      show('success', isEdit ? 'Roadmap item updated.' : 'Roadmap item created.')
      router.push('/admin/roadmap')
    } catch {
      show('error', 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/admin/roadmap" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit Roadmap Item' : 'New Roadmap Item'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
              {isEdit ? 'Update roadmap details' : 'Add a new planned feature or milestone'}
            </p>
          </div>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Item'}
        </Button>
      </div>

      <div style={{ maxWidth: '42rem' }}>
        <FormSection title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Title" required error={errors.title_en}>
              <Input value={form.title_en} onChange={e => update('title_en', e.target.value)} placeholder="Real-time notifications" error={!!errors.title_en} />
            </Field>
            <Field label="Arabic Title" required error={errors.title_ar}>
              <Input value={form.title_ar} onChange={e => update('title_ar', e.target.value)} placeholder="إشعارات فورية" dir="rtl" error={!!errors.title_ar} />
            </Field>
          </div>

          <Field label="Product" hint="Leave empty for company-wide items">
            <Select value={form.product_id ?? ''} onChange={e => update('product_id', e.target.value || null)}>
              <option value="">— Company-wide —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name_en}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status">
              <Select value={form.status} onChange={e => update('status', e.target.value as RoadmapFormData['status'])}>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={e => update('priority', e.target.value as RoadmapFormData['priority'])}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Target Version" hint="Optional, e.g. v3.2">
              <Input value={form.target_version} onChange={e => update('target_version', e.target.value)} placeholder="v3.2" style={{ fontFamily: 'monospace' }} />
            </Field>
            <Field label="Target Quarter" hint="Optional, e.g. Q3 2026">
              <Input value={form.target_quarter} onChange={e => update('target_quarter', e.target.value)} placeholder="Q3 2026" />
            </Field>
          </div>

          <Checkbox label="Publicly visible on roadmap page" checked={form.is_public} onChange={e => update('is_public', e.target.checked)} />
        </FormSection>

        <FormSection title="Description">
          <Field label="English">
            <Textarea value={form.description_en} onChange={e => update('description_en', e.target.value)} rows={3} placeholder="Brief description of this roadmap item..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.description_ar} onChange={e => update('description_ar', e.target.value)} rows={3} dir="rtl" placeholder="وصف موجز لهذا العنصر..." />
          </Field>
        </FormSection>
      </div>
    </form>
  )
}
