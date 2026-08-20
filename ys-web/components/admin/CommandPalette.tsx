'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, type LucideIcon } from 'lucide-react'
import { usePlatform } from '@/lib/platform/PlatformProvider'

interface Command {
  id: string
  label: string
  category: string
  icon?: LucideIcon
  href?: string
  action?: () => void
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { kernel, loaded } = usePlatform()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Command[] = buildCommands(router, kernel, loaded)

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase()) ||
        c.id.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const execute = useCallback((cmd: Command) => {
    if (cmd.action) { cmd.action(); onClose(); return }
    if (cmd.href) { router.push(cmd.href); onClose(); return }
  }, [router, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && filtered[activeIndex]) { e.preventDefault(); execute(filtered[activeIndex]) }
    else if (e.key === 'Escape') { onClose() }
  }

  const grouped = groupBy(filtered, c => c.category)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh', paddingLeft: '1rem', paddingRight: '1rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '36rem', maxHeight: '65vh',
          backgroundColor: 'var(--color-surface)', borderRadius: '1rem',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-modal-lg)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <Search size={18} style={{ color: 'var(--color-foreground-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands and pages..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '0.9375rem', color: 'var(--color-foreground)',
            }}
          />
          <button onClick={onClose} aria-label="Close" style={{ padding: '0.25rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
              No commands found
            </div>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div style={{ padding: '0.5rem 1.25rem 0.25rem', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-foreground-muted)', letterSpacing: '0.05em' }}>
                {category}
              </div>
              {items.map((cmd, idx) => {
                const globalIndex = filtered.indexOf(cmd)
                const isActive = globalIndex === activeIndex
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                      padding: '0.625rem 1.25rem', border: 'none', cursor: 'pointer',
                      textAlign: 'left', backgroundColor: isActive ? 'var(--color-background-subtle)' : 'transparent',
                      transition: 'background-color 100ms',
                    }}
                  >
                    {Icon && (
                      <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} style={{ color: 'var(--color-accent)' }} />
                      </div>
                    )}
                    <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--color-foreground)' }}>{cmd.label}</span>
                    {cmd.href && <ArrowRight size={13} style={{ color: 'var(--color-foreground-muted)', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 1.25rem', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>↑</kbd><kbd style={kbdStyle}>↓</kbd> navigate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>↵</kbd> select
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--color-foreground-muted)' }}>
            <kbd style={kbdStyle}>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}

function buildCommands(router: ReturnType<typeof useRouter>, kernel: any, loaded: boolean): Command[] {
  const cmds: Command[] = [
    { id: 'goto-dashboard', label: 'Go to Dashboard', category: 'Navigation', href: '/admin/dashboard' },
    { id: 'goto-modules', label: 'Go to Module Manager', category: 'Navigation', href: '/admin/platform/modules' },
    { id: 'goto-registries', label: 'Go to Registry Inspector', category: 'Navigation', href: '/admin/platform/registries' },
    { id: 'goto-health', label: 'Go to System Health', category: 'Navigation', href: '/admin/platform/health' },
    { id: 'goto-settings', label: 'Go to Settings', category: 'Navigation', href: '/admin/settings' },
    { id: 'goto-users', label: 'Go to Users', category: 'Navigation', href: '/admin/users' },
    { id: 'goto-roles', label: 'Go to Roles & Permissions', category: 'Navigation', href: '/admin/roles' },
  ]

  if (loaded && kernel) {
    const groups = kernel.getRegistry('navigation').getGroups()
    for (const group of groups) {
      for (const item of group.items) {
        cmds.push({
          id: `nav-${item.href}`,
          label: `${item.labelEn} (${group.labelEn})`,
          category: 'Navigation',
          icon: item.icon,
          href: item.href,
        })
      }
    }
  }

  return cmds
}

function groupBy<T>(items: T[], fn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const key = fn(item)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 18, height: 18, padding: '0 4px', borderRadius: 4,
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  fontSize: '0.65rem', fontFamily: 'monospace',
}
