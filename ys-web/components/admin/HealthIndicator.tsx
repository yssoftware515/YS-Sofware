'use client'

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

interface HealthIndicatorProps {
  status: HealthStatus
  label: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<HealthStatus, { color: string; bg: string; label: string }> = {
  healthy:  { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Healthy' },
  warning:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Warning' },
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Critical' },
  unknown:  { color: '#71717A', bg: 'rgba(113,113,122,0.12)', label: 'Unknown' },
}

export function HealthIndicator({ status, label, subtitle, size = 'md' }: HealthIndicatorProps) {
  const cfg = statusConfig[status]
  const dotSize = size === 'sm' ? 8 : size === 'lg' ? 14 : 10
  const glowSize = dotSize + 8

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ position: 'relative', width: dotSize, height: dotSize, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', inset: (dotSize - glowSize) / 2, borderRadius: '50%',
          width: glowSize, height: glowSize,
          backgroundColor: cfg.bg, opacity: 0.6,
        }} />
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          backgroundColor: cfg.color,
          boxShadow: `0 0 0 1.5px ${cfg.bg}`,
        }} />
      </div>
      <div>
        <div style={{ fontSize: size === 'sm' ? '0.8125rem' : '0.875rem', fontWeight: 500, color: 'var(--color-foreground)' }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

export function StatusDot({ status, size = 8 }: { status: HealthStatus; size?: number }) {
  const cfg = statusConfig[status]
  const glowSize = size + 6
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-block' }}>
      <div style={{
        position: 'absolute', inset: (size - glowSize) / 2, borderRadius: '50%',
        width: glowSize, height: glowSize, backgroundColor: cfg.bg, opacity: 0.5,
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        backgroundColor: cfg.color, boxShadow: `0 0 0 1.5px ${cfg.bg}`,
      }} />
    </div>
  )
}
