'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { adminCreate, adminList } from '@/lib/admin/api'

const RESOURCE = '/admin/subscriptions'

interface SubscriptionFormData {
  customer_id: string
  product_id: string
  plan_name: string
  price: string
  currency: string
  billing_cycle: 'monthly' | 'quarterly' | 'biannual' | 'yearly'
  starts_at: string
}

const emptyForm: SubscriptionFormData = {
  customer_id: '', product_id: '', plan_name: '', price: '', currency: 'USD',
  billing_cycle: 'monthly', starts_at: new Date().toISOString().slice(0, 10),
}

export function SubscriptionForm() {
  const router = useRouter()
  const { show } = useToast()
  const queryClient = useQueryClient()

  const [form, setForm]     = useState<SubscriptionFormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string }[]>([])
  const [products, setProducts]   = useState<{ id: string; name_en: string }[]>([])

  useEffect(() => {
    adminList<{ id: string; name: string; email: string }>('/admin/customers', { per_page: '200' })
      .then(setCustomers).catch(() => {})
    adminList<{ id: string; name_en: string }>('/admin/products', { per_page: '100' })
      .then(setProducts).catch(() => {})
  }, [])

  const update = <K extends keyof SubscriptionFormData>(key: K, value: SubscriptionFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const saveMutation = useMutation({
    mutationFn: () => adminCreate(RESOURCE, { ...form, price: form.price }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCE] })
      show('success', 'Subscription created.')
      router.push('/admin/subscriptions')
    },
    onError: (err) => {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> }
      if (anyErr.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(anyErr.errors).forEach(([k, msgs]) => { fieldErrors[k] = msgs[0] })
        setErrors(fieldErrors)
      }
      show('error', anyErr.message ?? 'Failed to create subscription.')
    },
  })

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.customer_id) newErrors.customer_id = 'Select a customer.'
    if (!form.product_id)  newErrors.product_id  = 'Select a product.'
    if (!form.plan_name.trim()) newErrors.plan_name = 'Plan name is required.'
    if (!form.price || parseFloat(form.price) < 0) newErrors.price = 'Enter a valid price.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '32rem' }}>
      <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>New Subscription</h1>

      <FormSection title="Subscription Details">
        <Field label="Customer" required error={errors.customer_id}>
          <Select value={form.customer_id} onChange={e => update('customer_id', e.target.value)}>
            <option value="">Select a customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
          </Select>
        </Field>

        <Field label="Product" required error={errors.product_id}>
          <Select value={form.product_id} onChange={e => update('product_id', e.target.value)}>
            <option value="">Select a product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name_en}</option>)}
          </Select>
        </Field>

        <Field label="Plan Name" required error={errors.plan_name} hint="e.g. Pro, Enterprise, Starter">
          <Input value={form.plan_name} onChange={e => update('plan_name', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price" required error={errors.price}>
            <Input type="number" step="0.01" min="0" value={form.price} onChange={e => update('price', e.target.value)} />
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={e => update('currency', e.target.value.toUpperCase())} maxLength={3} style={{ fontFamily: 'monospace' }} />
          </Field>
        </div>

        <Field label="Billing Cycle" required>
          <Select value={form.billing_cycle} onChange={e => update('billing_cycle', e.target.value as SubscriptionFormData['billing_cycle'])}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly (3 months)</option>
            <option value="biannual">Biannual (6 months)</option>
            <option value="yearly">Yearly</option>
          </Select>
        </Field>

        <Field label="Start Date" required hint="Renewal date is calculated automatically from the billing cycle">
          <Input type="date" value={form.starts_at} onChange={e => update('starts_at', e.target.value)} />
        </Field>
      </FormSection>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button type="submit" variant="primary" size="sm" loading={saveMutation.isPending}>
          <Save size={15} /> Create Subscription
        </Button>
      </div>
    </form>
  )
}
