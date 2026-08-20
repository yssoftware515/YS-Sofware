'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAdminList } from '@/lib/hooks/useAdminResource'
import { Pagination } from '@/components/admin/Pagination'
import { formatMoney } from '@/lib/admin/format'

interface Subscription {
  id: string
  plan_name: string
  price: string
  currency: string
  billing_cycle: string
  monthly_equivalent: string
  starts_at: string
  ends_at: string
  status: 'active' | 'expired' | 'cancelled'
  customer: { id: string; name: string; email: string }
  product: { id: string; name_en: string; slug: string }
}

const RESOURCE = '/admin/subscriptions'

const statusColors: Record<string, { bg: string; color: string }> = {
  active:    { bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
  expired:   { bg: 'var(--color-background-muted)', color: 'var(--color-foreground-muted)' },
  cancelled: { bg: 'rgba(239,68,68,0.1)',  color: '#EF4444' },
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>}>
      <SubscriptionsListInner />
    </Suspense>
  )
}

function SubscriptionsListInner() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customer_id') ?? undefined
  const productId   = searchParams.get('product_id') ?? undefined
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const params: Record<string, string> = {}
  if (customerId) params.customer_id = customerId
  if (productId)  params.product_id  = productId
  if (statusFilter) params.status = statusFilter
  if (page > 1) params.page = String(page)

  const { data: list, isLoading, isError, error } =
    useAdminList<Subscription>(RESOURCE, Object.keys(params).length ? params : undefined, { withMeta: true })
  const subscriptions = list?.items ?? []
  const meta = list?.meta

  // Client math on money happens in integer cents only; totals are always
  // grouped per currency because monthly_equivalent is a decimal string
  // that must never be added across different currencies into one number.
  function monthlyCents(value: string): number {
    const [whole, frac = ''] = value.split('.')
    return (parseInt(whole, 10) || 0) * 100 + (parseInt(frac.slice(0, 2).padEnd(2, '0'), 10) || 0)
  }

  const activeMonthlyByCurrency = subscriptions
    .filter(s => s.status === 'active')
    .reduce<Record<string, number>>((acc, s) => {
      acc[s.currency] = (acc[s.currency] ?? 0) + monthlyCents(s.monthly_equivalent)
      return acc
    }, {})

  const totalMonthlyLabel = Object.entries(activeMonthlyByCurrency)
    .map(([currency, cents]) => formatMoney(cents / 100, currency))
    .join(' · ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Subscriptions</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
            {subscriptions.length} subscription(s)
            {!isLoading && !isError && activeMonthlyByCurrency && Object.keys(activeMonthlyByCurrency).length > 0 && ` · active ~${totalMonthlyLabel}/mo (this view, product-scoped)`}
          </p>
        </div>
        <Link href="/admin/subscriptions/new">
          <Button variant="primary" size="sm"><Plus size={16} /> Add Subscription</Button>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          style={{ padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Customer', 'Product', 'Plan', 'Price', 'Cycle', 'Ends', 'Status'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load subscriptions.'}
                </td></tr>
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No subscriptions yet. <Link href="/admin/subscriptions/new" style={{ color: 'var(--color-accent)' }}>Add one →</Link>
                </td></tr>
              ) : subscriptions.map((sub) => {
                const style = statusColors[sub.status]
                return (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <p style={{ fontWeight: 500, color: 'var(--color-foreground)' }}>{sub.customer.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{sub.customer.email}</p>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)' }}>{sub.product.name_en}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)' }}>{sub.plan_name}</td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', color: 'var(--color-foreground)' }}>{formatMoney(sub.price, sub.currency)}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', textTransform: 'capitalize' }}>{sub.billing_cycle}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{new Date(sub.ends_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.625rem', borderRadius: 9999, backgroundColor: style.bg, color: style.color, textTransform: 'capitalize' }}>
                        {sub.status}
                      </span>
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
