import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  color?: string
}

export function StatCard({ label, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <div
      style={{
        padding: '1.25rem', borderRadius: '0.875rem',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: color ? `${color}18` : 'var(--color-accent-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon size={15} style={{ color: color ?? 'var(--color-accent)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem' }}>
        <span className="font-display font-semibold" style={{ fontSize: '1.75rem', color: 'var(--color-foreground)', lineHeight: 1 }}>
          {value}
        </span>
        {trend && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: trend.positive ? 'var(--color-success)' : 'var(--color-error)' }}>
            {trend.positive ? '+' : '-'}{trend.value}
          </span>
        )}
      </div>
    </div>
  )
}
