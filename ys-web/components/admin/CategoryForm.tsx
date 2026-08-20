'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export interface CategoryFormData {
  product_id: string | null
  parent_id: string | null
  slug: string
  title_en: string
  title_ar: string
  sort_order: number
}

const emptyForm: CategoryFormData = {
  product_id: null, parent_id: null, slug: '', title_en: '', title_ar: '', sort_order: 0,
}

interface CategoryFormProps {
  categoryId?: string
  initialData?: Partial<CategoryFormData>
}

export function CategoryForm({ categoryId, initialData }: CategoryFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(categoryId)

  const [form, setForm]     = useState<CategoryFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [products, setProducts]   = useState<{ id: string; name_en: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; title_en: string }[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/products?per_page=100`,        { credentials: 'include', headers: { Accept: 'application/json' } }).then(r => r.json()),
      fetch(`${API}/admin/docs/categories`,               { credentials: 'include', headers: { Accept: 'application/json' } }).then(r => r.json()),
    ]).then(([prodBody, catBody]) => {
      if (prodBody.success) setProducts(prodBody.data)
      if (catBody.success)  setCategories(catBody.data.filter((c: any) => c.id !== categoryId))
    }).catch(() => {})
  }, [categoryId])

  const update = <K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) => {
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
    if (!form.slug.trim())     newErrors.slug = 'Slug is required.'
    else if (!/^[a-z0-9-]+$/.test(form.slug)) newErrors.slug = 'Lowercase letters, numbers, hyphens only.'
    if (!form.title_en.trim()) newErrors.title_en = 'English title is required.'
    if (!form.title_ar.trim()) newErrors.title_ar = 'Arabic title is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix the errors before submitting.'); return }

    setSaving(true)
    const url    = isEdit ? `${API}/admin/docs/categories/${categoryId}` : `${API}/admin/docs/categories`
    const method = isEdit ? 'PUT' : 'POST'
    const payload = { ...form, product_id: form.product_id || null, parent_id: form.parent_id || null }

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
        show('error', body.message ?? 'Failed to save category.')
        return
      }

      show('success', isEdit ? 'Category updated.' : 'Category created.')
      router.push('/admin/docs')
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
          <Link href="/admin/docs" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit Category' : 'New Category'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>Organize documentation into sections</p>
          </div>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Category'}
        </Button>
      </div>

      <div style={{ maxWidth: '36rem' }}>
        <FormSection title="Category Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Title" required error={errors.title_en}>
              <Input value={form.title_en} onChange={e => handleTitleChange(e.target.value)} placeholder="Getting Started" error={!!errors.title_en} />
            </Field>
            <Field label="Arabic Title" required error={errors.title_ar}>
              <Input value={form.title_ar} onChange={e => update('title_ar', e.target.value)} placeholder="البدء السريع" dir="rtl" error={!!errors.title_ar} />
            </Field>
          </div>

          <Field label="Slug" required hint="URL-friendly identifier" error={errors.slug}>
            <Input value={form.slug} onChange={e => { setSlugTouched(true); update('slug', e.target.value) }} placeholder="getting-started" style={{ fontFamily: 'monospace' }} error={!!errors.slug} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product" hint="Leave empty for general docs">
              <Select value={form.product_id ?? ''} onChange={e => update('product_id', e.target.value || null)}>
                <option value="">— General —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name_en}</option>)}
              </Select>
            </Field>
            <Field label="Parent Category" hint="For nested navigation">
              <Select value={form.parent_id ?? ''} onChange={e => update('parent_id', e.target.value || null)}>
                <option value="">— Top Level —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.title_en}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Sort Order" hint="Lower numbers appear first">
            <Input type="number" value={form.sort_order} onChange={e => update('sort_order', Number(e.target.value))} min={0} />
          </Field>
        </FormSection>
      </div>
    </form>
  )
}
