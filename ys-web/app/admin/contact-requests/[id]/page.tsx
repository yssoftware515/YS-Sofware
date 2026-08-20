'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Globe, Check, UserPlus, Link2, Unlink, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/admin/Toast'
import { useAuth } from '@/components/admin/PermissionGate'
import { useAdminList } from '@/lib/hooks/useAdminResource'
import { adminGet, adminPatch, adminCreate, adminDelete } from '@/lib/admin/api'
import { formatMoney } from '@/lib/admin/format'
import { STATUS_LABELS, type ProjectStatus } from '@/components/admin/ProjectForm'
import { REQUEST_TYPES, type RequestType } from '@/types'

interface LinkedCustomer {
  id: string
  name: string
  email: string
  company: string | null
}

interface LinkedProject {
  id: string
  name: string
  status: ProjectStatus
  quoted_value: string | null
  currency: string | null
}

interface AdminContactRequest {
  id: string
  name: string
  email: string
  company_name: string | null
  contact_preference: 'email' | 'whatsapp' | null
  phone: string | null
  budget_range: string | null
  timeline: string | null
  subject: string | null
  message: string
  details: Record<string, string> | null
  type: 'general' | 'sales' | 'support' | 'partnership'
  request_type: RequestType | null
  status: 'new' | 'reviewing' | 'contacted' | 'in_progress' | 'completed' | 'archived' | 'read' | 'replied'
  customer_id: string | null
  customer: LinkedCustomer | null
  projects: LinkedProject[] | null
  ip_address: string | null
  user_agent: string | null
  spam_score: number | null
  handled_by: string | null
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

const BUDGET_LABELS: Record<string, string> = {
  under_10k:   'Under $10K',
  '10k_30k':   '$10k – $30k',
  '30k_100k':  '$30k – $100k',
  over_100k:   'Over $100k',
  flexible:    'Flexible / not sure yet',
}

const TIMELINE_LABELS: Record<string, string> = {
  asap:             'As soon as possible',
  one_three_months: '1 – 3 months',
  three_six_months: '3 – 6 months',
  flexible:         'No fixed deadline',
}

const STATUSES = ['new', 'reviewing', 'contacted', 'in_progress', 'completed', 'archived'] as const

// Legacy rows may still carry 'read'/'replied' — map them onto 'reviewing'
// so the action buttons never conflict with the stored value.
type StatusKey = AdminContactRequest['status']
type LifecycleStatus = 'new' | 'reviewing' | 'contacted' | 'in_progress' | 'completed' | 'archived'
const normalizeStatus = (s: StatusKey): LifecycleStatus =>
  s === 'read' || s === 'replied' ? 'reviewing' : s

const statusVariant = (s: StatusKey): 'default' | 'success' | 'outline' => {
  switch (normalizeStatus(s)) {
    case 'new':         return 'default'
    case 'reviewing':   return 'outline'
    case 'contacted':   return 'outline'
    case 'in_progress': return 'outline'
    case 'completed':   return 'success'
    case 'archived':    return 'outline'
  }
}

const PROJECT_STATUS_VARIANTS: Record<ProjectStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  draft: 'outline',
  active: 'success',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'error',
}

export default function ContactRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { show } = useToast()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const canManageCustomers = hasPermission('manage_customers')
  const canManageProjects = hasPermission('manage_projects')
  const canViewProjects = hasPermission('view_projects') || canManageProjects
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['/admin/contact-requests', id],
    queryFn: () => adminGet<AdminContactRequest>(`/admin/contact-requests/${id}`),
  })

  const { data: customers = [] } = useAdminList<LinkedCustomer>('/admin/customers', { per_page: '100' })
  const { data: allProjects = [] } = useAdminList<LinkedProject>('/admin/projects', { per_page: '100' })

  const updateStatus = useMutation({
    mutationFn: (status: AdminContactRequest['status']) =>
      adminPatch<AdminContactRequest>(`/admin/contact-requests/${id}/status`, { status }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['/admin/contact-requests', id], updated)
      queryClient.invalidateQueries({ queryKey: ['/admin/contact-requests'] })
      show('success', 'Status updated.')
    },
    onError: (err) => {
      const e = err as { message?: string }
      show('error', e.message ?? 'Failed to update status.')
    },
  })

  const linkMutation = useMutation({
    mutationFn: (customerId: string) =>
      adminCreate<AdminContactRequest>(`/admin/contact-requests/${id}/link-customer`, { customer_id: customerId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['/admin/contact-requests', id], updated)
      queryClient.invalidateQueries({ queryKey: ['/admin/contact-requests'] })
      setSelectedCustomerId('')
      show('success', 'Request linked to customer.')
    },
    onError: (err) => {
      const e = err as { message?: string }
      show('error', e.message ?? 'Failed to link customer.')
    },
  })

  const convertMutation = useMutation({
    mutationFn: () =>
      adminCreate<{ customer: LinkedCustomer; contact_request: AdminContactRequest }>(`/admin/contact-requests/${id}/convert-customer`, {}),
    onSuccess: (result) => {
      queryClient.setQueryData(['/admin/contact-requests', id], result.contact_request)
      queryClient.invalidateQueries({ queryKey: ['/admin/contact-requests'] })
      show('success', 'Customer created from this request and linked.')
    },
    onError: (err) => {
      const e = err as { message?: string }
      show('error', e.message ?? 'Could not convert to a customer.')
    },
  })

  const unlinkMutation = useMutation({
    mutationFn: () => adminDelete(`/admin/contact-requests/${id}/customer`),
    onSuccess: (updated) => {
      queryClient.setQueryData(['/admin/contact-requests', id], updated)
      queryClient.invalidateQueries({ queryKey: ['/admin/contact-requests'] })
      show('success', 'Request unlinked from customer.')
    },
    onError: (err) => {
      const e = err as { message?: string }
      show('error', e.message ?? 'Failed to unlink customer.')
    },
  })

  const linkProjectMutation = useMutation({
    mutationFn: (projectId: string) =>
      adminCreate<AdminContactRequest>(`/admin/contact-requests/${id}/link-project`, { project_id: projectId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['/admin/contact-requests', id], updated)
      queryClient.invalidateQueries({ queryKey: ['/admin/contact-requests'] })
      setSelectedProjectId('')
      show('success', 'Project linked to this request.')
    },
    onError: (err) => {
      const e = err as { message?: string }
      show('error', e.message ?? 'Failed to link project.')
    },
  })

  const unlinkProjectMutation = useMutation({
    mutationFn: (projectId: string) =>
      adminDelete(`/admin/contact-requests/${id}/project/${projectId}`),
    onSuccess: (updated) => {
      queryClient.setQueryData(['/admin/contact-requests', id], updated)
      queryClient.invalidateQueries({ queryKey: ['/admin/contact-requests'] })
      show('success', 'Project unlinked from this request.')
    },
    onError: (err) => {
      const e = err as { message?: string }
      show('error', e.message ?? 'Failed to unlink project.')
    },
  })

  const isBusy = updateStatus.isPending || linkMutation.isPending || convertMutation.isPending || unlinkMutation.isPending || linkProjectMutation.isPending || unlinkProjectMutation.isPending

  if (isLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  }
  if (isError || !data) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load request.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/admin/contact-requests" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>{data.name}</h1>
              <Badge variant={statusVariant(data.status)}>
                {normalizeStatus(data.status)}
              </Badge>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
              Received {new Date(data.created_at).toLocaleString()} · {data.ip_address ?? 'no IP logged'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {STATUSES.map(status => {
            const current = normalizeStatus(data.status)
            return (
              <Button
                key={status}
                variant={current === status ? 'primary' : 'secondary'}
                size="sm"
                disabled={isBusy}
                onClick={() => updateStatus.mutate(status)}
              >
                {current === status && <Check size={14} />}
                {status}
              </Button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 20rem', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', padding: '1.25rem', backgroundColor: 'var(--color-surface)' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-foreground-muted)', marginBottom: '0.75rem' }}>Message</h2>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-foreground)', lineHeight: 1.7 }}>{data.message}</p>
          </div>

          <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', padding: '1.25rem', backgroundColor: 'var(--color-surface)' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-foreground-muted)', marginBottom: '0.75rem' }}>Request Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: 'var(--color-foreground-muted)' }}>Inquiry type</span>
                <span style={{ color: 'var(--color-foreground)' }}>{data.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: 'var(--color-foreground-muted)' }}>What do you need?</span>
                <span style={{ color: 'var(--color-foreground)' }}>
                  {data.request_type ? (REQUEST_TYPE_LABELS[data.request_type] ?? data.request_type) : '—'}
                </span>
              </div>
              {data.company_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-foreground-muted)' }}>Company</span>
                  <span style={{ color: 'var(--color-foreground)' }}>{data.company_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: 'var(--color-foreground-muted)' }}>Preferred contact</span>
                <span style={{ color: 'var(--color-foreground)' }}>
                  {data.contact_preference ? (data.contact_preference[0].toUpperCase() + data.contact_preference.slice(1)) : '—'}
                </span>
              </div>
              {data.phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-foreground-muted)' }}>Phone / WhatsApp</span>
                  <span style={{ color: 'var(--color-foreground)' }}>{data.phone}</span>
                </div>
              )}
              {data.budget_range && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-foreground-muted)' }}>Budget</span>
                  <span style={{ color: 'var(--color-foreground)' }}>{BUDGET_LABELS[data.budget_range] ?? data.budget_range}</span>
                </div>
              )}
              {data.timeline && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-foreground-muted)' }}>Timeline</span>
                  <span style={{ color: 'var(--color-foreground)' }}>{TIMELINE_LABELS[data.timeline] ?? data.timeline}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: 'var(--color-foreground-muted)' }}>Subject</span>
                <span style={{ color: 'var(--color-foreground)' }}>{data.subject ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <span style={{ color: 'var(--color-foreground-muted)' }}>Spam score</span>
                <span style={{ color: 'var(--color-foreground)' }}>{data.spam_score ?? '—'}</span>
              </div>
              {data.handled_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ color: 'var(--color-foreground-muted)' }}>Handled at</span>
                  <span style={{ color: 'var(--color-foreground)' }}>{new Date(data.handled_at).toLocaleString()}</span>
                </div>
              )}
            </div>

            {data.details && Object.keys(data.details).length > 0 && (
              <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', padding: '1.25rem', backgroundColor: 'var(--color-surface)' }}>
                <h2 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-foreground-muted)', marginBottom: '0.75rem' }}>
                  Contextual Answers
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
                  {Object.entries(data.details).map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ color: 'var(--color-foreground-muted)' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ color: 'var(--color-foreground)', wordBreak: 'break-word', maxWidth: '70%', textAlign: 'end' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', padding: '1.25rem', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-foreground-muted)' }}>Customer</h2>

            {data.customer ? (
              <>
                <Link href={`/admin/customers/${data.customer.id}`} style={{ fontWeight: 500, color: 'var(--color-foreground)', fontSize: '0.875rem', textDecoration: 'none' }}>
                  {data.customer.company ?? data.customer.name}
                </Link>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{data.customer.email}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <Link href={`/admin/projects?customer_id=${data.customer.id}`} style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
                    View projects →
                  </Link>
                  {canManageCustomers && (
                    <button
                      onClick={() => {
                        if (confirm(`Unlink this request from "${data.customer!.name}"? The customer record stays untouched.`)) unlinkMutation.mutate()
                      }}
                      disabled={isBusy}
                      style={{ fontSize: '0.8125rem', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Unlink size={13} /> Unlink
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
                  {canManageCustomers
                    ? 'No customer linked yet. Convert this request into a customer record, or link it to an existing one.'
                    : 'No customer linked to this request yet.'}
                </p>
                {canManageCustomers && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      loading={convertMutation.isPending}
                      onClick={() => {
                        if (confirm(`Create a customer from "${data.name}" (${data.email}) and link this request to it?`)) convertMutation.mutate()
                      }}
                    >
                      <UserPlus size={14} /> Convert to Customer
                    </Button>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        style={{ flex: 1, minWidth: 0, padding: '0.5rem 0.625rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none' }}
                      >
                        <option value="">Select existing customer...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.company ?? c.name} — {c.email}</option>
                        ))}
                      </select>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!selectedCustomerId || isBusy}
                        loading={linkMutation.isPending}
                        onClick={() => linkMutation.mutate(selectedCustomerId)}
                      >
                        Link
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', padding: '1.25rem', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-foreground-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Briefcase size={13} /> Projects
            </h2>

            {data.projects && data.projects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.projects.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <Link href={`/admin/projects/${p.id}`} style={{ fontWeight: 500, color: 'var(--color-foreground)', fontSize: '0.875rem', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </Link>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                        {p.quoted_value !== null ? formatMoney(p.quoted_value, p.currency) : 'No recorded value'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <Badge variant={PROJECT_STATUS_VARIANTS[p.status] ?? 'outline'}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                      {canManageProjects && (
                        <button
                          onClick={() => {
                            if (confirm(`Unlink "${p.name}" from this request? The project stays untouched.`)) unlinkProjectMutation.mutate(p.id)
                          }}
                          disabled={isBusy}
                          style={{ fontSize: '0.75rem', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Unlink size={12} /> Unlink
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
                {canViewProjects && data.customer
                  ? 'No projects linked yet. Link a project born from this request.'
                  : 'No projects linked to this request yet.'}
              </p>
            )}

            {canManageProjects && data.customer && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '0.5rem 0.625rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none' }}
                >
                  <option value="">Select project...</option>
                  {allProjects
                    .filter(p => p.status === 'active' || p.status === 'draft' || p.status === 'on_hold')
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedProjectId || isBusy}
                  loading={linkProjectMutation.isPending}
                  onClick={() => {
                    if (!data.customer) {
                      show('error', 'Link the request to a customer first.')
                      return
                    }
                    linkProjectMutation.mutate(selectedProjectId)
                  }}
                >
                  <Link2 size={14} /> Link
                </Button>
              </div>
            )}
            {canManageProjects && !data.customer && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                Link this request to a customer before linking projects — the request and its projects must share one customer.
              </p>
            )}
          </div>

          <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', padding: '1.25rem', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-foreground-muted)' }}>Contact</h2>
          <a href={`mailto:${data.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--color-foreground)', fontSize: '0.875rem', textDecoration: 'none' }}>
            <Mail size={15} style={{ color: 'var(--color-foreground-muted)' }} /> {data.email}
          </a>
          {data.phone && (
            <a
              href={`https://wa.me/${data.phone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--color-foreground)', fontSize: '0.875rem', textDecoration: 'none' }}
            >
              <Phone size={15} style={{ color: 'var(--color-foreground-muted)' }} /> {data.phone}
            </a>
          )}
          {data.user_agent && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', wordBreak: 'break-word' }}>
              <Globe size={12} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
              {data.user_agent}
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}