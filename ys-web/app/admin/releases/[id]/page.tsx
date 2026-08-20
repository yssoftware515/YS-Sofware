'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ReleaseForm, type ReleaseFormData } from '@/components/admin/ReleaseForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function EditReleasePage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]       = useState<Partial<ReleaseFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/releases/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => {
        if (body.success) {
          const changelog = body.data.changelog ?? {}
          setData({
            product_id: body.data.product_id,
            version: body.data.version,
            release_date: body.data.release_date,
            type: body.data.type,
            release_notes_en: body.data.release_notes_en ?? '',
            release_notes_ar: body.data.release_notes_ar ?? '',
            improvements: changelog.improvements?.length ? changelog.improvements : [''],
            fixes: changelog.fixes?.length ? changelog.fixes : [''],
            breaking: changelog.breaking?.length ? changelog.breaking : [''],
            is_published: body.data.is_published,
          })
        } else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (error || !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load release.</div>

  return <ReleaseForm releaseId={id} initialData={data} />
}
