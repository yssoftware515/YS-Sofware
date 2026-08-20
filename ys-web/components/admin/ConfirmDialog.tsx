'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', loading = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
      const timer = setTimeout(() => cancelRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      if (e.key === 'Tab') {
        const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  useEffect(() => {
    if (!open && triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onCancel}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '24rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '1rem', border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-modal)',
          padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              backgroundColor: variant === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <AlertTriangle size={18} style={{ color: variant === 'danger' ? 'var(--color-error)' : 'var(--color-warning)' }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 id="confirm-title" className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-foreground)', marginBottom: '0.375rem' }}>
              {title}
            </h3>
            <p id="confirm-message" style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', lineHeight: 1.6 }}>
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{ padding: '0.375rem', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)', minWidth: 28, minHeight: 28 }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button ref={cancelRef} variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
