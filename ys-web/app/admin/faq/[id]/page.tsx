'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaqForm } from '../FaqForm'
import { adminGet } from '@/lib/admin/api'
import { useToast } from '@/components/admin/Toast'
import { adminFaqSchema, type AdminFaq } from '@/lib/schemas/admin'

export default function EditFaq({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { show } = useToast()
  const router = useRouter()
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminGet<AdminFaq>(`/admin/faqs/${id}`, { schema: adminFaqSchema })
      .then(data => setInitial({
        question_en: data.question_en,
        question_ar: data.question_ar,
        answer_en: data.answer_en,
        answer_ar: data.answer_ar,
        highlight_en: data.highlight_en ?? '',
        highlight_ar: data.highlight_ar ?? '',
        category: data.category ?? '',
        status: data.status,
        sort_order: data.sort_order ?? 0,
      }))
      .catch(() => { show('error', 'Failed to load FAQ.'); router.push('/admin/faq') })
      .finally(() => setLoading(false))
  }, [id, router, show])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>

  return <FaqForm faqId={id} initialData={initial as any} />
}