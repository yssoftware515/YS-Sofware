'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, PauseCircle, CalendarClock } from 'lucide-react'
import { adminGet } from '@/lib/admin/api'
import { adminProjectDetailSchema, type AdminProjectDetail } from '@/lib/schemas/admin'
import { ProjectForm, type ProjectFormData, STATUS_LABELS } from '@/components/admin/ProjectForm'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/components/admin/PermissionGate'
import { ProjectDelivery } from '@/components/admin/ProjectDelivery'
import { formatMoney } from '@/lib/admin/format'

const statusVariant: Record<ProjectFormData['status'], 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  draft: 'outline',
  active: 'success',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'error',
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { hasPermission } = useAuth()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['/admin/projects', id],
    queryFn: () => adminGet<AdminProjectDetail>(`/admin/projects/${id}`, { schema: adminProjectDetailSchema }),
  })

  if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (isError || !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load project.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {data.is_overdue && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem', borderRadius: '0.75rem',
          border: '1px solid #EF444455', backgroundColor: '#EF44440D',
        }}>
          <AlertTriangle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#B91C1C' }}>
              This engagement is overdue by {data.days_overdue} day{data.days_overdue === 1 ? '' : 's'}.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
              Expected completion was {data.expected_completion_date}. Update the schedule or the status below.
            </p>
          </div>
        </div>
      )}

      {data.status === 'on_hold' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.875rem 1rem', borderRadius: '0.75rem',
          border: '1px solid #F59E0B55', backgroundColor: '#F59E0B0D',
        }}>
          <PauseCircle size={16} style={{ color: '#D97706', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400E' }}>This engagement is on hold.</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
              Paused engagements still count toward recorded business value. Re-open by moving it back to active.
            </p>
          </div>
        </div>
      )}

      <div style={{
        borderRadius: '0.875rem', border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)', padding: '1rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.875rem' }}>
          <div>
            <h2 className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)' }}>{data.name}</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
              {data.customer ? (
                <>Customer: <Link href={`/admin/customers/${data.customer.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>{data.customer.company ?? data.customer.name}</Link></>
              ) : 'No linked customer'}
              {data.contact_request && (
                <> · From request: <Link href={`/admin/contact-requests/${data.contact_request.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>{data.contact_request.name}</Link></>
              )}
              {data.creator?.name ? ` · created by ${data.creator.name}` : ''}
            </p>
          </div>
          <Badge variant={statusVariant[data.status]}>{STATUS_LABELS[data.status] ?? data.status}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <EngagementMetric label="Quoted value" value={formatMoney(data.quoted_value, data.currency)} />
          <EngagementMetric label="Start date" value={data.start_date ?? '—'} />
          <EngagementMetric label="Expected completion" value={data.expected_completion_date ?? '—'} extras={<CalendarClock size={13} style={{ color: data.is_overdue ? '#EF4444' : 'var(--color-foreground-muted)' }} />} />
          <EngagementMetric label="Completed at" value={data.completed_at ? new Date(data.completed_at).toLocaleDateString() : '—'} />
        </div>
      </div>

<ProjectDelivery
        projectId={id}
        delivery={data.delivery}
        canManage={hasPermission('manage_projects')}
      />

      <ProjectForm
        projectId={id}
        canViewFinancials={hasPermission('view_financials')}
        initialData={{
          name: data.name,
          customer_id: data.customer_id ?? '',
          project_type: data.project_type ?? '',
          description: data.description ?? '',
          status: data.status,
          start_date: data.start_date ?? '',
          expected_completion_date: data.expected_completion_date ?? '',
          quoted_value: data.quoted_value,
          currency: data.currency ?? 'USD',
          internal_notes: data.internal_notes ?? '',
          service_ids: data.services.map(s => s.id),
        }}
      />
    </div>
  )
}

function EngagementMetric({ label, value, extras }: { label: string; value: string; extras?: ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>{label} {extras}</p>
      <p className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)', marginTop: '0.25rem' }}>{value}</p>
    </div>
  )
}