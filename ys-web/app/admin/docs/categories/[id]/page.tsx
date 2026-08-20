'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CategoryForm, type CategoryFormData } from '@/components/admin/CategoryForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function EditCategoryPage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]       = useState<Partial<CategoryFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/docs/categories`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => {
        if (body.success) {
          const cat = body.data.find((c: any) => c.id === id)
          if (cat) {
            setData({
              product_id: cat.product_id,
              parent_id: cat.parent_id,
              slug: cat.slug,
              title_en: cat.title_en,
              title_ar: cat.title_ar,
              sort_order: cat.sort_order,
            })
          } else setError(true)
        } else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (error || !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load category.</div>

  return <CategoryForm categoryId={id} initialData={data} />
}
