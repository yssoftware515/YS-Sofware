'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { UpdateForm, type UpdateFormData } from '@/components/admin/UpdateForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function EditUpdatePage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]           = useState<Partial<UpdateFormData> | null>(null)
  const [isPublished, setIsPub]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/updates/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => {
        if (body.success) {
          setData({
            product_id: body.data.product_id,
            title_en: body.data.title_en,
            title_ar: body.data.title_ar,
            content_en: body.data.content_en,
            content_ar: body.data.content_ar,
            type: body.data.type,
            is_featured: body.data.is_featured,
          })
          setIsPub(Boolean(body.data.published_at))
        } else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (error || !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load update.</div>

  return <UpdateForm updateId={id} initialData={data} isPublished={isPublished} />
}
