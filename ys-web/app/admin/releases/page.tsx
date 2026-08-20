'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'

interface Release {
  id: string; version: string; release_date: string; type: string
  is_published: boolean; product: { name_en: string; slug: string } | null
}

const typeColors: Record<string, string> = {
  major: '#EF4444', minor: 'var(--color-accent)', patch: '#10B981', hotfix: '#F59E0B',
}

export default function AdminReleasesPage() {
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')

  const params = filter === 'all' ? undefined : { published: filter === 'published' ? 'true' : 'false' }
  const { data: releases = [], isLoading, isError, error } = useAdminList<Release>('/admin/releases', params)
  const deleteRelease = useAdminDelete('/admin/releases')

  const handleDelete = (id: string, version: string) => {
    if (!confirm(`Delete release v${version}? This is only possible for unpublished releases.`)) return
    deleteRelease.mutate(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Releases</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>Manage product release history</p>
        </div>
        <Link href="/admin/releases/new">
          <Button variant="primary" size="sm"><Plus size={16} /> New Release</Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {(['all', 'published', 'draft'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: '0.8125rem', fontWeight: 500, textTransform: 'capitalize',
            backgroundColor: filter === f ? 'var(--color-accent-subtle)' : 'transparent',
            color: filter === f ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
          }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Product', 'Version', 'Type', 'Release Date', 'Status', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load releases.'}
                </td></tr>
              ) : releases.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No releases yet. <Link href="/admin/releases/new" style={{ color: 'var(--color-accent)' }}>Create one →</Link>
                </td></tr>
              ) : releases.map((release) => (
                <tr key={release.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 500, color: 'var(--color-foreground)' }}>
                    {release.product?.name_en ?? '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-foreground)' }}>
                    v{release.version}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 9999, backgroundColor: `${typeColors[release.type]}18`, color: typeColors[release.type], textTransform: 'uppercase' }}>
                      {release.type}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)' }}>
                    {new Date(release.release_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: release.is_published ? '#10B981' : 'var(--color-foreground-muted)' }}>
                      {release.is_published ? '🟢 Published' : '⚪ Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/admin/releases/${release.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)', display: 'flex' }}><Pencil size={15} /></Link>
                      {!release.is_published && (
                        <button onClick={() => handleDelete(release.id, release.version)} disabled={deleteRelease.isPending && deleteRelease.variables === release.id} style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)' }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
