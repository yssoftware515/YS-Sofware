'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { useAdminList } from '@/lib/hooks/useAdminResource'
import { adminCreate, adminUpdate } from '@/lib/admin/api'

const RESOURCE = '/admin/projects'

export const PROJECT_TYPES = [
  'website', 'web_platform', 'mobile_app', 'custom_software', 'ai_solution',
  'ai_automation', 'ui_ux', 'branding', 'integration', 'other',
] as const
export type ProjectType = typeof PROJECT_TYPES[number]

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  website:         'Website',
  web_platform:    'Web Platform',
  mobile_app:      'Mobile App',
  custom_software: 'Custom Software',
  ai_solution:     'AI Solution',
  ai_automation:   'AI Automation',
  ui_ux:           'UI/UX Design',
  branding:        'Branding',
  integration:     'Integration',
  other:           'Other',
}

export const PROJECT_STATUSES = ['draft', 'active', 'on_hold', 'completed', 'cancelled'] as const
export type ProjectStatus = typeof PROJECT_STATUSES[number]

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft:     'Draft',
  active:    'Active',
  on_hold:   'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export interface ProjectFormData {
  name: string
  customer_id: string
  project_type: ProjectType | ''
  description: string
  start_date: string
  expected_completion_date: string
  quoted_value: string
  currency: string
  internal_notes: string
  status: ProjectStatus
  service_ids: string[]
}

const emptyForm: ProjectFormData = {
  name: '',
  customer_id: '',
  project_type: '',
  description: '',
  start_date: '',
  expected_completion_date: '',
  quoted_value: '',
  currency: 'USD',
  internal_notes: '',
  status: 'active',
  service_ids: [],
}

interface AdminCustomerOption { id: string; name: string; email: string }
interface AdminServiceOption { id: string; name_en: string }

function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

interface ProjectFormProps {
  projectId?: string
  initialData?: Omit<Partial<ProjectFormData>, 'quoted_value'> & { quoted_value?: unknown }
  canViewFinancials?: boolean
}

export function ProjectForm({ projectId, initialData, canViewFinancials = true }: ProjectFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const isEdit = Boolean(projectId)

  const { data: customers = [] } = useAdminList<AdminCustomerOption>('/admin/customers', { per_page: '100' })
  const { data: services = [] } = useAdminList<AdminServiceOption>('/admin/services', { per_page: '100' })

  const [form, setForm] = useState<ProjectFormData>({
    ...emptyForm,
    ...initialData,
    start_date: toDateInput(initialData?.start_date),
    expected_completion_date: toDateInput(initialData?.expected_completion_date),
    quoted_value: initialData?.quoted_value != null ? String(initialData.quoted_value) : '',
    service_ids: initialData?.service_ids ?? [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = <K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const toggleService = (id: string) => {
    setForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(id)
        ? prev.service_ids.filter(s => s !== id)
        : [...prev.service_ids, id],
    }))
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      // A user without view_financials must never write quoted_value/currency —
      // the API omits them from reads, so this form must not send stale/blank
      // values that would clobber the stored record (or fail validation).
      // JSON.stringify drops undefined keys, so the payload omits them.
      const payload = canViewFinancials
        ? form
        : { ...form, quoted_value: undefined, currency: undefined }
      return isEdit ? adminUpdate(`${RESOURCE}/${projectId}`, payload) : adminCreate(RESOURCE, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCE] })
      show('success', isEdit ? 'Project updated.' : 'Project created.')
      router.push('/admin/projects')
    },
    onError: (err) => {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> }
      if (anyErr.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(anyErr.errors).forEach(([k, msgs]) => { fieldErrors[k] = msgs[0] })
        setErrors(fieldErrors)
      }
      show('error', anyErr.message ?? 'Failed to save project.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setErrors({ name: 'Name is required.' })
      return
    }
    if (!form.customer_id) {
      setErrors({ customer_id: 'Choose the customer this project belongs to.' })
      return
    }
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '36rem' }}>
      <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
        {isEdit ? 'Edit Project' : 'New Project'}
      </h1>

      <FormSection title="Engagement" description="Who the project is for and what is being delivered.">
        <Field label="Project name" required error={errors.name} hint="Internal working title, e.g. “Acme e-commerce platform”.">
          <Input value={form.name} onChange={e => update('name', e.target.value)} error={!!errors.name} />
        </Field>
        <Field label="Customer" required error={errors.customer_id}>
          <Select value={form.customer_id} onChange={e => update('customer_id', e.target.value)} error={!!errors.customer_id}>
            <option value="">Select a customer...</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
            ))}
          </Select>
        </Field>
        <Field label="Project type">
          <Select value={form.project_type} onChange={e => update('project_type', e.target.value as ProjectType)}>
            <option value="">Not classified yet</option>
            {PROJECT_TYPES.map(t => (
              <option key={t} value={t}>{PROJECT_TYPE_LABELS[t]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4} />
        </Field>
      </FormSection>

      <FormSection title="Schedule" description="Planned delivery window — dates adjust freely as work progresses.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Start date">
            <Input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
          </Field>
          <Field label="Expected completion" error={errors.expected_completion_date}>
            <Input type="date" value={form.expected_completion_date} onChange={e => update('expected_completion_date', e.target.value)} error={!!errors.expected_completion_date} />
          </Field>
        </div>
      </FormSection>

      {form.status !== 'completed' && (
        <FormSection title="Status" description="Where the engagement stands right now.">
          <Field label="Status">
            <Select value={form.status} onChange={e => update('status', e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
        </FormSection>
      )}

      {canViewFinancials && (
        <FormSection title="Commercial record" description="Recorded value of the engagement for business review — not an invoice.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 6rem', gap: '1rem' }}>
            <Field label="Quoted value" error={errors.quoted_value}>
              <Input type="number" min="0" step="0.01" value={form.quoted_value} onChange={e => update('quoted_value', e.target.value)} error={!!errors.quoted_value} />
            </Field>
            <Field label="Currency">
              <Input maxLength={3} value={form.currency} onChange={e => update('currency', e.target.value.toUpperCase())} />
            </Field>
          </div>
        </FormSection>
      )}

      <FormSection title="Services involved" description="Which of your service lines this project draws on.">
        {services.length === 0 ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>No services available yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {services.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-foreground)' }}>
                <input type="checkbox" checked={form.service_ids.includes(s.id)} onChange={() => toggleService(s.id)} style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }} />
                {s.name_en}
              </label>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title="Internal notes" description="Visible only to staff — never to the customer.">
        <Field label="Internal notes">
          <Textarea value={form.internal_notes} onChange={e => update('internal_notes', e.target.value)} rows={3} />
        </Field>
      </FormSection>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button type="submit" variant="primary" size="sm" loading={saveMutation.isPending}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}