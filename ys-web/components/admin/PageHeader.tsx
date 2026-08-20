import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, backHref, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        {backHref && (
          <Link
            href={backHref}
            style={{
              display: 'flex', padding: '0.5rem', borderRadius: 8,
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground-muted)',
            }}
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </Link>
        )}
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
    </div>
  )
}
