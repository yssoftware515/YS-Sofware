'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const content = {
  en: {
    title: 'Something went wrong',
    body: 'An unexpected error occurred. Please try again.',
    retry: 'Try again',
  },
  ar: {
    title: 'حدث خطأ ما',
    body: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
    retry: 'حاول مرة أخرى',
  },
}

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  // error.tsx boundaries don't receive route params, but they do run as
  // Client Components with full router access — the URL's locale segment
  // is the reliable signal here.
  const pathname = usePathname()
  const locale = pathname?.startsWith('/ar') ? 'ar' : 'en'
  const t = content[locale]

  return (
    <div style={{ minHeight: '80dvh', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '28rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-accent)' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="font-display font-semibold" style={{ fontSize: '1.25rem', color: 'var(--color-foreground)', margin: 0 }}>
          {t.title}
        </h1>
        <p style={{ color: 'var(--color-foreground-muted)', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>
          {t.body}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 1.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            backgroundColor: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: '0.875rem',
            marginTop: '0.5rem',
          }}
        >
          {t.retry}
        </button>
      </div>
    </div>
  )
}
