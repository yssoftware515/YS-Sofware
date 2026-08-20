'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'
import { Pagination } from '@/components/admin/Pagination'
import { PROJECT_TYPE_LABELS, PROJECT_TYPES, STATUS_LABELS, type ProjectStatus, type ProjectType } from '@/components/admin/ProjectForm'
import { formatMoney } from '@/lib/admin/format'

interface Project {
  id: string
  name: string
  customer_id: string | null
  customer: { id: string; name: string; company: string | null } | null
  project_type: ProjectType | null
  status: ProjectStatus
  quoted_value: string | null
  currency: string | null
  start_date: string | null
  created_at: string
  is_overdue: boolean
  days_overdue: number | null
}

const statusVariant = (s: ProjectStatus): 'default' | 'success' | 'warning' | 'error' | 'outline' => {
  switch (s) {
    case 'active':    return 'success'
    case 'on_hold':   return 'warning'
    case 'completed': return 'success'
    case 'cancelled': return 'error'
    case 'draft':     return 'outline'
  }
}

const formatValue = (v: string | null, currency?: string | null): string => formatMoney(v, currency)

export default function AdminProjectsPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>}>
      <AdminProjectsPage />
    </Suspense>
  )
}

function AdminProjectsPage() {
  const searchParams = useSearchParams()
  const customerFromUrl = searchParams.get('customer_id')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const changeFilter = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1) }

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (statusFilter) params.status = statusFilter
  if (typeFilter) params.project_type = typeFilter
  if (customerFromUrl) params.customer_id = customerFromUrl
  if (page > 1) params.page = String(page)

  const { data: list, isLoading, isError, error } = useAdminList<Project>('/admin/projects', Object.keys(params).length ? params : undefined, { withMeta: true })
  const projects = list?.items ?? []
  const meta = list?.meta
  const deleteProject = useAdminDelete('/admin/projects')

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? This also removes its service links and audit history.`)) return
    deleteProject.mutate(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Projects</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>Delivery engagements with customers — their scope, schedule and recorded value</p>
        </div>
        <Link href="/admin/projects/new">
          <Button variant="primary" size="sm"><Plus size={16} /> New Project</Button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: '20rem', flex: 1, minWidth: '14rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-muted)' }} />
          <input
            value={search} onChange={e => changeFilter(setSearch)(e.target.value)}
            placeholder="Search by project name..."
            style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={statusFilter} onChange={e => changeFilter(setStatusFilter)(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none' }}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={typeFilter} onChange={e => changeFilter(setTypeFilter)(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none' }}
        >
          <option value="">All Project Types</option>
          {PROJECT_TYPES.map(t => (
            <option key={t} value={t}>{PROJECT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {customerFromUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
          <span>Showing projects for this customer only</span>
          <Link href="/admin/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid var(--color-border)', color: 'var(--color-foreground)', textDecoration: 'none' }} title="Clear customer filter">
            <X size={12} /> Clear filter
          </Link>
        </div>
      )}

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Project', 'Customer', 'Type', 'Status', 'Value', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load projects.'}
                </td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No projects yet. <Link href="/admin/projects/new" style={{ color: 'var(--color-accent)' }}>Create one →</Link>
                </td></tr>
              ) : projects.map((project) => (
                <tr key={project.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 500, color: 'var(--color-foreground)' }}>{project.name}</td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)' }}>
                    {project.customer ? (
                      <Link href={`/admin/customers/${project.customer.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                        {project.customer.company ?? project.customer.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {project.project_type ? (
                      <Badge variant="outline">{PROJECT_TYPE_LABELS[project.project_type]}</Badge>
                    ) : <span style={{ color: 'var(--color-foreground-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Badge variant={statusVariant(project.status)}>{STATUS_LABELS[project.status] ?? project.status}</Badge>
                      {project.is_overdue && <Badge variant="error">Overdue</Badge>}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span>{formatValue(project.quoted_value, project.currency)}</span>
                      {project.quoted_value && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{project.currency}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <Link href={`/admin/projects/${project.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)', display: 'inline-flex' }}>
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      disabled={deleteProject.isPending && deleteProject.variables === project.id}
                      style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)', marginLeft: '0.25rem' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && (
          <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} perPage={meta.per_page} onChange={setPage} />
        )}
      </div>
    </div>
  )
}