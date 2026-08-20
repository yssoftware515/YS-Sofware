interface DashboardWidgetProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}

export function DashboardWidget({ title, description, children, className, actions }: DashboardWidgetProps) {
  return (
    <div
      className={className}
      style={{
        borderRadius: '0.875rem',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div>
          <h3 className="font-display font-semibold" style={{ fontSize: '0.875rem', color: 'var(--color-foreground)' }}>
            {title}
          </h3>
          {description && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
              {description}
            </p>
          )}
        </div>
        {actions}
      </div>
      <div style={{ padding: '1.25rem', flex: 1 }}>
        {children}
      </div>
    </div>
  )
}
