'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Send, Eye } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export interface UpdateFormData {
  product_id: string | null
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  type: 'announcement' | 'blog' | 'news' | 'release'
  is_featured: boolean
}

const emptyForm: UpdateFormData = {
  product_id: null, title_en: '', title_ar: '', content_en: '', content_ar: '',
  type: 'announcement', is_featured: false,
}

interface UpdateFormProps {
  updateId?: string
  initialData?: Partial<UpdateFormData>
  isPublished?: boolean
}

export function UpdateForm({ updateId, initialData, isPublished }: UpdateFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(updateId)

  const [form, setForm]         = useState<UpdateFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [products, setProducts] = useState<{ id: string; name_en: string }[]>([])
  const [published, setPublished] = useState(isPublished ?? false)

  useEffect(() => {
    fetch(`${API}/admin/products?per_page=100`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => { if (body.success) setProducts(body.data) })
      .catch(() => {})
  }, [])

  const update = <K extends keyof UpdateFormData>(key: K, value: UpdateFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.title_en.trim())   newErrors.title_en = 'English title is required.'
    if (!form.title_ar.trim())   newErrors.title_ar = 'Arabic title is required.'
    if (!form.content_en.trim()) newErrors.content_en = 'English content is required.'
    if (!form.content_ar.trim()) newErrors.content_ar = 'Arabic content is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveDraft = async (): Promise<string | null> => {
    if (!validate()) { show('error', 'Please fix the errors before submitting.'); return null }

    setSaving(true)
    const url    = isEdit ? `${API}/admin/updates/${updateId}` : `${API}/admin/updates`
    const method = isEdit ? 'PUT' : 'POST'
    const payload = { ...form, product_id: form.product_id || null }

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
        show('error', body.message ?? 'Failed to save update.')
        return null
      }

      return body.data.id as string
    } catch {
      show('error', 'Network error. Please try again.')
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = await saveDraft()
    if (id) {
      show('success', isEdit ? 'Update saved.' : 'Draft created.')
      router.push('/admin/updates')
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    const id = isEdit ? updateId : await saveDraft()

    if (!id) { setPublishing(false); return }

    try {
      const res   = await fetch(`${API}/admin/updates/${id}/publish`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' } })
      const body  = await res.json()
      if (body.success) {
        show('success', 'Update published successfully.')
        router.push('/admin/updates')
      } else {
        show('error', body.message ?? 'Publish failed.')
      }
    } catch {
      show('error', 'Network error.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <form onSubmit={handleSaveDraft}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/admin/updates" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit Update' : 'New Update'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
              {published ? '🟢 Published' : '⚪ Draft'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Button type="submit" variant="secondary" size="sm" loading={saving}>
            <Save size={15} /> Save Draft
          </Button>
          {!published && (
            <Button type="button" variant="primary" size="sm" loading={publishing} onClick={handlePublish}>
              <Send size={15} /> Publish
            </Button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '42rem' }}>
        <FormSection title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type">
              <Select value={form.type} onChange={e => update('type', e.target.value as UpdateFormData['type'])}>
                <option value="announcement">Announcement</option>
                <option value="blog">Blog</option>
                <option value="news">News</option>
                <option value="release">Release</option>
              </Select>
            </Field>
            <Field label="Related Product" hint="Optional">
              <Select value={form.product_id ?? ''} onChange={e => update('product_id', e.target.value || null)}>
                <option value="">— None —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name_en}</option>)}
              </Select>
            </Field>
          </div>
          <Checkbox label="Featured (highlighted on updates page)" checked={form.is_featured} onChange={e => update('is_featured', e.target.checked)} />
        </FormSection>

        <FormSection title="Content">
          <Field label="English Title" required error={errors.title_en}>
            <Input value={form.title_en} onChange={e => update('title_en', e.target.value)} placeholder="YS-Matrix v2.0 is here" error={!!errors.title_en} />
          </Field>
          <Field label="Arabic Title" required error={errors.title_ar}>
            <Input value={form.title_ar} onChange={e => update('title_ar', e.target.value)} placeholder="إصدار YS-Matrix v2.0" dir="rtl" error={!!errors.title_ar} />
          </Field>
          <Field label="English Content" required error={errors.content_en}>
            <Textarea value={form.content_en} onChange={e => update('content_en', e.target.value)} rows={8} placeholder="Write your announcement..." error={!!errors.content_en} />
          </Field>
          <Field label="Arabic Content" required error={errors.content_ar}>
            <Textarea value={form.content_ar} onChange={e => update('content_ar', e.target.value)} rows={8} dir="rtl" placeholder="اكتب إعلانك..." error={!!errors.content_ar} />
          </Field>
        </FormSection>
      </div>
    </form>
  )
}
