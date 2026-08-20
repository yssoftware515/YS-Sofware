'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArticleForm, type ArticleFormData } from '@/components/admin/ArticleForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function EditArticlePage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]       = useState<Partial<ArticleFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/docs/articles/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => {
        if (body.success) {
          setData({
            category_id: body.data.category_id,
            slug: body.data.slug,
            title_en: body.data.title_en,
            title_ar: body.data.title_ar,
            content_en: body.data.content_en,
            content_ar: body.data.content_ar,
            version_tag: body.data.version_tag ?? '',
            is_published: body.data.is_published,
            sort_order: body.data.sort_order,
          })
        } else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (error || !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load article.</div>

  return <ArticleForm articleId={id} initialData={data} />
}
