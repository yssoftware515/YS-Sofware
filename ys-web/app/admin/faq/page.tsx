'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'
import { adminFaqSchema, type AdminFaq } from '@/lib/schemas/admin'

export default function FaqPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: items = [], isLoading } = useAdminList<AdminFaq>('/admin/faqs', undefined, { schema: adminFaqSchema })
  const deleteFaq = useAdminDelete('/admin/faqs')

  const handleDelete = () => {
    if (!deleteId) return
    deleteFaq.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
  }

  const columns: Column<AdminFaq>[] = [
    {
      key: 'question',
      header: 'Question',
      render: (item) => (
        <Link href={`/admin/faq/${item.id}`} style={{ fontWeight: 500, color: 'var(--color-foreground)', textDecoration: 'none' }}>
          {item.question_en}
        </Link>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
          {item.category ?? '-'}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'answer',
      header: 'Answer',
      render: (item) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
          {item.answer_en.slice(0, 120)}{item.answer_en.length > 120 ? '...' : ''}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
          <Link href={`/admin/faq/${item.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)' }} aria-label="Edit">
            <Edit size={14} />
          </Link>
          <button onClick={() => setDeleteId(item.id)} style={{ padding: '0.375rem', borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)' }} aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="FAQ"
        subtitle="Manage frequently asked questions"
        actions={
          <Link href="/admin/faq/new">
            <Button variant="primary" size="sm"><Plus size={15} /> New FAQ</Button>
          </Link>
        }
      />
      <div style={{ borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={items} keyField="id" loading={isLoading} emptyMessage="No FAQ items yet." />
      </div>
      <ConfirmDialog open={!!deleteId} title="Delete FAQ" message="Are you sure? This cannot be undone." confirmLabel="Delete" loading={deleteFaq.isPending} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  )
}
