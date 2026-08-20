'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'
import type { HomepageSection } from '@/types'

const typeLabels: Record<string, string> = {
  hero: 'Hero', why_choose: 'Why Choose', products: 'Products', cta: 'CTA', stats: 'Stats',
}

const RESOURCE = '/admin/homepage-sections'

export default function HomepageSectionsPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: sections = [], isLoading } = useAdminList<HomepageSection>(RESOURCE)
  const deleteSection = useAdminDelete(RESOURCE)

  const handleDelete = () => {
    if (!deleteId) return
    deleteSection.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
  }

  const columns: Column<HomepageSection>[] = [
    {
      key: 'title', header: 'Title',
      render: (s) => (
        <Link href={`/admin/homepage/${s.id}`} style={{ fontWeight: 500, color: 'var(--color-foreground)', textDecoration: 'none' }}>
          {s.title ?? s.type}
        </Link>
      ),
    },
    {
      key: 'type', header: 'Type',
      render: (s) => <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>{typeLabels[s.type] ?? s.type}</span>,
    },
    {
      key: 'sort_order', header: 'Order', hideOnMobile: true,
      render: (s) => <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>{s.sort_order}</span>,
    },
    {
      key: 'is_enabled', header: 'Status',
      render: (s) => {
        const enabled = (s as any).is_enabled ?? true
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: enabled ? '#10B981' : 'var(--color-foreground-muted)' }}>
            {enabled ? <Eye size={14} /> : <EyeOff size={14} />}
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        )
      },
    },
    {
      key: 'actions', header: '',
      render: (s) => (
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
          <Link href={`/admin/homepage/${s.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)' }} aria-label="Edit"><Edit size={14} /></Link>
          <button onClick={() => setDeleteId(s.id)} style={{ padding: '0.375rem', borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)' }} aria-label="Delete"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Homepage Sections" subtitle="Manage homepage content sections" actions={
        <Link href="/admin/homepage/new"><Button variant="primary" size="sm"><Plus size={15} /> New Section</Button></Link>
      } />
      <div style={{ borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={sections} keyField="id" loading={isLoading} emptyMessage="No sections yet." />
      </div>
      <ConfirmDialog open={!!deleteId} title="Delete Section" message="Are you sure? This cannot be undone." confirmLabel="Delete" loading={deleteSection.isPending} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  )
}
