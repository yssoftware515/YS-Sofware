export function EmptyState({ message, locale }: { message: string; locale?: string }) {
  return (
    <div style={{
      textAlign: 'center', padding: '4rem 2rem',
      borderRadius: '1rem', border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)', color: 'var(--color-foreground-muted)',
      fontSize: '0.9375rem', lineHeight: 1.6,
    }}>
      {message}
    </div>
  )
}
