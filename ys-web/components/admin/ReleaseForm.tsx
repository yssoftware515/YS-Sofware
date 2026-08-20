'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export interface ReleaseFormData {
  product_id: string
  version: string
  release_date: string
  type: 'major' | 'minor' | 'patch' | 'hotfix'
  release_notes_en: string
  release_notes_ar: string
  improvements: string[]
  fixes: string[]
  breaking: string[]
  is_published: boolean
}

const emptyForm: ReleaseFormData = {
  product_id: '', version: '', release_date: new Date().toISOString().slice(0, 10),
  type: 'minor', release_notes_en: '', release_notes_ar: '',
  improvements: [''], fixes: [''], breaking: [''], is_published: false,
}

interface ReleaseFormProps {
  releaseId?: string
  initialData?: Partial<ReleaseFormData>
}

export function ReleaseForm({ releaseId, initialData }: ReleaseFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(releaseId)

  const [form, setForm]     = useState<ReleaseFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<{ id: string; name_en: string; current_version: string | null }[]>([])

  useEffect(() => {
    fetch(`${API}/admin/products?per_page=100`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => { if (body.success) setProducts(body.data) })
      .catch(() => {})
  }, [])

  const update = <K extends keyof ReleaseFormData>(key: K, value: ReleaseFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const updateListItem = (field: 'improvements' | 'fixes' | 'breaking', index: number, value: string) => {
    const list = [...form[field]]
    list[index] = value
    update(field, list)
  }

  const addListItem = (field: 'improvements' | 'fixes' | 'breaking') => {
    update(field, [...form[field], ''])
  }

  const removeListItem = (field: 'improvements' | 'fixes' | 'breaking', index: number) => {
    update(field, form[field].filter((_, i) => i !== index))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.product_id)        newErrors.product_id = 'Product is required.'
    if (!form.version.trim())    newErrors.version = 'Version is required.'
    else if (!/^\d+\.\d+(\.\d+)?(-\w+)?$/.test(form.version)) newErrors.version = 'Use semantic versioning, e.g. 2.1.0 or 2.1.0-beta'
    if (!form.release_date)      newErrors.release_date = 'Release date is required.'
    else if (new Date(form.release_date) > new Date()) newErrors.release_date = 'Release date cannot be in the future.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix the errors before submitting.'); return }

    setSaving(true)
    const url    = isEdit ? `${API}/admin/releases/${releaseId}` : `${API}/admin/releases`
    const method = isEdit ? 'PUT' : 'POST'

    const changelog = {
      improvements: form.improvements.filter(x => x.trim()),
      fixes:        form.fixes.filter(x => x.trim()),
      breaking:     form.breaking.filter(x => x.trim()),
    }

    const payload = isEdit
      ? {
          release_notes_en: form.release_notes_en,
          release_notes_ar: form.release_notes_ar,
          changelog,
          type: form.type,
          is_published: form.is_published,
          release_date: form.release_date,
        }
      : {
          product_id: form.product_id,
          version: form.version,
          release_date: form.release_date,
          type: form.type,
          release_notes_en: form.release_notes_en,
          release_notes_ar: form.release_notes_ar,
          changelog,
          is_published: form.is_published,
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
        show('error', body.message ?? 'Failed to save release.')
        return
      }

      show('success', isEdit ? 'Release updated.' : 'Release created.')
      router.push('/admin/releases')
    } catch {
      show('error', 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedProduct = products.find(p => p.id === form.product_id)

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/admin/releases" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit Release' : 'New Release'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
              {isEdit ? 'Update release notes and status' : 'Publish a new version for a product'}
            </p>
          </div>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Release'}
        </Button>
      </div>

      <div style={{ maxWidth: '42rem' }}>
        <FormSection title="Release Details">
          <Field label="Product" required error={errors.product_id} hint={isEdit ? undefined : 'Cannot be changed after creation'}>
            <Select
              value={form.product_id}
              onChange={e => update('product_id', e.target.value)}
              disabled={isEdit}
              error={!!errors.product_id}
            >
              <option value="">— Select Product —</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name_en} {p.current_version ? `(current: v${p.current_version})` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Version" required hint="Semantic versioning, e.g. 2.1.0" error={errors.version}>
              <Input
                value={form.version}
                onChange={e => update('version', e.target.value)}
                placeholder="2.1.0"
                disabled={isEdit}
                style={{ fontFamily: 'monospace' }}
                error={!!errors.version}
              />
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={e => update('type', e.target.value as ReleaseFormData['type'])}>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="patch">Patch</option>
                <option value="hotfix">Hotfix</option>
              </Select>
            </Field>
          </div>

          <Field label="Release Date" required error={errors.release_date}>
            <Input type="date" value={form.release_date} onChange={e => update('release_date', e.target.value)} error={!!errors.release_date} />
          </Field>

          <Checkbox
            label="Published (visible on public site, becomes the current version)"
            checked={form.is_published}
            onChange={e => update('is_published', e.target.checked)}
          />

          {form.is_published && selectedProduct?.current_version && selectedProduct.current_version !== form.version && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', padding: '0.75rem', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 8 }}>
              ⚠ Publishing this release will replace the current version (v{selectedProduct.current_version}) shown publicly.
            </p>
          )}
        </FormSection>

        <FormSection title="Release Notes">
          <Field label="English">
            <Textarea value={form.release_notes_en} onChange={e => update('release_notes_en', e.target.value)} rows={4} placeholder="Summary of this release..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.release_notes_ar} onChange={e => update('release_notes_ar', e.target.value)} rows={4} dir="rtl" placeholder="ملخص هذا الإصدار..." />
          </Field>
        </FormSection>

        <FormSection title="Changelog" description="Structured list of changes — shown on the changelog page">
          <div>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-foreground)', marginBottom: '0.625rem' }}>Improvements</h4>
            <DynamicList items={form.improvements} onUpdate={(i, v) => updateListItem('improvements', i, v)} onAdd={() => addListItem('improvements')} onRemove={i => removeListItem('improvements', i)} placeholder="e.g. Faster search response times" />
          </div>

          <div>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-foreground)', marginBottom: '0.625rem' }}>Fixes</h4>
            <DynamicList items={form.fixes} onUpdate={(i, v) => updateListItem('fixes', i, v)} onAdd={() => addListItem('fixes')} onRemove={i => removeListItem('fixes', i)} placeholder="e.g. Fixed pagination bug on product list" />
          </div>

          <div>
            <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-error)', marginBottom: '0.625rem' }}>Breaking Changes</h4>
            <DynamicList items={form.breaking} onUpdate={(i, v) => updateListItem('breaking', i, v)} onAdd={() => addListItem('breaking')} onRemove={i => removeListItem('breaking', i)} placeholder="e.g. API endpoint /v1/legacy removed" />
          </div>
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
