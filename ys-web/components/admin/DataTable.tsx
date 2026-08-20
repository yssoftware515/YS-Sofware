'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  sortable?: boolean
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  sortField?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (field: string) => void
  emptyMessage?: string
  loading?: boolean
  pageSize?: number
  label?: string
}

export function DataTable<T extends object>({
  columns, data, keyField, sortField, sortDir, onSort, emptyMessage, loading, pageSize = 0, label,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(data.length / pageSize)) : 1
  const safePage = Math.min(page, totalPages - 1)

  const pagedData = useMemo(() => {
    if (pageSize <= 0) return data
    const start = safePage * pageSize
    return data.slice(start, start + pageSize)
  }, [data, safePage, pageSize])

  if (loading) {
    return (
      <div role="status" aria-busy="true" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--color-foreground-muted)', fontSize: '0.875rem' }}>
        Loading...
      </div>
    )
  }

  if (!data.length) {
    return (
      <div role="status" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--color-foreground-muted)', fontSize: '0.875rem' }}>
        {emptyMessage ?? 'No data found.'}
      </div>
    )
  }

  return (
    <div>
      <div role="region" aria-label={label ?? 'Data table'} style={{ overflowX: 'auto' }}>
        <table aria-label={label} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {columns.map(col => {
                const isSorted = sortField === col.key
                const ariaSort = isSorted ? (sortDir === 'asc' ? 'ascending' as const : 'descending' as const) : col.sortable ? 'none' as const : undefined

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                    style={{
                      padding: '0.75rem 1rem', textAlign: 'left',
                      fontWeight: 600, color: 'var(--color-foreground-muted)',
                      fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                      cursor: col.sortable ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                      display: col.hideOnMobile ? 'none' : undefined,
                    }}
                    className={col.hideOnMobile ? 'hidden sm:table-cell' : ''}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      {col.header}
                      {col.sortable && (
                        isSorted
                          ? (sortDir === 'asc' ? <ChevronUp size={13} style={{ color: 'var(--color-accent)' }} aria-hidden="true" /> : <ChevronDown size={13} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />)
                          : <ChevronsUpDown size={13} aria-hidden="true" />
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pagedData.map((item) => (
              <tr
                key={String(item[keyField])}
                style={{ borderBottom: '1px solid var(--color-border-subtle)', transition: 'background-color 150ms' }}
                className="hover:bg-background-subtle"
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    style={{
                      padding: '0.875rem 1rem', color: 'var(--color-foreground)',
                      display: col.hideOnMobile ? 'none' : undefined,
                    }}
                    className={col.hideOnMobile ? 'hidden sm:table-cell' : ''}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize > 0 && totalPages > 1 && (
        <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, data.length)} of {data.length}
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage <= 0}
              aria-label="Previous page"
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-foreground)', cursor: safePage <= 0 ? 'not-allowed' : 'pointer', opacity: safePage <= 0 ? 0.4 : 1, fontSize: '0.8125rem', minWidth: 44, minHeight: 44 }}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const start = Math.max(0, Math.min(safePage - 3, totalPages - 7))
              const pageNum = start + i
              if (pageNum >= totalPages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  aria-label={`Page ${pageNum + 1}`}
                  aria-current={pageNum === safePage ? 'page' : undefined}
                  style={{
                    padding: '0.5rem 0.875rem', borderRadius: '0.375rem', border: '1px solid var(--color-border)',
                    backgroundColor: pageNum === safePage ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: pageNum === safePage ? '#fff' : 'var(--color-foreground)',
                    cursor: 'pointer', fontSize: '0.8125rem', fontWeight: pageNum === safePage ? 600 : 400,
                    minWidth: 44, minHeight: 44,
                  }}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              aria-label="Next page"
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-foreground)', cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages - 1 ? 0.4 : 1, fontSize: '0.8125rem', minWidth: 44, minHeight: 44 }}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}
