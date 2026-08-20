'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, ArrowLeft, Plus, Trash2, ImagePlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox, FormSection } from '@/components/admin/FormElements'
import { IconPicker } from '@/components/admin/IconPicker'
import { ColorPicker } from '@/components/admin/ColorPicker'
import { MediaPickerModal } from '@/components/admin/MediaPickerModal'
import { useToast } from '@/components/admin/Toast'
import { adminCreate, adminUpdate } from '@/lib/admin/api'

const RESOURCE = '/admin/products'

export interface ProductFeatureRow {
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
}

export interface ProductPlanRow {
  name_en: string
  name_ar: string
  pricing_type: 'fixed' | 'starting_at' | 'custom_quote' | 'free'
  price: string
  currency: string
  billing_cycle: 'monthly' | 'yearly' | 'one_time' | 'per_project' | ''
  is_featured: boolean
}

export interface ProductMediaRow {
  media_id: string
  kind: 'hero' | 'gallery' | 'screenshot'
}

export interface ProductFormData {
  slug: string
  name_en: string
  name_ar: string
  short_desc_en: string
  short_desc_ar: string
  long_desc_en: string
  long_desc_ar: string
  value_proposition_en: string
  value_proposition_ar: string
  target_audience_en: string
  target_audience_ar: string
  status: 'active' | 'beta' | 'planned' | 'archived'
  icon_key: string | null
  brand_color: string | null
  cover_image_id: string | null
  logo_image_id: string | null
  product_url: string
  documentation_url: string
  support_url: string
  is_featured: boolean
  sort_order: number
  features: ProductFeatureRow[]
  pricing_plans: ProductPlanRow[]
  media: ProductMediaRow[]
}

const emptyForm: ProductFormData = {
  slug: '', name_en: '', name_ar: '',
  short_desc_en: '', short_desc_ar: '',
  long_desc_en: '', long_desc_ar: '',
  value_proposition_en: '', value_proposition_ar: '',
  target_audience_en: '', target_audience_ar: '',
  status: 'planned', icon_key: null, brand_color: null, is_featured: false, sort_order: 0,
  cover_image_id: null, logo_image_id: null,
  product_url: '', documentation_url: '', support_url: '',
  features: [], pricing_plans: [], media: [],
}

const emptyFeature: ProductFeatureRow = { title_en: '', title_ar: '', description_en: '', description_ar: '' }

interface ProductFormProps {
  productId?: string          // present = edit mode
  initialData?: Partial<ProductFormData>
}

export function ProductForm({ productId, initialData }: ProductFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const isEdit = Boolean(productId)

  const [form, setForm]       = useState<ProductFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [picker, setPicker]   = useState<'cover' | 'logo' | 'media' | null>(null)

  const update = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const updateFeature = (i: number, patch: Partial<ProductFeatureRow>) => {
    setForm(prev => ({ ...prev, features: prev.features.map((f, idx) => idx === i ? { ...f, ...patch } : f) }))
  }
  const updatePlan = (i: number, patch: Partial<ProductPlanRow>) => {
    setForm(prev => ({ ...prev, pricing_plans: prev.pricing_plans.map((p, idx) => idx === i ? { ...p, ...patch } : p) }))
  }

  // Auto-generate slug from English name (only if user hasn't manually edited slug)
  const handleNameChange = (value: string) => {
    update('name_en', value)
    if (!slugTouched) {
      const slug = value.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      update('slug', slug)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.slug.trim())    newErrors.slug = 'Slug is required.'
    else if (!/^[a-z0-9-]+$/.test(form.slug)) newErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens only.'
    if (!form.name_en.trim()) newErrors.name_en = 'English name is required.'
    if (!form.name_ar.trim()) newErrors.name_ar = 'Arabic name is required.'
    if (form.brand_color && !/^#[0-9A-Fa-f]{6}$/.test(form.brand_color)) newErrors.brand_color = 'Must be a full 6-digit hex color, e.g. #0A4FE7.'
    // Destination URLs — format check is UX only; backend validates authoritatively.
    const urlRules = { product_url: form.product_url, documentation_url: form.documentation_url, support_url: form.support_url }
    for (const [key, value] of Object.entries(urlRules)) {
      if (value && !/^https?:\/\/.+/i.test(value)) newErrors[key] = 'Must be a valid URL (https://...).'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit ? adminUpdate(`${RESOURCE}/${productId}`, form) : adminCreate(RESOURCE, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCE] })
      show('success', isEdit ? 'Product updated successfully.' : 'Product created successfully.')
      router.push('/admin/products')
    },
    onError: (err) => {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> }
      if (anyErr.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(anyErr.errors).forEach(([key, msgs]) => { fieldErrors[key] = msgs[0] })
        setErrors(fieldErrors)
      }
      show('error', anyErr.message ?? 'Failed to save product.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      show('error', 'Please fix the errors before submitting.')
      return
    }
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/admin/products" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit Product' : 'New Product'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
              {isEdit ? 'Update product information' : 'Add a new product to the catalog'}
            </p>
          </div>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saveMutation.isPending}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>

      <div style={{ maxWidth: '54rem' }}>
        {/* Basic Info */}
        <FormSection title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Name" required error={errors.name_en}>
              <Input value={form.name_en} onChange={e => handleNameChange(e.target.value)} placeholder="YS-Matrix" error={!!errors.name_en} />
            </Field>
            <Field label="Arabic Name" required error={errors.name_ar}>
              <Input value={form.name_ar} onChange={e => update('name_ar', e.target.value)} placeholder="واي إس ماتريكس" dir="rtl" error={!!errors.name_ar} />
            </Field>
          </div>

          <Field label="Slug" required hint="URL-friendly identifier (lowercase, hyphens only)" error={errors.slug}>
            <Input
              value={form.slug}
              onChange={e => { setSlugTouched(true); update('slug', e.target.value) }}
              placeholder="ys-matrix"
              style={{ fontFamily: 'monospace' }}
              error={!!errors.slug}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status">
              <Select value={form.status} onChange={e => update('status', e.target.value as ProductFormData['status'])}>
                <option value="planned">Planned</option>
                <option value="beta">Beta</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Sort Order" hint="Lower numbers appear first">
              <Input type="number" value={form.sort_order} onChange={e => update('sort_order', Number(e.target.value))} min={0} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Card Icon" hint="Shown on the product's card wherever no cover image is set">
              <IconPicker value={form.icon_key} onChange={v => update('icon_key', v)} color={form.brand_color} />
            </Field>
            <Field label="Brand Color" error={errors.brand_color}>
              <ColorPicker value={form.brand_color} onChange={v => update('brand_color', v)} error={errors.brand_color} />
            </Field>
          </div>

          <Checkbox label="Featured product (highlighted on homepage)" checked={form.is_featured} onChange={e => update('is_featured', e.target.checked)} />
        </FormSection>

        {/* Descriptions */}
        <FormSection title="Short Description" description="Shown in product cards and listings (max 500 characters)">
          <Field label="English">
            <Textarea value={form.short_desc_en} onChange={e => update('short_desc_en', e.target.value)} rows={2} maxLength={500} placeholder="A brief, compelling description..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.short_desc_ar} onChange={e => update('short_desc_ar', e.target.value)} rows={2} maxLength={500} dir="rtl" placeholder="وصف موجز وجذاب..." />
          </Field>
        </FormSection>

        <FormSection title="Full Description" description="Shown on the product detail page. Supports basic HTML — sanitized server-side.">
          <Field label="English">
            <Textarea value={form.long_desc_en} onChange={e => update('long_desc_en', e.target.value)} rows={6} placeholder="Detailed product overview..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.long_desc_ar} onChange={e => update('long_desc_ar', e.target.value)} rows={6} dir="rtl" placeholder="نظرة عامة تفصيلية على المنتج..." />
          </Field>
        </FormSection>

        {/* Value proposition */}
        <FormSection title="Value Proposition" description="The one-liner that explains why this product stands out (shown in a highlight band)">
          <Field label="English">
            <Textarea value={form.value_proposition_en} onChange={e => update('value_proposition_en', e.target.value)} rows={2} maxLength={2000} placeholder="Built for teams that outgrow spreadsheets..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.value_proposition_ar} onChange={e => update('value_proposition_ar', e.target.value)} rows={2} maxLength={2000} dir="rtl" placeholder="مصمم للفرق التي تجاوزت جداول البيانات..." />
          </Field>
        </FormSection>

        {/* Target audience */}
        <FormSection title="Target Audience" description="Who this product is for (shown in the sidebar)">
          <Field label="English">
            <Textarea value={form.target_audience_en} onChange={e => update('target_audience_en', e.target.value)} rows={2} maxLength={2000} placeholder="SMBs, operations teams, IT departments..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.target_audience_ar} onChange={e => update('target_audience_ar', e.target.value)} rows={2} maxLength={2000} dir="rtl" placeholder="الشركات الصغيرة والمتوسطة، فرق العمليات..." />
          </Field>
        </FormSection>

        {/* Destination URLs */}
        <FormSection title="Product Links" description="Where users actually use this product. Marketing destinations only — this platform never hosts SaaS code.">
          <Field label="Product URL" hint="The product's own site or app — rendered as 'Launch' on the public page">
            <Input value={form.product_url} onChange={e => update('product_url', e.target.value)} placeholder="https://matrix.example.com" style={{ fontFamily: 'monospace' }} error={!!errors.product_url} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Documentation URL" error={errors.documentation_url}>
              <Input value={form.documentation_url} onChange={e => update('documentation_url', e.target.value)} placeholder="https://docs.example.com" style={{ fontFamily: 'monospace' }} error={!!errors.documentation_url} />
            </Field>
            <Field label="Support URL" error={errors.support_url}>
              <Input value={form.support_url} onChange={e => update('support_url', e.target.value)} placeholder="https://support.example.com" style={{ fontFamily: 'monospace' }} error={!!errors.support_url} />
            </Field>
          </div>
        </FormSection>

        {/* Images */}
        <FormSection title="Images" description="Cover hero + optional logo. Select from the Media Library.">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPicker('cover')}>
              <ImagePlus size={15} /> {form.cover_image_id ? 'Change Cover Image' : 'Choose Cover Image'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPicker('logo')}>
              <ImagePlus size={15} /> {form.logo_image_id ? 'Change Logo' : 'Choose Logo'}
            </Button>
          </div>
          {(form.cover_image_id || form.logo_image_id) && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
              {form.cover_image_id && `Cover: ${form.cover_image_id}. `}
              {form.logo_image_id && `Logo: ${form.logo_image_id}.`}
            </p>
          )}
        </FormSection>

        {/* Features */}
        <FormSection title="Features" description="Key features shown on the product page. Full list is replaced on save.">
          {form.features.map((feature, i) => (
            <div key={i} style={{ padding: '1rem', borderRadius: 12, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={`Feature #${i + 1} — English`}>
                  <Input value={feature.title_en} onChange={e => updateFeature(i, { title_en: e.target.value })} placeholder="Automated Invoicing" />
                </Field>
                <Field label="Arabic">
                  <Input value={feature.title_ar} onChange={e => updateFeature(i, { title_ar: e.target.value })} placeholder="فوترة آلية" dir="rtl" />
                </Field>
              </div>
              <Field label="Description — English">
                <Input value={feature.description_en} onChange={e => updateFeature(i, { description_en: e.target.value })} placeholder="Optional short explanation" />
              </Field>
              <Field label="Description — العربية">
                <Input value={feature.description_ar} onChange={e => updateFeature(i, { description_ar: e.target.value })} placeholder="شرح اختياري موجز" dir="rtl" />
              </Field>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }))} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)', fontSize: '0.8125rem' }}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setForm(prev => ({ ...prev, features: [...prev.features, { ...emptyFeature }] }))}>
            <Plus size={15} /> Add Feature
          </Button>
        </FormSection>

        {/* Pricing plans */}
        <FormSection title="Pricing Plans" description="Pricing presentation shown on the product page (full replace on save). Never floats money.">
          {form.pricing_plans.map((plan, i) => (
            <div key={i} style={{ padding: '1rem', borderRadius: 12, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={`Plan #${i + 1} — English`}>
                  <Input value={plan.name_en} onChange={e => updatePlan(i, { name_en: e.target.value })} placeholder="Pro" />
                </Field>
                <Field label="Arabic">
                  <Input value={plan.name_ar} onChange={e => updatePlan(i, { name_ar: e.target.value })} placeholder="احترافي" dir="rtl" />
                </Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Type">
                  <Select value={plan.pricing_type} onChange={e => updatePlan(i, { pricing_type: e.target.value as ProductPlanRow['pricing_type'] })}>
                    <option value="fixed">Fixed</option>
                    <option value="starting_at">Starting At</option>
                    <option value="custom_quote">Custom Quote</option>
                    <option value="free">Free</option>
                  </Select>
                </Field>
                <Field label="Price">
                  <Input type="number" step="0.01" min="0" value={plan.price} onChange={e => updatePlan(i, { price: e.target.value })} placeholder="19.90" />
                </Field>
                <Field label="Currency">
                  <Input value={plan.currency} onChange={e => updatePlan(i, { currency: e.target.value.toUpperCase() })} placeholder="USD" maxLength={3} style={{ fontFamily: 'monospace' }} />
                </Field>
                <Field label="Cycle">
                  <Select value={plan.billing_cycle} onChange={e => updatePlan(i, { billing_cycle: e.target.value as ProductPlanRow['billing_cycle'] })}>
                    <option value="">—</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One-time</option>
                    <option value="per_project">Per project</option>
                  </Select>
                </Field>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Checkbox label="Featured (highlighted card)" checked={plan.is_featured} onChange={e => updatePlan(i, { is_featured: e.target.checked })} />
                <button type="button" onClick={() => setForm(prev => ({ ...prev, pricing_plans: prev.pricing_plans.filter((_, idx) => idx !== i) }))} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)', fontSize: '0.8125rem' }}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={() => setForm(prev => ({ ...prev, pricing_plans: [...prev.pricing_plans, { name_en: '', name_ar: '', pricing_type: 'fixed', price: '', currency: 'USD', billing_cycle: '', is_featured: false }] }))}>
            <Plus size={15} /> Add Pricing Plan
          </Button>
        </FormSection>

        {/* Media */}
        <FormSection title="Media Attachments" description="Screenshots or gallery images shown on the product page.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {form.media.map((m, i) => (
              <div key={i} style={{ padding: '0.75rem', borderRadius: 10, border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground)', fontFamily: 'monospace' }}>#{i + 1} — {m.media_id}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Field label="Kind">
                    <Select value={m.kind} onChange={e => setForm(prev => ({ ...prev, media: prev.media.map((mm, idx) => idx === i ? { ...mm, kind: e.target.value as ProductMediaRow['kind'] } : mm) }))}>
                      <option value="gallery">Gallery</option>
                      <option value="screenshot">Screenshot</option>
                      <option value="hero">Hero</option>
                    </Select>
                  </Field>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, media: prev.media.filter((_, idx) => idx !== i) }))} style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => setPicker('media')}>
              <Plus size={15} /> Add Media
            </Button>
          </div>
        </FormSection>
      </div>

      <MediaPickerModal
        open={picker !== null}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          if (picker === 'cover') update('cover_image_id', id)
          else if (picker === 'logo') update('logo_image_id', id)
          else if (picker === 'media') setForm(prev => ({ ...prev, media: [...prev.media, { media_id: id, kind: 'gallery' }] }))
          setPicker(null)
        }}
      />
    </form>
  )
}