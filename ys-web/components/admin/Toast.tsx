'use client'

import { useEffect, useCallback, useState, createContext, useContext } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'
interface Toast { id: string; type: ToastType; message: string }

const ToastContext = createContext<{ show: (type: ToastType, message: string) => void } | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((type: ToastType, message: string) => {
    const id = (++toastId).toString()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        role="status"
        style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '0.625rem',
        }}
      >
        {toasts.map(toast => (
          <div key={toast.id} role="alert" style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.875rem 1.125rem', borderRadius: 10, minWidth: 280, maxWidth: 360,
            backgroundColor: 'var(--color-surface)', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            boxShadow: 'var(--shadow-toast)',
          }}>
            {toast.type === 'success'
              ? <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} aria-hidden="true" />
              : <XCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} aria-hidden="true" />}
            <span style={{ fontSize: '0.875rem', color: 'var(--color-foreground)', flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)', padding: '0.375rem', minWidth: 28, minHeight: 28 }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
