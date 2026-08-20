'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { adminCreate, adminUpdate } from '@/lib/admin/api'

const RESOURCE = '/admin/customers'

export type CustomerType = 'individual' | 'company'
export type CustomerStatus = 'active' | 'archived'

export interface CustomerFormData {
  name: string
  email: string
  type: CustomerType
  company: string
  phone: string
  whatsapp: string
  notes: string
  status: CustomerStatus
}

const emptyForm: CustomerFormData = {
  name: '',
  email: '',
  type: 'individual',
  company: '',
  phone: '',
  whatsapp: '',
  notes: '',
  status: 'active',
}

interface CustomerFormProps {
  customerId?: string
  initialData?: Partial<CustomerFormData>
}

export function CustomerForm({ customerId, initialData }: CustomerFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const isEdit = Boolean(customerId)

  const [form, setForm]     = useState<CustomerFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = <K extends keyof CustomerFormData>(key: K, value: CustomerFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const saveMutation = useMutation({
    mutationFn: () => isEdit ? adminUpdate(`${RESOURCE}/${customerId}`, form) : adminCreate(RESOURCE, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCE] })
      show('success', isEdit ? 'Customer updated.' : 'Customer created.')
      router.push('/admin/customers')
    },
    onError: (err) => {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> }
      if (anyErr.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(anyErr.errors).forEach(([k, msgs]) => { fieldErrors[k] = msgs[0] })
        setErrors(fieldErrors)
      }
      show('error', anyErr.message ?? 'Failed to save customer.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setErrors({
        ...(!form.name.trim() ? { name: 'Name is required.' } : {}),
        ...(!form.email.trim() ? { email: 'Email is required.' } : {}),
      })
      return
    }
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '32rem' }}>
      <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
        {isEdit ? 'Edit Customer' : 'New Customer'}
      </h1>

      <FormSection title="Customer Details">
        <Field label="Customer type" hint="Individual people vs companies — drives record display and contact logic.">
          <Select value={form.type} onChange={e => update('type', e.target.value as CustomerType)}>
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </Select>
        </Field>
        <Field label="Name" required error={errors.name}>
          <Input value={form.name} onChange={e => update('name', e.target.value)} error={!!errors.name} placeholder="Jane Doe or Acme Ltd" />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} error={!!errors.email} />
        </Field>
        <Field label="Company">
          <Input value={form.company} onChange={e => update('company', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={e => update('phone', e.target.value)} />
        </Field>
        <Field label="WhatsApp" hint="Optional — used by contact request conversions and the public site.">
          <Input value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3} />
        </Field>
        {isEdit && (
          <Field label="Status">
            <Select value={form.status} onChange={e => update('status', e.target.value as CustomerStatus)}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
        )}
      </FormSection>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button type="submit" variant="primary" size="sm" loading={saveMutation.isPending}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Customer'}
        </Button>
      </div>
    </form>
  )
}
