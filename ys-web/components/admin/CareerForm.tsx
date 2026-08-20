'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export interface CareerFormData {
  title_en: string
  title_ar: string
  department: string
  location: string
  type: 'full_time' | 'part_time' | 'contract' | 'internship'
  description_en: string
  description_ar: string
  requirements: string[]
  responsibilities: string[]
  status: 'open' | 'closed' | 'draft'
  is_featured: boolean
}

const emptyForm: CareerFormData = {
  title_en: '', title_ar: '', department: '', location: 'Remote',
  type: 'full_time', description_en: '', description_ar: '',
  requirements: [''], responsibilities: [''], status: 'draft', is_featured: false,
}

interface CareerFormProps {
  careerId?: string
  initialData?: Partial<CareerFormData>
}

export function CareerForm({ careerId, initialData }: CareerFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(careerId)

  const [form, setForm]     = useState<CareerFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof CareerFormData>(key: K, value: CareerFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const updateListItem = (field: 'requirements' | 'responsibilities', index: number, value: string) => {
    const list = [...form[field]]
    list[index] = value
    update(field, list)
  }

  const addListItem = (field: 'requirements' | 'responsibilities') => {
    update(field, [...form[field], ''])
  }

  const removeListItem = (field: 'requirements' | 'responsibilities', index: number) => {
    update(field, form[field].filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.title_en.trim())   newErrors.title_en = 'English title is required.'
    if (!form.title_ar.trim())   newErrors.title_ar = 'Arabic title is required.'
    if (!form.department.trim()) newErrors.department = 'Department is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix the errors before submitting.'); return }

    setSaving(true)
    const url    = isEdit ? `${API}/admin/careers/${careerId}` : `${API}/admin/careers`
    const method = isEdit ? 'PUT' : 'POST'

    const payload = {
      ...form,
      requirements: form.requirements.filter(r => r.trim()),
      responsibilities: form.responsibilities.filter(r => r.trim()),
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
        show('error', body.message ?? 'Failed to save career listing.')
        return
      }

      show('success', isEdit ? 'Career listing updated.' : 'Career listing created.')
      router.push('/admin/careers')
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
          <Link href="/admin/careers" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit Career Listing' : 'New Career Listing'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
              {isEdit ? 'Update job listing details' : 'Post a new open position'}
            </p>
          </div>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Listing'}
        </Button>
      </div>

      <div style={{ maxWidth: '42rem' }}>
        <FormSection title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Title" required error={errors.title_en}>
              <Input value={form.title_en} onChange={e => update('title_en', e.target.value)} placeholder="Senior Backend Engineer" error={!!errors.title_en} />
            </Field>
            <Field label="Arabic Title" required error={errors.title_ar}>
              <Input value={form.title_ar} onChange={e => update('title_ar', e.target.value)} placeholder="مهندس باك إند أول" dir="rtl" error={!!errors.title_ar} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Department" required error={errors.department}>
              <Input value={form.department} onChange={e => update('department', e.target.value)} placeholder="Engineering" error={!!errors.department} />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={e => update('location', e.target.value)} placeholder="Remote" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Employment Type">
              <Select value={form.type} onChange={e => update('type', e.target.value as CareerFormData['type'])}>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={e => update('status', e.target.value as CareerFormData['status'])}>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </Select>
            </Field>
          </div>

          <Checkbox label="Featured listing" checked={form.is_featured} onChange={e => update('is_featured', e.target.checked)} />
        </FormSection>

        <FormSection title="Description">
          <Field label="English">
            <Textarea value={form.description_en} onChange={e => update('description_en', e.target.value)} rows={4} placeholder="Role overview..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.description_ar} onChange={e => update('description_ar', e.target.value)} rows={4} dir="rtl" placeholder="نظرة عامة عن الدور..." />
          </Field>
        </FormSection>

        <FormSection title="Requirements" description="List the key qualifications for this role">
          <DynamicList items={form.requirements} onUpdate={(i, v) => updateListItem('requirements', i, v)} onAdd={() => addListItem('requirements')} onRemove={(i) => removeListItem('requirements', i)} placeholder="e.g. 5+ years of experience with Laravel" />
        </FormSection>

        <FormSection title="Responsibilities" description="List the main duties for this role">
          <DynamicList items={form.responsibilities} onUpdate={(i, v) => updateListItem('responsibilities', i, v)} onAdd={() => addListItem('responsibilities')} onRemove={(i) => removeListItem('responsibilities', i)} placeholder="e.g. Design and maintain API architecture" />
        </FormSection>
      </div>
    </form>
  )
}

function DynamicList({
  items, onUpdate, onAdd, onRemove, placeholder,
}: {
  items: string[]; onUpdate: (i: number, v: string) => void; onAdd: () => void; onRemove: (i: number) => void; placeholder: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
          <Input value={item} onChange={e => onUpdate(i, e.target.value)} placeholder={placeholder} aria-label={`${placeholder} item ${i + 1}`} />
          {items.length > 1 && (
            <button type="button" onClick={() => onRemove(i)} aria-label={`Remove item ${i + 1}`} style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)', flexShrink: 0, minWidth: 44, minHeight: 44 }}>
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={onAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', alignSelf: 'flex-start', padding: '0.375rem 0.75rem', borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-accent)' }}>
        <Plus size={14} /> Add item
      </button>
    </div>
  )
}
