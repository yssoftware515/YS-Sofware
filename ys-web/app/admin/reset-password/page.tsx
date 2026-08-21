'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ensureXsrfToken, readXsrfToken } from '@/lib/csrf'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TOKEN_RE = /^[0-9a-f]{64}$/i

function checkPasswordComplexity(pw: string): string[] {
  const errors: string[] = []
  if (pw.length < 12) errors.push('at least 12 characters')
  if (!/[A-Z]/.test(pw)) errors.push('an uppercase letter')
  if (!/[a-z]/.test(pw)) errors.push('a lowercase letter')
  if (!/[0-9]/.test(pw)) errors.push('a number')
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('a symbol')
  return errors
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()

  const rawToken = searchParams.get('token')
  const rawEmail = searchParams.get('email')
  const paramsValid =
    rawToken !== null &&
    rawEmail !== null &&
    TOKEN_RE.test(rawToken) &&
    EMAIL_RE.test(rawEmail)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [submitted, setSubmitted] = useState(false)

  // Redirect if params are invalid
  if (!paramsValid) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
        <div className="relative w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white font-bold text-lg mb-4">
              YS
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg text-center space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/admin/forgot-password"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
            >
              <ArrowLeft size={14} />
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    // Client-side validation
    const errors: Record<string, string[]> = {}

    if (!password) {
      errors.password = ['A new password is required.']
    } else {
      const complexity = checkPasswordComplexity(password)
      if (complexity.length > 0) {
        errors.password = [`Password must contain ${complexity.join(', ')}.`]
      }
    }

    if (password !== confirm) {
      errors.password_confirmation = ['Passwords do not match.']
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      await ensureXsrfToken(API)
      const xsrf = readXsrfToken()

      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
        },
        body: JSON.stringify({ email: rawEmail, token: rawToken, password }),
        credentials: 'include',
      })

      const body = await res.json()

      if (res.status === 403 && body.code === 'INVALID_RESET_TOKEN') {
        setError('This password reset link is invalid or has expired.')
        return
      }

      if (res.status === 422 && body.errors) {
        const apiErrors: Record<string, string[]> = {}
        for (const [field, messages] of Object.entries(body.errors)) {
          apiErrors[field] = messages as string[]
        }
        setFieldErrors(apiErrors)
        return
      }

      if (!res.ok || !body.success) {
        setError('Something went wrong. Please try again.')
        return
      }

      // Clear sensitive data from memory
      setPassword('')
      setConfirm('')
      setSubmitted(true)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
        <div className="relative w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white font-bold text-lg mb-4">
              YS
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mx-auto">
              <CheckCircle2 size={24} className="text-success" />
            </div>
            <p className="text-sm text-foreground">
              Password has been reset. Please log in again.
            </p>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
            >
              <ArrowLeft size={14} />
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, var(--color-accent-subtle), transparent)' }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white font-bold text-lg mb-4">
            YS
          </div>
          <h1 className="font-display font-semibold text-xl text-foreground">
            Set New Password
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Choose a strong password for your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div
                role="alert"
                className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </div>
            )}

            {/* New Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="label">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pe-11"
                  placeholder="••••••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-foreground-muted hover:text-foreground"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {fieldErrors.password[0]}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="password_confirmation" className="label">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="password_confirmation"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="input pe-11"
                  placeholder="••••••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-foreground-muted hover:text-foreground"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password_confirmation && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {fieldErrors.password_confirmation[0]}
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              <Lock size={16} aria-hidden="true" />
              Reset Password
            </Button>

            <p className="text-center">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-foreground-muted mt-6">
          Protected area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}
