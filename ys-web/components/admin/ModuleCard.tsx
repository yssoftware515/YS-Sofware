'use client'

import Link from 'next/link'
import { Settings, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { HealthIndicator, type HealthStatus } from './HealthIndicator'

interface ModuleCardProps {
  id: string
  name: string
  technicalName: string
  version: string
  enabled: boolean
  description: string
  health?: HealthStatus
  href: string
}

const moduleIcons: Record<string, typeof Settings> = {}

export function ModuleCard({ id, name, technicalName, version, enabled, description, health, href }: ModuleCardProps) {
  return (
    <div style={{
      borderRadius: '0.875rem', border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'border-color 200ms, box-shadow 200ms',
    }} className="hover:border-border-strong hover:shadow-sm">
      <div style={{ padding: '1.25rem 1.25rem 0.75rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <Link href={href} style={{ textDecoration: 'none' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-foreground)', margin: 0 }}>
                {name}
              </h3>
            </Link>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-foreground-muted)' }}>
              {technicalName}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
            {health && <HealthIndicator status={health} label="" size="sm" />}
            <Badge variant={enabled ? 'success' : 'default'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', lineHeight: 1.5, margin: 0 }}>
          {description}
        </p>
      </div>
      <div style={{
        padding: '0.75rem 1.25rem', borderTop: '1px solid var(--color-border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'var(--color-background-subtle)',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
          v{version}
        </span>
        <Link href={href} style={{ textDecoration: 'none' }}>
          <Button variant="ghost" size="sm">
            Details
            <ExternalLink size={13} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
