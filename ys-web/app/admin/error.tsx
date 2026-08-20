'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40dvh', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Something went wrong</h2>
      <p style={{ color: 'var(--color-foreground-muted)', fontSize: '0.875rem', maxWidth: 360, margin: 0 }}>
        An unexpected error occurred in this section. Please try reloading.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.5rem 1.25rem', borderRadius: 6, border: 'none', cursor: 'pointer',
          backgroundColor: 'var(--color-accent)', color: '#fff', fontWeight: 500, fontSize: '0.8125rem',
        }}
      >
        Try again
      </button>
    </div>
  )
}
