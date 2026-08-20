'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Eye } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export interface ArticleFormData {
  category_id: string
  slug: string
  title_en: string
  title_ar: string
  content_en: string
  content_ar: string
  version_tag: string
  is_published: boolean
  sort_order: number
}

const emptyForm: ArticleFormData = {
  category_id: '', slug: '', title_en: '', title_ar: '', content_en: '', content_ar: '',
  version_tag: '', is_published: false, sort_order: 0,
}

interface ArticleFormProps {
  articleId?: string
  initialData?: Partial<ArticleFormData>
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export function ArticleForm({ articleId, initialData }: ArticleFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(articleId)

  const [form, setForm]     = useState<ArticleFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [categories, setCategories] = useState<{ id: string; title_en: string }[]>([])

  useEffect(() => {
    fetch(`${API}/admin/docs/categories`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => { if (body.success) setCategories(body.data) })
      .catch(() => {})
  }, [])

  const update = <K extends keyof ArticleFormData>(key: K, value: ArticleFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const handleTitleChange = (value: string) => {
    update('title_en', value)
    if (!slugTouched) {
      const slug = value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      update('slug', slug)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.category_id)       newErrors.category_id = 'Category is required.'
    if (!form.slug.trim())       newErrors.slug = 'Slug is required.'
    else if (!/^[a-z0-9-]+$/.test(form.slug)) newErrors.slug = 'Lowercase letters, numbers, hyphens only.'
    if (!form.title_en.trim())   newErrors.title_en = 'English title is required.'
    if (!form.title_ar.trim())   newErrors.title_ar = 'Arabic title is required.'
    if (!form.content_en.trim()) newErrors.content_en = 'English content is required.'
    if (!form.content_ar.trim()) newErrors.content_ar = 'Arabic content is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix the errors before submitting.'); return }

    setSaving(true)
    const url    = isEdit ? `${API}/admin/docs/articles/${articleId}` : `${API}/admin/docs/articles`
    const method = isEdit ? 'PUT' : 'POST'
    const payload = { ...form, version_tag: form.version_tag || null }

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
        show('error', body.message ?? 'Failed to save article.')
        return
      }

      show('success', isEdit ? 'Article updated.' : 'Article created.')
      router.push('/admin/docs')
    } catch {
      show('error', 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const readingTime = estimateReadingTime(form.content_en)

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/admin/docs" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit Article' : 'New Article'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
              ~{readingTime} min read · {form.is_published ? '🟢 Published' : '⚪ Draft'}
            </p>
          </div>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Article'}
        </Button>
      </div>

      <div style={{ maxWidth: '46rem' }}>
        <FormSection title="Article Settings">
          <Field label="Category" required error={errors.category_id}>
            <Select value={form.category_id} onChange={e => update('category_id', e.target.value)} error={!!errors.category_id}>
              <option value="">— Select Category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.title_en}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Version Tag" hint="Optional, e.g. v2.x">
              <Input value={form.version_tag} onChange={e => update('version_tag', e.target.value)} placeholder="v2.x" style={{ fontFamily: 'monospace' }} />
            </Field>
            <Field label="Sort Order">
              <Input type="number" value={form.sort_order} onChange={e => update('sort_order', Number(e.target.value))} min={0} />
            </Field>
          </div>

          <Checkbox label="Published (visible on the public docs site)" checked={form.is_published} onChange={e => update('is_published', e.target.checked)} />
        </FormSection>

        <FormSection title="Content">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Title" required error={errors.title_en}>
              <Input value={form.title_en} onChange={e => handleTitleChange(e.target.value)} placeholder="Installation Guide" error={!!errors.title_en} />
            </Field>
            <Field label="Arabic Title" required error={errors.title_ar}>
              <Input value={form.title_ar} onChange={e => update('title_ar', e.target.value)} placeholder="دليل التثبيت" dir="rtl" error={!!errors.title_ar} />
            </Field>
          </div>

          <Field label="Slug" required hint="Must be unique across all articles" error={errors.slug}>
            <Input value={form.slug} onChange={e => { setSlugTouched(true); update('slug', e.target.value) }} placeholder="installation-guide" style={{ fontFamily: 'monospace' }} error={!!errors.slug} />
          </Field>

          <Field label="English Content" required hint="Plain text or basic HTML" error={errors.content_en}>
            <Textarea value={form.content_en} onChange={e => update('content_en', e.target.value)} rows={12} placeholder="Write the article content..." error={!!errors.content_en} style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }} />
          </Field>

          <Field label="Arabic Content" required error={errors.content_ar}>
            <Textarea value={form.content_ar} onChange={e => update('content_ar', e.target.value)} rows={12} dir="rtl" placeholder="اكتب محتوى المقالة..." error={!!errors.content_ar} style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }} />
          </Field>
        </FormSection>
      </div>
    </form>
  )
}
