'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useAdminList } from '@/lib/hooks/useAdminResource'
import { Pagination } from '@/components/admin/Pagination'
import { REQUEST_TYPES, type RequestType } from '@/types'

interface AdminContactRequest {
  id: string
  name: string
  email: string
  company_name: string | null
  contact_preference: 'email' | 'whatsapp' | null
  phone: string | null
  subject: string | null
  message: string
  type: 'general' | 'sales' | 'support' | 'partnership'
  request_type: RequestType | null
  status: 'new' | 'reviewing' | 'contacted' | 'in_progress' | 'completed' | 'archived' | 'read' | 'replied'
  customer_id: string | null
  ip_address: string | null
  handled_at: string | null
  created_at: string
}

const REQUEST_TYPE_LABELS: Partial<Record<RequestType, string>> = {
  website: 'Website',
  web_platform: 'Web Platform',
  mobile_app: 'Mobile App',
  saas: 'SaaS Product',
  ai_solution: 'AI Solution',
  ai_agent: 'AI Agent',
  automation: 'Automation',
  crm: 'CRM System',
  ui_ux: 'UI/UX Design',
  branding: 'Branding',
  custom_software: 'Custom Software',
  integration: 'Integrations',
  other: 'Something Else',
}

type StatusKey = 'new' | 'reviewing' | 'contacted' | 'in_progress' | 'completed' | 'archived' | 'read' | 'replied'

const STATUSES = ['new', 'reviewing', 'contacted', 'in_progress', 'completed', 'archived'] as const

// Legacy rows may still carry 'read'/'replied' — normalize them visually.
const statusInfo = (status: StatusKey): { label: string; variant: 'default' | 'success' | 'outline' } => {
  switch (status) {
    case 'new':        return { label: 'New',        variant: 'default' }
    case 'reviewing':
    case 'read':
    case 'replied':    return { label: 'Reviewing',  variant: 'outline' }
    case 'contacted':  return { label: 'Contacted',  variant: 'outline' }
    case 'in_progress':return { label: 'In progress', variant: 'default' }
    case 'completed':  return { label: 'Completed',  variant: 'success' }
    case 'archived':   return { label: 'Archived',   variant: 'outline' }
  }
}

export default function AdminContactRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  // Filters reset pagination — a narrowed result set must start on page 1.
  const [page, setPage] = useState(1)

  const changeStatus = (v: string) => { setStatusFilter(v); setPage(1) }
  const changeType = (v: string) => { setTypeFilter(v); setPage(1) }
  const changeSearch = (v: string) => { setSearch(v); setPage(1) }

  const params: Record<string, string> = {}
  if (statusFilter) params.status = statusFilter
  if (typeFilter) params.request_type = typeFilter
  if (search) params.search = search
  if (page > 1) params.page = String(page)

  const {
    data: list,
    isLoading,
    isError,
    error,
  } = useAdminList<AdminContactRequest>('/admin/contact-requests', Object.keys(params).length ? params : undefined, { withMeta: true })
  const requests = list?.items ?? []
  const meta = list?.meta

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Inquiries</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>Customer requests from the public contact form — including the “What do you need?” picker</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: '20rem', flex: 1, minWidth: '14rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-muted)' }} />
          <input
            value={search} onChange={e => changeSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={statusFilter} onChange={e => changeStatus(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none' }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{statusInfo(s).label}</option>
          ))}
        </select>
        <select
          value={typeFilter} onChange={e => changeType(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none' }}
        >
          <option value="">All Request Types</option>
          {REQUEST_TYPES.map(t => (
            <option key={t} value={t}>{REQUEST_TYPE_LABELS[t] ?? t}</option>
          ))}
        </select>
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['From', 'Request Type', 'Status', 'Customer', 'Received', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load inquiries.'}
                </td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No inquiries found.
                </td></tr>
              ) : requests.map((req) => {
                const cfg = statusInfo(req.status)
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background-subtle)', color: 'var(--color-foreground-muted)', flexShrink: 0, fontSize: '0.75rem', fontWeight: 600 }}>
                          {req.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: 500, color: 'var(--color-foreground)' }}>{req.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                            {req.company_name ? `${req.company_name} · ` : ''}{req.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        {req.request_type ? (
                          <Badge variant="outline">{REQUEST_TYPE_LABELS[req.request_type] ?? req.request_type}</Badge>
                        ) : (
                          <span style={{ color: 'var(--color-foreground-muted)', fontSize: '0.8125rem' }}>—</span>
                        )}
                        {req.contact_preference === 'whatsapp' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                            via WhatsApp{req.phone ? ` · ${req.phone}` : ''}
                          </span>
                        )}
                        {req.contact_preference === 'email' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>via Email</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {req.customer_id ? (
                        <Link href={`/admin/customers/${req.customer_id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.8125rem' }}>
                          View customer →
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--color-foreground-muted)', fontSize: '0.8125rem' }}>Not linked</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Link href={`/admin/contact-requests/${req.id}`} style={{ padding: '0.375rem 0.625rem', borderRadius: 6, color: 'var(--color-foreground-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }} title="Open">
                        <Mail size={15} /> Open
                      </Link>
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