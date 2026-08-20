'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ProductForm, type ProductFormData } from '@/components/admin/ProductForm'
import type { ProductPlanRow, ProductMediaRow } from '@/components/admin/ProductForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface ProductFeatureShape { title_en?: string; title_ar?: string; description_en?: string; description_ar?: string }
type ProductPlanShape = Pick<ProductPlanRow, 'name_en' | 'name_ar' | 'pricing_type' | 'currency' | 'billing_cycle' | 'is_featured'> & { price?: string | null }
type ProductMediaShape = Pick<ProductMediaRow, 'media_id' | 'kind'>

export default function EditProductPage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]       = useState<Partial<ProductFormData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/products/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => {
        if (body.success) {
          setData({
            slug: body.data.slug,
            name_en: body.data.name_en,
            name_ar: body.data.name_ar,
            short_desc_en: body.data.short_desc_en ?? '',
            short_desc_ar: body.data.short_desc_ar ?? '',
            long_desc_en: body.data.long_desc_en ?? '',
            long_desc_ar: body.data.long_desc_ar ?? '',
            value_proposition_en: body.data.value_proposition_en ?? '',
            value_proposition_ar: body.data.value_proposition_ar ?? '',
            target_audience_en: body.data.target_audience_en ?? '',
            target_audience_ar: body.data.target_audience_ar ?? '',
            status: body.data.status,
            icon_key: body.data.icon_key,
            brand_color: body.data.brand_color,
            cover_image_id: body.data.cover_image_id ?? null,
            logo_image_id: body.data.logo_image_id ?? null,
            product_url: body.data.product_url ?? '',
            documentation_url: body.data.documentation_url ?? '',
            support_url: body.data.support_url ?? '',
            is_featured: body.data.is_featured,
            sort_order: body.data.sort_order,
            features: (body.data.features ?? []).map((f: ProductFeatureShape) => ({
              title_en: f.title_en ?? '',
              title_ar: f.title_ar ?? '',
              description_en: f.description_en ?? '',
              description_ar: f.description_ar ?? '',
            })),
            pricing_plans: (body.data.pricing_plans ?? []).map((p: ProductPlanShape) => ({
              name_en: p.name_en ?? '',
              name_ar: p.name_ar ?? '',
              pricing_type: p.pricing_type ?? 'fixed',
              price: p.price ?? '',
              currency: p.currency ?? '',
              billing_cycle: p.billing_cycle ?? '',
              is_featured: Boolean(p.is_featured),
            })),
            media: (body.data.media ?? []).map((m: ProductMediaShape) => ({
              media_id: m.media_id,
              kind: m.kind ?? 'gallery',
            })),
          })
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading product...</div>
  }

  if (error || !data) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load product.</div>
  }

  return <ProductForm productId={id} initialData={data} />
}
