'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  lastPage: number
  total: number
  perPage: number
  onChange: (nextPage: number) => void
}

// Minimal pager shared by the paginated admin list screens. Keeps the
// page number + totals visible without redesigning any page.
export function Pagination({ page, lastPage, total, perPage, onChange }: PaginationProps) {
  if (lastPage <= 1) return null

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    padding: '0.375rem 0.625rem', borderRadius: 8,
    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)',
    color: 'var(--color-foreground)', fontSize: '0.8125rem', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '0.875rem 1rem', borderTop: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
        {from}–{to} of {total}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          style={buttonStyle}
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
          Page {page} of {lastPage}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= lastPage}
          style={buttonStyle}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}