'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Package, FileText, Users, Settings, Shield, Box, Puzzle, Activity } from 'lucide-react'
import { usePlatform } from '@/lib/platform/PlatformProvider'

interface SearchResultGroup {
  label: string
  icon: typeof Box
  color: string
  results: Array<{
    id: string
    label: string
    description?: string
    href: string
  }>
}

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { kernel, loaded } = usePlatform()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const groups: SearchResultGroup[] = buildSearchGroups(query, kernel, loaded)

  const flatResults = groups.flatMap(g => g.results)

  const navigate = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flatResults.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && flatResults[activeIndex]) { e.preventDefault(); navigate(flatResults[activeIndex].href) }
    else if (e.key === 'Escape') { onClose() }
  }

  const visibleGroups = groups.filter(g => g.results.length > 0)

  // Flat index of each group's first result — computed declaratively so
  // render stays pure (no accumulator mutated during JSX evaluation).
  const groupStarts = visibleGroups.map((g, i) =>
    visibleGroups.slice(0, i).reduce((total, prev) => total + prev.results.length, 0),
  )

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
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
          width: '100%', maxWidth: '40rem', maxHeight: '70vh',
          backgroundColor: 'var(--color-surface)', borderRadius: '1rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-modal)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <Search size={18} style={{ color: 'var(--color-foreground-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search modules, users, settings, pages..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '0.9375rem', color: 'var(--color-foreground)',
            }}
          />
          <button onClick={onClose} aria-label="Close" style={{ padding: '0.25rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
          {query.trim() && visibleGroups.length === 0 && (
            <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
              No results found
            </div>
          )}
          {!query.trim() && (
            <div style={{ padding: '2rem 1.25rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
              Type to search across the entire platform
            </div>
          )}
          {visibleGroups.map((group, groupIdx) => {
            const groupStartIndex = groupStarts[groupIdx]
            return (
              <div key={group.label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem 0.375rem' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: `${group.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <group.icon size={12} style={{ color: group.color }} />
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-foreground-muted)', letterSpacing: '0.05em' }}>
                    {group.label}
                  </span>
                </div>
                {group.results.map((r, idx) => {
                  const index = groupStartIndex + idx
                  const isActive = index === activeIndex
                  return (
                    <button
                      key={r.id}
                      onClick={() => navigate(r.href)}
                      onMouseEnter={() => setActiveIndex(index)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                        padding: '0.625rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                        textAlign: 'left', backgroundColor: isActive ? 'var(--color-background-subtle)' : 'transparent',
                        transition: 'background-color 100ms',
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: `${group.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <group.icon size={13} style={{ color: group.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground)' }}>{r.label}</div>
                        {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>{r.description}</div>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 1.25rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>↑</kbd><kbd style={kbdStyle}>↓</kbd> navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>↵</kbd> open
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}

function buildSearchGroups(query: string, kernel: any, loaded: boolean): SearchResultGroup[] {
  const q = query.toLowerCase().trim()
  const groups: SearchResultGroup[] = []

  if (!q || !loaded || !kernel) {
    if (!q) return groups

    groups.push({
      label: 'Modules', icon: Puzzle, color: '#8B5CF6',
      results: kernel?.getModules().filter((m: any) =>
        m.manifest.name.en.toLowerCase().includes(q) || m.manifest.id.includes(q)
      ).map((m: any) => ({
        id: `module-${m.manifest.id}`, label: m.manifest.name.en,
        description: `v${m.manifest.version} · ${m.manifest.enabled ? 'Enabled' : 'Disabled'}`,
        href: `/admin/platform/modules/${m.manifest.id}`,
      })) ?? [],
    })
    return groups
  }

  groups.push({
    label: 'Modules', icon: Puzzle, color: '#8B5CF6',
    results: kernel.getModules().filter((m: any) =>
      m.manifest.name.en.toLowerCase().includes(q) || m.manifest.id.includes(q)
    ).map((m: any) => ({
      id: `module-${m.manifest.id}`, label: m.manifest.name.en,
      description: `v${m.manifest.version} · ${m.manifest.enabled ? 'Enabled' : 'Disabled'}`,
      href: `/admin/platform/modules/${m.manifest.id}`,
    })),
  })

  groups.push({
    label: 'Navigation', icon: Box, color: '#3B82F6',
    results: kernel.getRegistry('navigation').getGroups().flatMap((g: any) =>
      g.items.filter((i: any) => i.labelEn.toLowerCase().includes(q)).map((i: any) => ({
        id: `nav-${i.href}`, label: i.labelEn,
        description: g.labelEn,
        href: i.href,
      }))
    ),
  })

  groups.push({
    label: 'Permissions', icon: Shield, color: '#EC4899',
    results: kernel.getRegistry('permissions').getGroups().filter((g: any) =>
      g.group.toLowerCase().includes(q) || g.permissions.some((p: string) => p.includes(q))
    ).flatMap((g: any) => g.permissions.filter((p: string) => !q || p.includes(q)).map((p: string) => ({
      id: `perm-${p}`, label: p.replace(/_/g, ' '),
      description: g.group,
      href: '/admin/roles',
    }))),
  })

  groups.push({
    label: 'Registries', icon: Activity, color: '#14B8A6',
    results: [
      { id: 'reg-navigation', label: 'Navigation Registry', href: '/admin/platform/registries' },
      { id: 'reg-permissions', label: 'Permission Registry', href: '/admin/platform/registries' },
      { id: 'reg-widgets', label: 'Widget Registry', href: '/admin/platform/registries' },
      { id: 'reg-settings', label: 'Settings Registry', href: '/admin/platform/registries' },
      { id: 'reg-search', label: 'Search Registry', href: '/admin/platform/registries' },
      { id: 'reg-seo', label: 'SEO Registry', href: '/admin/platform/registries' },
      { id: 'reg-feature-flags', label: 'Feature Flag Registry', href: '/admin/platform/registries' },
    ].filter(r => !q || r.label.toLowerCase().includes(q)),
  })

  return groups
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 18, height: 18, padding: '0 4px', borderRadius: 4,
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  fontSize: '0.65rem', fontFamily: 'monospace',
}
