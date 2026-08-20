'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'
import { SERVICE_CLASS_LABELS, SERVICE_CLASS_TYPES, type ServiceFormData } from '@/components/admin/ServiceForm'
import { formatMoney } from '@/lib/admin/format'

interface Service {
  id: string; slug: string; name_en: string; name_ar: string
  category: string | null
  service_class: ServiceFormData['service_class']
  pricing_type: string
  starting_price: string | null
  currency: string | null
  status: 'active' | 'inactive' | 'archived'
  is_featured: boolean
  created_at: string
}

const statusConfig: Record<Service['status'], { label: string; variant: 'success' | 'default' | 'outline' }> = {
  active:   { label: 'Active',   variant: 'success' },
  inactive: { label: 'Inactive', variant: 'default' },
  archived: { label: 'Archived', variant: 'outline' },
}

export default function AdminServicesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [classFilter, setClassFilter] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), searchInput ? 300 : 0)
    return () => clearTimeout(t)
  }, [searchInput])

  const params: Record<string, string> = {}
  if (search) params.search = search
  if (classFilter) params.service_class = classFilter

  const {
    data: services = [],
    isLoading,
    isError,
    error,
  } = useAdminList<Service>('/admin/services', Object.keys(params).length ? params : undefined)

  const deleteService = useAdminDelete('/admin/services')

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Active services must be set to Inactive first.`)) return
    deleteService.mutate(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Services</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>The company services you offer beyond SaaS products</p>
        </div>
        <Link href="/admin/services/new">
          <Button variant="primary" size="sm">
            <Plus size={16} /> Add Service
          </Button>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: '24rem', flex: 1, minWidth: '14rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-muted)' }} />
          <input
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search services..."
            style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={classFilter} onChange={e => setClassFilter(e.target.value)}
          style={{ padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none' }}
        >
          <option value="">All Classes</option>
          {SERVICE_CLASS_TYPES.map(c => (
            <option key={c} value={c}>{SERVICE_CLASS_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Name', 'Category', 'Class', 'Pricing', 'Status', 'Featured', 'Created', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load services.'}
                </td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No services found. <Link href="/admin/services/new" style={{ color: 'var(--color-accent)' }}>Create one →</Link>
                </td></tr>
              ) : services.map((service) => {
                const cfg = statusConfig[service.status] ?? statusConfig.inactive
                const price = service.pricing_type === 'custom_quote' || !service.starting_price
                  ? 'Custom Quote'
                  : formatMoney(service.starting_price, service.currency)
                return (
                  <tr key={service.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div>
                        <p style={{ fontWeight: 500, color: 'var(--color-foreground)' }}>{service.name_en}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{service.name_ar}</p>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', fontSize: '0.8125rem' }}>
                      {service.category ?? '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {service.service_class ? (
                        <Badge variant="outline">{SERVICE_CLASS_LABELS[service.service_class]}</Badge>
                      ) : <span style={{ color: 'var(--color-foreground-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground)', fontSize: '0.8125rem' }}>
                      {price}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: service.is_featured ? 'var(--color-success)' : 'var(--color-foreground-muted)' }}>
                      {service.is_featured ? '★' : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {new Date(service.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link href={`/admin/services/${service.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)', display: 'flex' }} title="Edit">
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(service.id, service.name_en)}
                          disabled={deleteService.isPending && deleteService.variables === service.id}
                          style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: (deleteService.isPending && deleteService.variables === service.id) ? 'var(--color-foreground-muted)' : 'var(--color-error)' }}
                          title="Delete"
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
      </div>
    </div>
  )
}