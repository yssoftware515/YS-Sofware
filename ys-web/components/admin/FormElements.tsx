'use client'

import { useId } from 'react'

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
  inputId?: string
}

export function Field({ label, required, error, hint, children, inputId }: FieldProps) {
  const autoId = useId()
  const fieldId = inputId ?? autoId
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <label htmlFor={fieldId} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-foreground-subtle)' }}>
        {label}
        {required && <span aria-hidden="true" style={{ color: 'var(--color-error)', marginLeft: '0.25rem' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{error}</p>
      )}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  fieldId?: string
}

export function Input({ error, style, fieldId, ...props }: InputProps) {
  return (
    <input
      id={fieldId}
      aria-invalid={error ? 'true' : undefined}
      aria-required={props.required ? 'true' : undefined}
      {...props}
      style={{
        width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8,
        border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
        backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)',
        fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
        minHeight: 42, transition: 'border-color 150ms',
        ...style,
      }}
    />
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  fieldId?: string
}

export function Textarea({ error, style, fieldId, ...props }: TextareaProps) {
  return (
    <textarea
      id={fieldId}
      aria-invalid={error ? 'true' : undefined}
      aria-required={props.required ? 'true' : undefined}
      {...props}
      style={{
        width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8,
        border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
        backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)',
        fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
        resize: 'vertical', minHeight: 100, fontFamily: 'inherit',
        ...style,
      }}
    />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  fieldId?: string
}

export function Select({ error, style, children, fieldId, ...props }: SelectProps) {
  return (
    <select
      id={fieldId}
      aria-invalid={error ? 'true' : undefined}
      aria-required={props.required ? 'true' : undefined}
      {...props}
      style={{
        width: '100%', padding: '0.625rem 0.875rem', borderRadius: 8,
        border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
        backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)',
        fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
        minHeight: 42, cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </select>
  )
}

export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-foreground)' }}>
      <input type="checkbox" {...props} style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }} />
      {label}
    </label>
  )
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
      <h3 className="font-display font-semibold" style={{ fontSize: '0.9375rem', color: 'var(--color-foreground)', marginBottom: description ? '0.25rem' : '1rem' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginBottom: '1rem' }}>{description}</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {children}
      </div>
    </div>
  )
}
