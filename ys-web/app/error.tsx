'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
      <p style={{ color: 'var(--color-foreground-muted)', maxWidth: 400, margin: 0 }}>
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.625rem 1.5rem', borderRadius: 8, border: 'none', cursor: 'pointer',
          backgroundColor: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: '0.875rem',
        }}
      >
        Try again
      </button>
    </div>
  )
}
