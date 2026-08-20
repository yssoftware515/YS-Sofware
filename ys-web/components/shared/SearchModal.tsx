'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, Package, FileText, Briefcase, Megaphone } from 'lucide-react'
import { api } from '@/lib/api/client'
import type { SearchResult } from '@/types'

const content = {
  en: {
    placeholder: 'Search products, docs, careers...',
    no_results: 'No results found',
    hint_navigate: 'to navigate',
    hint_select: 'to select',
    hint_close: 'to close',
    type_labels: { product: 'Products', article: 'Documentation', career: 'Careers', update: 'Updates' },
  },
  ar: {
    placeholder: 'ابحث في المنتجات والتوثيق والوظائف...',
    no_results: 'لا توجد نتائج',
    hint_navigate: 'للتنقل',
    hint_select: 'للاختيار',
    hint_close: 'للإغلاق',
    type_labels: { product: 'المنتجات', article: 'التوثيق', career: 'الوظائف', update: 'المستجدات' },
  },
}

const typeIcons: Record<string, typeof Package> = {
  product: Package, article: FileText, career: Briefcase, update: Megaphone,
}

const typeColors: Record<string, string> = {
  product: 'var(--color-accent)', article: '#10B981', career: '#F59E0B', update: '#8B5CF6',
}

interface SearchModalProps {
  locale: string
  onClose: () => void
}

export function SearchModal({ locale, onClose }: SearchModalProps) {
  const t = content[locale as keyof typeof content] ?? content.en
  const router = useRouter()

  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<SearchResult[]>([])
  const [loading, setLoading]     = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The modal is mounted fresh for each open (parent keys the render on
  // `open`), so state is already reset here — only focus remains.
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Debounced search — minimum 2 characters (matches backend validation)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      // Nothing is requested below 2 chars — no state reset needed here.
      // The spinner is only honored for searchable-length queries (see
      // the input gate), and any in-flight fetch still resets `loading`
      // when it settles.
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await api.search(query.trim(), locale)
        setResults(response.results)
        setActiveIndex(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, locale])

  const navigateToResult = useCallback((result: SearchResult) => {
    const pathByType: Record<string, string> = {
      product: `/${locale}/products/${result.url}`,
      article: `/${locale}/docs/${result.url}`,
      career:  `/${locale}/careers`,
      update:  `/${locale}/updates`,
    }
    router.push(pathByType[result.type] ?? `/${locale}`)
    onClose()
  }, [locale, router, onClose])

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      navigateToResult(results[activeIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '10vh', paddingLeft: '1rem', paddingRight: '1rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '38rem', maxHeight: '70vh',
          backgroundColor: 'var(--color-surface)', borderRadius: '1rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          {loading && query.trim().length >= 2
            ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--color-foreground-muted)', flexShrink: 0 }} />
            : <Search size={18} style={{ color: 'var(--color-foreground-muted)', flexShrink: 0 }} />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '0.9375rem', color: 'var(--color-foreground)',
            }}
          />
          <button onClick={onClose} aria-label={locale === 'ar' ? 'إغلاق البحث' : 'Close search'} style={{ padding: '0.25rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <div style={{ padding: '3rem 1.25rem', textAlign: 'center', color: 'var(--color-foreground-muted)', fontSize: '0.875rem' }}>
              {t.no_results}
            </div>
          )}

          {query.trim().length >= 2 && results.length > 0 && (
            <div style={{ padding: '0.5rem' }}>
              {results.map((result, index) => {
                const Icon  = typeIcons[result.type] ?? Package
                const color = typeColors[result.type] ?? 'var(--color-accent)'
                const isActive = index === activeIndex

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => navigateToResult(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                      padding: '0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                      textAlign: locale === 'ar' ? 'right' : 'left',
                      backgroundColor: isActive ? 'var(--color-background-subtle)' : 'transparent',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.title}
                      </p>
                      {result.excerpt && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.125rem' }}>
                          {result.excerpt}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>
                      {t.type_labels[result.type as keyof typeof t.type_labels] ?? result.type}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Keyboard hints footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 1.25rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>↑</kbd><kbd style={kbdStyle}>↓</kbd> {t.hint_navigate}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>↵</kbd> {t.hint_select}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>esc</kbd> {t.hint_close}
          </span>
        </div>
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 18, height: 18, padding: '0 4px', borderRadius: 4,
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  fontSize: '0.65rem', fontFamily: 'monospace',
}
