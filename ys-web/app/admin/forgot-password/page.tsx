'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ensureXsrfToken, readXsrfToken } from '@/lib/csrf'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      await ensureXsrfToken(API)
      const xsrf = readXsrfToken()

      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
        },
        body: JSON.stringify({ email: trimmed.toLowerCase() }),
        credentials: 'include',
      })

      const body = await res.json()

      if (res.status === 429) {
        setError('Too many requests. Please try again later.')
        return
      }

      if (!res.ok || !body.success) {
        setError('Something went wrong. Please try again.')
        return
      }

      // Anti-enumeration: identical message whether email exists or not.
      setSubmitted(true)
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
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
            Reset Password
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Enter your email to receive a reset link
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mx-auto">
                <Mail size={24} className="text-success" />
              </div>
              <p className="text-sm text-foreground">
                If the email exists, a reset link has been sent.
              </p>
              <p className="text-xs text-foreground-muted">
                Check your inbox and follow the link to set a new password.
              </p>
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div
                  role="alert"
                  className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="admin@ys-systems.com"
                  disabled={loading}
                />
              </div>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                <Mail size={16} aria-hidden="true" />
                Send Reset Link
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
          )}
        </div>

        <p className="text-center text-xs text-foreground-muted mt-6">
          Protected area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}
