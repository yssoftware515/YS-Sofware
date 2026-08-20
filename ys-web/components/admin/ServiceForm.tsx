'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, ArrowLeft, ImagePlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox, FormSection } from '@/components/admin/FormElements'
import { MediaPickerModal } from '@/components/admin/MediaPickerModal'
import { useToast } from '@/components/admin/Toast'
import { adminCreate, adminUpdate } from '@/lib/admin/api'

const RESOURCE = '/admin/services'

export interface ServiceFormData {
  slug: string
  name_en: string
  name_ar: string
  category: string
  service_class: '' | 'custom' | 'product' | 'subscription'
  short_desc_en: string
  short_desc_ar: string
  description_en: string
  description_ar: string
  cover_image_id: string | null
  pricing_type: 'custom_quote' | 'starting_at' | 'fixed' | 'hourly'
  starting_price: string
  currency: string
  billing_cycle: 'per_project' | 'per_month' | 'per_hour' | 'custom' | ''
  status: 'active' | 'inactive' | 'archived'
  is_featured: boolean
  sort_order: number
}

export const SERVICE_CLASS_LABELS: Record<Exclude<ServiceFormData['service_class'], ''>, string> = {
  custom: 'Custom',
  product: 'Product',
  subscription: 'Subscription',
}

export const SERVICE_CLASS_TYPES = Object.keys(SERVICE_CLASS_LABELS) as Exclude<ServiceFormData['service_class'], ''>[]

const emptyForm: ServiceFormData = {
  slug: '', name_en: '', name_ar: '', category: '', service_class: '',
  short_desc_en: '', short_desc_ar: '', description_en: '', description_ar: '',
  cover_image_id: null,
  pricing_type: 'custom_quote', starting_price: '', currency: 'USD', billing_cycle: '',
  status: 'inactive', is_featured: false, sort_order: 0,
}

interface ServiceFormProps {
  serviceId?: string
  initialData?: Partial<ServiceFormData>
}

export function ServiceForm({ serviceId, initialData }: ServiceFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const isEdit = Boolean(serviceId)

const [form, setForm]       = useState<ServiceFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [coverOpen, setCoverPicker] = useState(false)

  const update = <K extends keyof ServiceFormData>(key: K, value: ServiceFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  // Auto-generate slug from English name (only if user hasn't edited slug)
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
    if (form.starting_price && Number.isNaN(Number(form.starting_price))) newErrors.starting_price = 'Must be a number.'
    if (form.currency && form.currency.length !== 3) newErrors.currency = 'Must be a 3-letter ISO code, e.g. USD.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit ? adminUpdate(`${RESOURCE}/${serviceId}`, form) : adminCreate(RESOURCE, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCE] })
      show('success', isEdit ? 'Service updated successfully.' : 'Service created successfully.')
      router.push('/admin/services')
    },
    onError: (err) => {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> }
      if (anyErr.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(anyErr.errors).forEach(([key, msgs]) => { fieldErrors[key] = msgs[0] })
        setErrors(fieldErrors)
      }
      show('error', anyErr.message ?? 'Failed to save service.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      show('error', 'Please fix the errors before submitting.')
      return
    }
    // Money: send as string from the client; the backend decimal(12,2)
    // stores it. Empty price → null.
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/admin/services" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit Service' : 'New Service'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
              {isEdit ? 'Update service information' : 'Add a service to the company catalog'}
            </p>
          </div>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saveMutation.isPending}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Service'}
        </Button>
      </div>

      <div style={{ maxWidth: '42rem' }}>
        {/* Basic Info */}
        <FormSection title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Name" required error={errors.name_en}>
              <Input value={form.name_en} onChange={e => handleNameChange(e.target.value)} placeholder="Web Development" error={!!errors.name_en} />
            </Field>
            <Field label="Arabic Name" required error={errors.name_ar}>
              <Input value={form.name_ar} onChange={e => update('name_ar', e.target.value)} placeholder="تطوير مواقع" dir="rtl" error={!!errors.name_ar} />
            </Field>
          </div>

          <Field label="Slug" required hint="URL-friendly identifier (lowercase, hyphens only)" error={errors.slug}>
            <Input
              value={form.slug}
              onChange={e => { setSlugTouched(true); update('slug', e.target.value) }}
              placeholder="web-development"
              style={{ fontFamily: 'monospace' }}
              error={!!errors.slug}
            />
          </Field>

          <Field label="Category" hint="e.g. Web, Mobile, AI, Automation, Design, Consulting">
            <Input value={form.category ?? ''} onChange={e => update('category', e.target.value)} placeholder="AI" />
          </Field>

          <Field label="Business Classification" hint="Admin-only — how this service is sold. Never shown on the public website.">
            <Select value={form.service_class} onChange={e => update('service_class', e.target.value as ServiceFormData['service_class'])}>
              <option value="">Unclassified</option>
              <option value="custom">Custom / external delivery work</option>
              <option value="product">Product-related service</option>
              <option value="subscription">Subscription-style service</option>
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status">
              <Select value={form.status} onChange={e => update('status', e.target.value as ServiceFormData['status'])}>
                <option value="inactive">Inactive</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Sort Order" hint="Lower numbers appear first">
              <Input type="number" value={form.sort_order} onChange={e => update('sort_order', Number(e.target.value))} min={0} />
            </Field>
          </div>

          <Checkbox label="Featured service (highlighted where relevant)" checked={form.is_featured} onChange={e => update('is_featured', e.target.checked)} />
        </FormSection>

        {/* Descriptions */}
        <FormSection title="Short Description" description="Shown in service listings (max 500 characters)">
          <Field label="English">
            <Textarea value={form.short_desc_en} onChange={e => update('short_desc_en', e.target.value)} rows={2} maxLength={500} placeholder="A brief, compelling description..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.short_desc_ar} onChange={e => update('short_desc_ar', e.target.value)} rows={2} maxLength={500} dir="rtl" placeholder="وصف موجز وجذاب..." />
          </Field>
        </FormSection>

        <FormSection title="Full Description" description="Shown on the service detail page — plain text is rendered safely on the public site.">
          <Field label="English">
            <Textarea value={form.description_en} onChange={e => update('description_en', e.target.value)} rows={6} placeholder="What the service covers, process, deliverables..." />
          </Field>
          <Field label="Arabic">
            <Textarea value={form.description_ar} onChange={e => update('description_ar', e.target.value)} rows={6} dir="rtl" placeholder="ما تقدمه الخدمة، مراحل العمل، المخرجات..." />
          </Field>
        </FormSection>

        {/* Pricing */}
        <FormSection title="Pricing" description="Flexible on purpose — most services start as a custom quote.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pricing Type">
              <Select value={form.pricing_type} onChange={e => update('pricing_type', e.target.value as ServiceFormData['pricing_type'])}>
                <option value="custom_quote">Custom Quote</option>
                <option value="starting_at">Starting At</option>
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly</option>
              </Select>
            </Field>
            <Field label="Billing Cycle">
              <Select value={form.billing_cycle} onChange={e => update('billing_cycle', e.target.value as ServiceFormData['billing_cycle'])}>
                <option value="">Not specified</option>
                <option value="per_project">Per Project</option>
                <option value="per_month">Per Month</option>
                <option value="per_hour">Per Hour</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Starting Price" hint="e.g. 950.50 — stored as a decimal string, never float math" error={errors.starting_price}>
              <Input type="number" step="0.01" min="0" value={form.starting_price} onChange={e => update('starting_price', e.target.value)} placeholder="950.50" error={!!errors.starting_price} />
            </Field>
            <Field label="Currency" hint="3-letter ISO code" error={errors.currency}>
              <Input value={form.currency} onChange={e => update('currency', e.target.value.toUpperCase())} placeholder="USD" maxLength={3} style={{ fontFamily: 'monospace' }} error={!!errors.currency} />
            </Field>
          </div>
        </FormSection>

{/* Cover Image */}
        <FormSection title="Cover Image" description="Shown at the top of the service card and detail page">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setCoverPicker(true)}>
              <ImagePlus size={15} /> {form.cover_image_id ? 'Change Cover Image' : 'Choose Cover Image'}
            </Button>
            {form.cover_image_id && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
                Selected: {form.cover_image_id}
              </span>
            )}
          </div>
        </FormSection>
      </div>

      <MediaPickerModal
        open={coverOpen}
        onClose={() => setCoverPicker(false)}
        onSelect={(id) => {
          update('cover_image_id', id)
          setCoverPicker(false)
        }}
      />
    </form>
  )
}