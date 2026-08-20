'use client'

import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'

interface Career {
  id: string; title_en: string; title_ar: string; department: string
  location: string; type: string; status: string; created_at: string
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  open:   { bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
  closed: { bg: 'rgba(239,68,68,0.1)',  color: '#EF4444' },
  draft:  { bg: 'var(--color-background-muted)', color: 'var(--color-foreground-muted)' },
}

export default function AdminCareersPage() {
  const { data: careers = [], isLoading, isError, error } = useAdminList<Career>('/admin/careers')
  const deleteCareer = useAdminDelete('/admin/careers')

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    deleteCareer.mutate(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Careers</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>Manage job listings</p>
        </div>
        <Link href="/admin/careers/new">
          <Button variant="primary" size="sm"><Plus size={16} /> Add Listing</Button>
        </Link>
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Title', 'Department', 'Type', 'Status', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load careers.'}
                </td></tr>
              ) : careers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No listings yet. <Link href="/admin/careers/new" style={{ color: 'var(--color-accent)' }}>Create one →</Link>
                </td></tr>
              ) : careers.map((career) => {
                const style = statusStyle[career.status] ?? statusStyle.draft
                return (
                  <tr key={career.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <p style={{ fontWeight: 500, color: 'var(--color-foreground)' }}>{career.title_en}</p>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)' }}>{career.department}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', textTransform: 'capitalize' }}>{career.type.replace('_', ' ')}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.625rem', borderRadius: 9999, backgroundColor: style.bg, color: style.color, textTransform: 'capitalize' }}>
                        {career.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/admin/careers/${career.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)', display: 'flex' }}><Pencil size={15} /></Link>
                        <button onClick={() => handleDelete(career.id, career.title_en)} disabled={deleteCareer.isPending && deleteCareer.variables === career.id} style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
