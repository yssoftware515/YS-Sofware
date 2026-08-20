'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { AlertTriangle, Building2, User as UserIcon, Briefcase, ArrowUpRight, Inbox } from 'lucide-react'
import { adminGet, adminPatch, API } from '@/lib/admin/api'
import { adminCustomerDetailSchema, adminProjectListItemSchema, type AdminCustomerDetail, type AdminProjectListItem } from '@/lib/schemas/admin'
import { CustomerForm, type CustomerFormData } from '@/components/admin/CustomerForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/components/admin/PermissionGate'
import { formatDateTime, formatMoney } from '@/lib/admin/format'
import { STATUS_LABELS, type ProjectStatus } from '@/components/admin/ProjectForm'

const CUSTOMER_STATUS_LABELS: Record<CustomerFormData['status'], string> = {
  active: 'Active',
  archived: 'Archived',
}

const statusVariant: Record<CustomerFormData['status'], 'default' | 'success' | 'outline'> = {
  active: 'success',
  archived: 'outline',
}

const REQUEST_STATUS_VARIANTS: Record<string, 'default' | 'success' | 'outline' | 'warning' | 'error'> = {
  new: 'default',
  reviewing: 'outline',
  contacted: 'outline',
  in_progress: 'outline',
  completed: 'success',
  archived: 'outline',
}
// Legacy rows may still carry 'read'/'replied'
const normalizeRequestStatus = (s: string): string =>
  s === 'read' || s === 'replied' ? 'reviewing' : s

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const { hasPermission } = useAuth()
  const canViewProjects = hasPermission('view_projects') || hasPermission('manage_projects')
  const canManageRequests = hasPermission('manage_contact_requests')

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['/admin/customers', id],
    queryFn: () => adminGet<AdminCustomerDetail>(`/admin/customers/${id}`, { schema: adminCustomerDetailSchema }),
  })

  const { data: projects, isLoading: projectsLoading, isError: projectsError } = useQuery({
    queryKey: ['/admin/projects/by-customer', id],
    queryFn: async () => {
      const res = await fetch(`${API}/admin/projects?customer_id=${encodeURIComponent(id ?? '')}&per_page=5`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      const body = await res.json()
      if (!body?.success || !res.ok) {
        return { items: [], total: 0 }
      }
      const items = adminProjectListItemSchema.array().parse(body.data as AdminProjectListItem[])
      return { items, total: (body.meta?.total ?? 0) as number }
    },
    enabled: Boolean(id) && Boolean(canViewProjects),
  })

  if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (isError || !customer || !id) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load customer.</div>

  const toggleStatus = async () => {
    setStatusBusy(true)
    setStatusError(null)
    try {
      await adminPatch(`/admin/customers/${id}/status`, {
        status: customer.status === 'active' ? 'archived' : 'active',
      })
      window.location.reload()
    } catch (err) {
      const anyErr = err as { message?: string }
      setStatusError(anyErr.message ?? 'Failed to update status.')
    } finally {
      setStatusBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Identity + status */}
      <div style={{
        borderRadius: '0.875rem', border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)', padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              backgroundColor: 'var(--color-accent-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-accent)',
            }}>
              {customer.type === 'company' ? <Building2 size={20} /> : <UserIcon size={20} />}
            </div>
            <div>
              <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>{customer.name}</h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
                {customer.company ?? 'No company name'} · {customer.email}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Badge variant={statusVariant[customer.status]}>{CUSTOMER_STATUS_LABELS[customer.status]}</Badge>
            <Button variant="secondary" size="sm" onClick={toggleStatus} loading={statusBusy}>
              {customer.status === 'active' ? 'Archive Customer' : 'Reactivate Customer'}
            </Button>
          </div>
        </div>
        {statusError && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <AlertTriangle size={13} /> {statusError}
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ marginTop: '1.25rem' }}>
          <Stat label="Subscriptions" value={String(customer.subscriptions_count ?? 0)} />
          <Stat label="Projects" value={String(customer.projects_count ?? 0)} />
          <Stat label="Phone" value={customer.phone ?? '—'} />
          <Stat label="WhatsApp" value={customer.whatsapp ?? '—'} />
        </div>
        <p style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
          Customer since {formatDateTime(customer.created_at)} · created by {customer.creator?.name ?? 'unknown'}
        </p>
      </div>

      {/* Business overview: engagement watch for this customer */}
      {canViewProjects && (
        <div style={{
          borderRadius: '0.875rem', border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)', padding: '1rem 1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div>
              <h2 className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={16} style={{ color: 'var(--color-foreground-muted)' }} /> Business Overview
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
                Engagement watch across this customer&apos;s projects
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Active" value={String(customer.active_projects_count ?? 0)} />
            <Stat label="On hold" value={String(customer.on_hold_projects_count ?? 0)} />
            <Stat label="Completed" value={String(customer.completed_projects_count ?? 0)} />
            <Stat label="Overdue" value={String(customer.overdue_projects_count ?? 0)} />
          </div>

          {customer.value_by_currency && customer.value_by_currency.length > 0 && (
            <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recorded value</p>
              {customer.value_by_currency.map(v => (
                <p key={v.currency} style={{ fontSize: '0.875rem', color: 'var(--color-foreground)' }}>
                  <span className="font-display font-semibold" style={{ marginRight: '0.375rem' }}>{formatMoney(v.total, v.currency)}</span>
                  <span style={{ color: 'var(--color-foreground-muted)' }}>({v.currency}) — sum of recorded quoted values</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contact requests funnel for this customer */}
      {canManageRequests && (
        <div style={{
          borderRadius: '0.875rem', border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)', padding: '1rem 1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
            <div>
              <h2 className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Inbox size={16} style={{ color: 'var(--color-foreground-muted)' }} /> Contact Requests
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
                Recent inquiries from this pipeline
              </p>
            </div>
            <Link href="/admin/contact-requests" style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          {!customer.latest_contact_requests || customer.latest_contact_requests.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
              No contact requests recorded for this customer yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {customer.latest_contact_requests.map(r => (
                <Link key={r.id} href={`/admin/contact-requests/${r.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                  padding: '0.625rem 0.5rem', borderRadius: 8, textDecoration: 'none',
                  color: 'var(--color-foreground)',
                }} className="hover:bg-background-subtle">
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                      {r.email} · {formatDateTime(r.created_at)}
                    </span>
                  </div>
                  <Badge variant={REQUEST_STATUS_VARIANTS[normalizeRequestStatus(r.status)] ?? 'outline'}>
                    {normalizeRequestStatus(r.status)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Business snapshot: this customer's engagements */}
      {canViewProjects && (
      <div style={{
        borderRadius: '0.875rem', border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <div>
            <h2 className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={16} style={{ color: 'var(--color-foreground-muted)' }} /> Engagements
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
              Recorded projects for this customer
            </p>
          </div>
          {projects && projects.items.length > 0 && (
            <Link href={`/admin/projects?customer_id=${id}`} style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View all ({projects.total}) <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        {projectsError ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-error)' }}>
            Could not load this customer&apos;s engagements.
          </p>
        ) : projectsLoading ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>Loading engagements...</p>
        ) : !projects || projects.items.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
            No projects recorded for this customer yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {projects.items.map(p => (
              <Link key={p.id} href={`/admin/projects/${p.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                padding: '0.625rem 0.5rem', borderRadius: 8, textDecoration: 'none',
                color: 'var(--color-foreground)',
              }} className="hover:bg-background-subtle">
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                    {p.expected_completion_date ? `Due ${p.expected_completion_date}` : 'No completion date'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                  {p.is_overdue && <Badge variant="error">Overdue</Badge>}
                  <Badge variant={PROJECT_STATUS_VARIANTS[p.status] ?? 'outline'}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{formatMoney(p.quoted_value, p.currency)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      )}

      <div>
        <h2 className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-foreground)', marginBottom: '0.875rem' }}>
          Edit customer information
        </h2>
        <CustomerForm
          customerId={id}
          initialData={{
            name: customer.name,
            email: customer.email,
            type: customer.type,
            company: customer.company ?? '',
            phone: customer.phone ?? '',
            whatsapp: customer.whatsapp ?? '',
            notes: customer.notes ?? '',
            status: customer.status,
          }}
        />
      </div>
    </div>
  )
}

const PROJECT_STATUS_VARIANTS: Record<ProjectStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  draft: 'outline',
  active: 'success',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'error',
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)', marginTop: '0.25rem' }}>{value}</p>
    </div>
  )
}