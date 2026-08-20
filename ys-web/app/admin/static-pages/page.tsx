'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'
import type { StaticPage } from '@/types'

const statusColors: Record<string, string> = {
  published: '#10B981',
  draft: '#F59E0B',
  archived: '#71717A',
}

const RESOURCE = '/admin/static-pages'

export default function StaticPagesPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: pages = [], isLoading } = useAdminList<StaticPage>(RESOURCE)
  const deletePage = useAdminDelete(RESOURCE)

  const handleDelete = () => {
    if (!deleteId) return
    deletePage.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
  }

  const columns: Column<StaticPage>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (p) => (
        <Link
          href={`/admin/static-pages/${p.id}`}
          style={{ fontWeight: 500, color: 'var(--color-foreground)', textDecoration: 'none' }}
        >
          {p.title}
        </Link>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (p) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
          /{p.slug}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (p) => {
        const status = (p as any).status ?? 'published'
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: statusColors[status] ?? 'var(--color-foreground-muted)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusColors[status] ?? 'var(--color-foreground-muted)' }} />
            {status}
          </span>
        )
      },
    },
    {
      key: 'published_at',
      header: 'Published',
      hideOnMobile: true,
      render: (p) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
          {p.published_at ? new Date(p.published_at).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
          <Link
            href={`/en/${p.slug}`}
            target="_blank"
            style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)' }}
            aria-label="View page"
          >
            <ExternalLink size={14} />
          </Link>
          <Link
            href={`/admin/static-pages/${p.id}`}
            style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)' }}
            aria-label="Edit"
          >
            <Edit size={14} />
          </Link>
          <button
            onClick={() => setDeleteId(p.id)}
            style={{ padding: '0.375rem', borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)' }}
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Static Pages"
        subtitle="Manage CMS content pages"
        actions={
          <Link href="/admin/static-pages/new">
            <Button variant="primary" size="sm">
              <Plus size={15} /> New Page
            </Button>
          </Link>
        }
      />

      <div style={{ borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={pages} keyField="id" loading={isLoading} emptyMessage="No pages yet. Create your first page." />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Page"
        message="Are you sure you want to delete this page? This action cannot be undone."
        confirmLabel="Delete"
        loading={deletePage.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
