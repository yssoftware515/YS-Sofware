'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ServiceForm, type ServiceFormData } from '@/components/admin/ServiceForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function EditServicePage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]       = useState<Partial<ServiceFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/services/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => {
        if (body.success) {
          setData({
            slug: body.data.slug,
            name_en: body.data.name_en,
            name_ar: body.data.name_ar,
            category: body.data.category ?? '',
            service_class: body.data.service_class ?? '',
            short_desc_en: body.data.short_desc_en ?? '',
            short_desc_ar: body.data.short_desc_ar ?? '',
            description_en: body.data.description_en ?? '',
            description_ar: body.data.description_ar ?? '',
            cover_image_id: body.data.cover_image_id ?? null,
            pricing_type: body.data.pricing_type,
            starting_price: body.data.starting_price ?? '',
            currency: body.data.currency ?? 'USD',
            billing_cycle: body.data.billing_cycle ?? '',
            status: body.data.status,
            is_featured: body.data.is_featured,
            sort_order: body.data.sort_order,
          })
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading service...</div>
  }

  if (error || !data) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load service.</div>
  }

  return <ServiceForm serviceId={id} initialData={data} />
}