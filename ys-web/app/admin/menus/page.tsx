'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'

interface MenuRow {
  id: string
  name: string
  location: string
  rootItems?: Array<{ id: string; children?: unknown[] }>
}

export default function MenusPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: menus = [], isLoading } = useAdminList<MenuRow>('/admin/menus')
  const deleteMenu = useAdminDelete('/admin/menus')

  const handleDelete = () => {
    if (!deleteId) return
    deleteMenu.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
  }

  const columns: Column<MenuRow>[] = [
    {
      key: 'name', header: 'Menu',
      render: (m) => (
        <Link href={`/admin/menus/${m.id}`} style={{ fontWeight: 500, color: 'var(--color-foreground)', textDecoration: 'none' }}>
          {m.name}
        </Link>
      ),
    },
    {
      key: 'location', header: 'Location', hideOnMobile: true,
      render: (m) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>{m.location}</span>,
    },
    {
      key: 'items_count', header: 'Items', hideOnMobile: true,
      render: (m) => {
        const root = m.rootItems ?? []
        const total = root.reduce((sum, item) => sum + 1 + ((item.children as unknown[] | undefined)?.length ?? 0), 0)
        return <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>{total}</span>
      },
    },
    {
      key: 'actions', header: '',
      render: (m) => (
        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
          <Link href={`/admin/menus/${m.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)' }} aria-label="Edit"><Edit size={14} /></Link>
          <button onClick={() => setDeleteId(m.id)} style={{ padding: '0.375rem', borderRadius: 6, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)' }} aria-label="Delete"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Menus" subtitle="Manage navigation menus across the site" actions={
        <Link href="/admin/menus/new"><Button variant="primary" size="sm"><Plus size={15} /> New Menu</Button></Link>
      } />
      <div style={{ borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={menus} keyField="id" loading={isLoading} emptyMessage="No menus yet." />
      </div>
      <ConfirmDialog open={!!deleteId} title="Delete Menu" message="This will delete the menu and all its items." confirmLabel="Delete" loading={deleteMenu.isPending} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </>
  )
}
