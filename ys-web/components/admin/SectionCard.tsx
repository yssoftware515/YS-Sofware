interface SectionCardProps {
  title?: React.ReactNode
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function SectionCard({ title, description, children, actions, className }: SectionCardProps) {
  return (
    <div
      className={className}
      style={{
        padding: '1.5rem', borderRadius: '0.875rem',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}
    >
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            {title && (
              <h3 className="font-display font-semibold" style={{ fontSize: '0.9375rem', color: 'var(--color-foreground)' }}>
                {title}
              </h3>
            )}
            {description && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.25rem' }}>
                {description}
              </p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}
