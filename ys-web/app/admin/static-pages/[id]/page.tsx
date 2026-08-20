'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { SectionCard } from '@/components/admin/SectionCard'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { adminGet, adminUpdate, API } from '@/lib/admin/api'
import type { StaticPage } from '@/types'

interface PageData {
  slug: string
  title_en: string
  title_ar: string
  excerpt_en: string
  excerpt_ar: string
  content_en: string
  content_ar: string
  status: 'draft' | 'published' | 'archived'
  cover_media_id: string | null
}

export default function EditStaticPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { show } = useToast()
  const isNew = id === 'new'

  const [form, setForm] = useState<PageData>({
    slug: '', title_en: '', title_ar: '', excerpt_en: '', excerpt_ar: '',
    content_en: '', content_ar: '', status: 'draft', cover_media_id: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (isNew) return
    adminGet<StaticPage>(`/admin/static-pages/${id}`).then(data => {
      setForm({
        slug: data.slug,
        title_en: data.title,
        title_ar: (data as any).title_ar ?? '',
        excerpt_en: data.excerpt ?? '',
        excerpt_ar: (data as any).excerpt_ar ?? '',
        content_en: data.content ?? '',
        content_ar: (data as any).content_ar ?? '',
        status: (data as any).status ?? 'draft',
        cover_media_id: (data as any).cover_media_id ?? null,
      })
    }).catch(() => {
      show('error', 'Failed to load page.')
      router.push('/admin/static-pages')
    }).finally(() => setLoading(false))
  }, [id, isNew, router, show])

  const update = <K extends keyof PageData>(key: K, value: PageData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.slug.trim()) e.slug = 'Slug is required.'
    if (!form.title_en.trim()) e.title_en = 'English title is required.'
    if (!form.title_ar.trim()) e.title_ar = 'Arabic title is required.'
    if (!form.content_en.trim()) e.content_en = 'English content is required.'
    if (!form.content_ar.trim()) e.content_ar = 'Arabic content is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix errors.'); return }

    setSaving(true)
    try {
      const url = isNew ? `${API}/admin/static-pages` : `${API}/admin/static-pages/${id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
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
      show('success', isNew ? 'Page created.' : 'Page updated.')
      router.push('/admin/static-pages')
    } catch {
      show('error', 'Network error.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isNew ? 'New Page' : 'Edit Page'}
        subtitle={isNew ? 'Create a new CMS page' : `Editing: ${form.title_en}`}
        backHref="/admin/static-pages"
        actions={
          <Button type="submit" variant="primary" size="sm" loading={saving}>
            <Save size={15} /> {isNew ? 'Create Page' : 'Save Changes'}
          </Button>
        }
      />

      <div style={{ maxWidth: '46rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SectionCard title="Page Settings">
          <Field label="Slug" required hint="URL path (e.g., about, privacy)" error={errors.slug}>
            <Input value={form.slug} onChange={e => update('slug', e.target.value)} placeholder="about" style={{ fontFamily: 'monospace' }} />
          </Field>

          <Field label="Status">
            <Select value={form.status} onChange={e => update('status', e.target.value as PageData['status'])}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
        </SectionCard>

        <SectionCard title="Content">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Title" required error={errors.title_en}>
              <Input value={form.title_en} onChange={e => update('title_en', e.target.value)} placeholder="About Us" />
            </Field>
            <Field label="Arabic Title" required error={errors.title_ar}>
              <Input value={form.title_ar} onChange={e => update('title_ar', e.target.value)} placeholder="عن الشركة" dir="rtl" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Excerpt" hint="Short description for listings">
              <Textarea value={form.excerpt_en} onChange={e => update('excerpt_en', e.target.value)} rows={2} placeholder="Brief summary..." />
            </Field>
            <Field label="Arabic Excerpt">
              <Textarea value={form.excerpt_ar} onChange={e => update('excerpt_ar', e.target.value)} rows={2} dir="rtl" placeholder="ملخص مختصر..." />
            </Field>
          </div>

          <Field label="English Content" required error={errors.content_en}>
            <Textarea value={form.content_en} onChange={e => update('content_en', e.target.value)} rows={12} placeholder="Page content (HTML supported)..." style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }} />
          </Field>

          <Field label="Arabic Content" required error={errors.content_ar}>
            <Textarea value={form.content_ar} onChange={e => update('content_ar', e.target.value)} rows={12} dir="rtl" placeholder="محتوى الصفحة..." style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }} />
          </Field>
        </SectionCard>
      </div>
    </form>
  )
}
