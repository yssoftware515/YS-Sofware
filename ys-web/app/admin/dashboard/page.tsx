'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { FileText, ScrollText, Mail, AlertTriangle, Briefcase, CalendarClock } from 'lucide-react'
import { StatCard } from '@/components/admin/StatCard'
import { DashboardWidget } from '@/components/admin/DashboardWidget'
import { useAuth } from '@/components/admin/PermissionGate'
import { usePlatform } from '@/lib/platform/PlatformProvider'
import { formatDateTime, formatDate, formatMoney } from '@/lib/admin/format'
import type { WidgetDefinition } from '@/lib/platform/registries/WidgetRegistry'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const fetchOpts: RequestInit = { credentials: 'include', headers: { Accept: 'application/json' } }

// Widget id → key in the backend stats payload. Missing keys mean the
// caller has no permission for that module — render "—", never 0.
const COUNT_KEYS: Record<string, string> = {
  products:      'products',
  releases:      'releases',
  services:      'services',
  careers:       'careers',
  inquiries:     'contact_requests',
  customers:     'customers',
  projects:      'projects',
  'audit-logs':  'audit_logs',
  'static-pages': 'static_pages',
  faq:           'faqs',
  menus:         'menus',
  homepage:      'homepage_sections',
}

type CurrencyMap = Record<string, string>

interface AttentionItem {
  id: string
  name?: string
  title?: string
  customer_name?: string
  project_id?: string
  project_name?: string
  expected_completion_date?: string
  due_date?: string
  target_date?: string
  days_overdue?: number
  email?: string
  request_type?: string
  created_at?: string
}

interface AttentionSection {
  total: number
  items: AttentionItem[]
}

interface StatsData {
  counts: Record<string, number> & {
    recorded_project_value_by_currency?: CurrencyMap
    active_project_value_by_currency?: CurrencyMap
    completed_project_value_by_currency?: CurrencyMap
  }
  attention: {
    projects_overdue?: AttentionSection
    projects_on_hold?: AttentionSection
    data_integrity?: Record<string, { label: string; items: AttentionItem[] }>
    new_contact_requests?: AttentionSection
    tasks_overdue?: AttentionSection
    upcoming_milestone?: { id: string; title: string; project_id: string; project_name: string | null; target_date: string } | null
  }
  recent_contact_requests?: Array<{ id: string; name: string; email: string; request_type: string; status: string; created_at: string }>
  recent_audit_logs?: Array<{ id: string; action: string; resource_type: string; user_name?: string; created_at: string }>
  health?: { status: 'ok' | 'degraded'; checks?: Record<string, string> }
}

const quickLinks = [
  { label: 'Add Product',  href: '/admin/products',  icon: FileText, permission: 'manage_products' },
  { label: 'Static Pages', href: '/admin/static-pages', icon: FileText, permission: 'manage_static_pages' },
  { label: 'FAQ',          href: '/admin/faq',       icon: FileText, permission: 'manage_faqs' },
  { label: 'Menus',        href: '/admin/menus',     icon: FileText, permission: 'manage_menus' },
  { label: 'Homepage',     href: '/admin/homepage',  icon: FileText, permission: 'manage_homepage' },
  { label: 'View Settings',href: '/admin/settings',  icon: FileText },
]

const REQUEST_STATUS_COLORS: Record<string, string> = {
  new:      '#EC4899',
  read:     '#3B82F6',
  replied:  '#10B981',
  archived: '#6B7280',
}

export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const { user, hasPermission } = useAuth()
  const { kernel, loaded: platformLoaded } = usePlatform()

  const widgets: WidgetDefinition[] = platformLoaded && kernel
    ? kernel.getRegistry('widgets').getFilteredWidgets(hasPermission)
    : []

  useEffect(() => {
    let cancelled = false

    fetch(`${API}/admin/dashboard/stats`, fetchOpts)
      .then(async r => {
        const body = await r.json()
        if (cancelled) return
        if (r.ok && body?.success) {
          setData(body.data as StatsData)
          setLoadError(false)
        } else {
          // 401/403/5xx or a `success:false` body — never render the
          // dashboard as an empty, healthy panel over a failed request.
          setData(null)
          setLoadError(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [retryKey])

  const retry = () => {
    setLoading(true)
    setLoadError(false)
    setRetryKey(k => k + 1)
  }

  const visibleLinks = quickLinks.filter(l => !l.permission || hasPermission(l.permission))

  const health = data?.health
  const healthOk = health?.status === 'ok'
  const healthDegraded = health?.status === 'degraded'
  const healthDot = healthOk ? '#10B981' : healthDegraded ? '#F59E0B' : '#9CA3AF'
  const healthLabel = healthOk
    ? 'All systems operational'
    : healthDegraded
      ? 'System degraded'
      : loadError ? 'Health check unavailable' : 'Checking...'

  const recentRequests = data?.recent_contact_requests ?? []
  const recentLogs = data?.recent_audit_logs ?? []

  const moneyByCurrency = data?.counts.recorded_project_value_by_currency
  const attention = data?.attention
  const overdue = attention?.projects_overdue
  const onHold = attention?.projects_on_hold
  const integrityFlags = attention?.data_integrity
  const newRequests = attention?.new_contact_requests
  const overdueTasks = attention?.tasks_overdue
  const upcoming = attention?.upcoming_milestone
  const integrityCount = Object.keys(integrityFlags ?? {}).length
  const noAttentionNeeded = !(overdue?.total || onHold?.total || integrityCount || newRequests?.total || overdueTasks?.total)
  const hasAnyAttention = Boolean(attention)
  const deliveryCountsVisible = data != null && data.counts.overdue_tasks !== undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 className="font-display font-semibold" style={{ fontSize: '1.5rem', color: 'var(--color-foreground)', marginBottom: '0.25rem' }}>
          {loading ? 'Loading...' : `Welcome back${user ? `, ${user.name.split(' ')[0]}` : ''}!`}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
          {user ? `${user.role.name} · YS Systems & Software` : 'YS Systems & Software Admin Panel'}
        </p>
      </div>

      {loadError && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
          padding: '0.875rem 1rem', borderRadius: 10,
          border: '1px solid var(--color-error)', backgroundColor: 'var(--color-error-subtle, #FEE2E2)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-error)' }}>
            <AlertTriangle size={15} />
            Unable to load dashboard statistics — the numbers below are not current.
          </span>
          <button
            onClick={retry}
            disabled={loading}
            style={{ padding: '0.375rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-error)', backgroundColor: 'transparent', color: 'var(--color-error)', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.map(w => {
          const countKey = COUNT_KEYS[w.id]
          const value = countKey && data != null && data.counts[countKey] !== undefined
            ? data.counts[countKey]
            : '—'
          return (
            <StatCard key={w.id} label={w.title} value={value} icon={w.icon} color={w.color} />
          )
        })}
      </div>

      {deliveryCountsVisible && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Overdue tasks" value={data!.counts.overdue_tasks} icon={AlertTriangle} color="#DC2626" />
          <StatCard label="Blocked tasks" value={data!.counts.blocked_tasks} icon={CalendarClock} color="#F59E0B" />
        </div>
      )}

      {moneyByCurrency !== undefined && (
        <DashboardWidget
          title="Recorded Business Value"
          description="Sum of quoted values for active, on-hold and completed engagements — grouped per currency. Recorded figures, never revenue, and never summed across currencies."
          actions={<Briefcase size={15} style={{ color: 'var(--color-foreground-muted)' }} />}
        >
          {Object.keys(moneyByCurrency).length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>No recorded engagement values yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(moneyByCurrency).map(([currency, total]) => (
                <div key={currency} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.625rem 0.875rem', borderRadius: 8,
                  border: '1px solid var(--color-border-subtle)',
                  backgroundColor: 'var(--color-background-subtle)',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{currency}</span>
                  <span className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)' }}>
                    {formatMoney(total, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardWidget>
      )}

      {hasAnyAttention && (
        <DashboardWidget
          title="Needs Attention"
          description="Engagements and requests that need your hand today"
          actions={<AlertTriangle size={15} style={{ color: 'var(--color-foreground-muted)' }} />}
        >
          {noAttentionNeeded ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.25rem 0', color: 'var(--color-success)' }}>
              <CheckIcon />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>All clear — nothing needs attention right now.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {overdue && overdue.total > 0 && (
                <AttentionBlock
                  title="Overdue projects"
                  accent="#EF4444"
                  items={overdue.items}
                  href={item => `/admin/projects/${item.id}`}
                  badge={item => item.days_overdue != null ? `${item.days_overdue}d late` : undefined}
                >
                  {item => (
                    <>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      {item.customer_name && <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>· {item.customer_name}</span>}
                    </>
                  )}
                </AttentionBlock>
              )}

              {onHold && onHold.total > 0 && (
                <AttentionBlock
                  title="On-hold engagements"
                  accent="#F59E0B"
                  items={onHold.items}
                  href={item => `/admin/projects/${item.id}`}
                >
                  {item => (
                    <>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      {item.customer_name && <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>· {item.customer_name}</span>}
                    </>
                  )}
                </AttentionBlock>
              )}

              {overdueTasks && overdueTasks.total > 0 && (
                <AttentionBlock
                  title="Overdue tasks"
                  accent="#DC2626"
                  items={overdueTasks.items}
                  href={item => `/admin/projects/${item.project_id ?? ''}`}
                  badge={item => item.days_overdue != null ? `${item.days_overdue}d late` : undefined}
                >
                  {item => (
                    <>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                      {item.project_name && <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>· {item.project_name}</span>}
                    </>
                  )}
                </AttentionBlock>
              )}

              {integrityFlags && Object.entries(integrityFlags).map(([key, flag]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {flag.label}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {flag.items.map(item => (
                      <Link key={item.id} href={`/admin/projects/${item.id}`} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.5rem 0.625rem', borderRadius: 8,
                        color: 'var(--color-foreground)', textDecoration: 'none', fontSize: '0.8125rem',
                      }} className="hover:bg-background-subtle">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        <span style={{ color: 'var(--color-foreground-muted)', flexShrink: 0 }}>fix →</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {newRequests && newRequests.total > 0 && (
                <AttentionBlock
                  title="New contact requests"
                  accent="#EC4899"
                  items={newRequests.items}
                  href={item => `/admin/contact-requests/${item.id}`}
                >
                  {item => (
                    <>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      {item.email && <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>· {item.email}</span>}
                    </>
                  )}
                </AttentionBlock>
              )}
            </div>
          )}
        </DashboardWidget>
      )}

      {upcoming && (
        <DashboardWidget
          title="Delivery Horizon"
          description="The closest upcoming milestone across all engagements"
          actions={<CalendarClock size={15} style={{ color: 'var(--color-foreground-muted)' }} />}
        >
          <Link href={`/admin/projects/${upcoming.project_id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
            padding: '0.625rem 0.875rem', borderRadius: 8,
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-background-subtle)',
            color: 'var(--color-foreground)', textDecoration: 'none', fontSize: '0.8125rem',
          }} className="hover:border-border-strong hover:bg-background-muted">
            <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{upcoming.title}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>
              {upcoming.project_name} · {formatDate(upcoming.target_date)}
            </span>
          </Link>
        </DashboardWidget>
      )}

      <DashboardWidget title="Quick Actions" description="Common management tasks">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {visibleLinks.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground-muted)', textDecoration: 'none', transition: 'all 150ms' }}
              className="hover:text-foreground hover:border-border-strong hover:bg-background-subtle">
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </div>
      </DashboardWidget>

      <DashboardWidget title="System Status" description="Live database & cache probe from the API health check">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: healthDot, boxShadow: `0 0 0 3px ${healthDot}33` }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground)' }}>{healthLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {healthDegraded && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                {Object.entries(health?.checks ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}
              </span>
            )}
            <Link href="/en/status" style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
              View Status Page →
            </Link>
          </div>
        </div>
      </DashboardWidget>

      {recentRequests.length > 0 && (
        <DashboardWidget title="Recent Inquiries" description="Latest contact requests" actions={<Mail size={15} style={{ color: 'var(--color-foreground-muted)' }} />}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentRequests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{r.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{formatDateTime(r.created_at)}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: 999, backgroundColor: `${REQUEST_STATUS_COLORS[r.status] ?? '#6B7280'}18`, color: REQUEST_STATUS_COLORS[r.status] ?? '#6B7280' }}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}

      {recentLogs.length > 0 && (
        <DashboardWidget title="Recent Activity" description="Latest audit log events from the admin panel" actions={<ScrollText size={15} style={{ color: 'var(--color-foreground-muted)' }} />}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground)' }}>{log.action} <span style={{ color: 'var(--color-foreground-muted)', fontWeight: 400 }}>· {log.resource_type}</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{log.user_name ?? 'system'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{formatDateTime(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </DashboardWidget>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: '50%',
      border: '2px solid var(--color-success)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.6875rem', lineHeight: 1, color: 'var(--color-success)', fontWeight: 700,
    }}>✓</span>
  )
}

interface AttentionBlockProps {
  title: string
  accent: string
  items: AttentionItem[]
  href: (item: AttentionItem) => string
  badge?: (item: AttentionItem) => string | undefined
  children: (item: AttentionItem) => ReactNode
}

function AttentionBlock({ title, accent, items, href, badge, children }: AttentionBlockProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {title} <span style={{ color: accent }}>({items.length})</span>
      </span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map(item => (
          <Link key={item.id} href={href(item)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
            padding: '0.5rem 0.625rem', borderRadius: 8,
            color: 'var(--color-foreground)', textDecoration: 'none', fontSize: '0.8125rem',
          }} className="hover:bg-background-subtle">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minWidth: 0 }}>{children(item)}</span>
            {badge && badge(item) !== undefined && (
              <span style={{
                fontSize: '0.6875rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: 999,
                backgroundColor: `${accent}18`, color: accent, flexShrink: 0,
              }}>
                {badge(item)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}