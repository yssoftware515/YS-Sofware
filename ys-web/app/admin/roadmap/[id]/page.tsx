'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RoadmapForm, type RoadmapFormData } from '@/components/admin/RoadmapForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function EditRoadmapPage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]       = useState<Partial<RoadmapFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/roadmap/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => {
        if (body.success) {
          setData({
            product_id: body.data.product_id,
            title_en: body.data.title_en,
            title_ar: body.data.title_ar,
            description_en: body.data.description_en ?? '',
            description_ar: body.data.description_ar ?? '',
            status: body.data.status,
            priority: body.data.priority,
            target_version: body.data.target_version ?? '',
            target_quarter: body.data.target_quarter ?? '',
            is_public: body.data.is_public,
          })
        } else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (error || !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load item.</div>

  return <RoadmapForm itemId={id} initialData={data} />
}
