'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CareerForm, type CareerFormData } from '@/components/admin/CareerForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function EditCareerPage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]       = useState<Partial<CareerFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/careers/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => {
        if (body.success) {
          setData({
            title_en: body.data.title_en,
            title_ar: body.data.title_ar,
            department: body.data.department,
            location: body.data.location,
            type: body.data.type,
            description_en: body.data.description_en ?? '',
            description_ar: body.data.description_ar ?? '',
            requirements: body.data.requirements?.length ? body.data.requirements : [''],
            responsibilities: body.data.responsibilities?.length ? body.data.responsibilities : [''],
            status: body.data.status,
            is_featured: body.data.is_featured,
          })
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (error || !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load listing.</div>

  return <CareerForm careerId={id} initialData={data} />
}
