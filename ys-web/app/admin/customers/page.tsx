'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'
import { Pagination } from '@/components/admin/Pagination'

interface Customer {
  id: string
  name: string
  email: string
  type: 'individual' | 'company' | null
  company: string | null
  status: 'active' | 'archived'
  subscriptions_count: number | null
  projects_count: number | null
  created_at: string
}

const RESOURCE = '/admin/customers'

const statusInfo = (status: Customer['status']): { label: string; variant: 'success' | 'outline' } =>
  status === 'active' ? { label: 'Active', variant: 'success' } : { label: 'Archived', variant: 'outline' }

export default function AdminCustomersPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const changeFilter = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1) }

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (typeFilter) params.type = typeFilter
  if (statusFilter) params.status = statusFilter
  if (page > 1) params.page = String(page)

  const { data: list, isLoading, isError, error } = useAdminList<Customer>(RESOURCE, Object.keys(params).length ? params : undefined, { withMeta: true })
  const customers = list?.items ?? []
  const meta = list?.meta
  const deleteCustomer = useAdminDelete(RESOURCE)

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"? Only possible if they have no subscriptions or projects.`)) return
    deleteCustomer.mutate(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Customers</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>People and companies YS System works with — projects, subscriptions, and contact requests</p>
        </div>
        <Link href="/admin/customers/new">
          <Button variant="primary" size="sm"><Plus size={16} /> Add Customer</Button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: '20rem', flex: 1, minWidth: '14rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-muted)' }} />
          <input
            value={search} onChange={e => changeFilter(setSearch)(e.target.value)}
            placeholder="Search by name, email or company..."
            style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={typeFilter} onChange={e => changeFilter(setTypeFilter)(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none' }}
        >
          <option value="">All Types</option>
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
        <select
          value={statusFilter} onChange={e => changeFilter(setStatusFilter)(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Customer', 'Type', 'Status', 'Subscriptions', 'Projects', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load customers.'}
                </td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No customers yet. <Link href="/admin/customers/new" style={{ color: 'var(--color-accent)' }}>Add one →</Link>
                </td></tr>
              ) : customers.map((customer) => {
                const cfg = statusInfo(customer.status)
                return (
                  <tr key={customer.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500, color: 'var(--color-foreground)' }}>
                      <Link href={`/admin/customers/${customer.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{customer.name}</Link>
                      <p style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-foreground-muted)' }}>
                        {customer.email}{customer.company ? ` · ${customer.company}` : ''}
                      </p>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant="outline">{customer.type ?? '—'}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Link href={`/admin/subscriptions?customer_id=${customer.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                        {customer.subscriptions_count ?? 0}
                      </Link>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Link href={`/admin/projects?customer_id=${customer.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                        {customer.projects_count ?? 0}
                      </Link>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link href={`/admin/customers/${customer.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)', display: 'flex' }}>
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(customer.id, customer.name)}
                          disabled={deleteCustomer.isPending && deleteCustomer.variables === customer.id}
                          style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)' }}
                        >
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
        {meta && meta.last_page > 1 && (
          <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} perPage={meta.per_page} onChange={setPage} />
        )}
      </div>
    </div>
  )
}