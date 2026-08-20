'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import TurnstileWidget, { type TurnstileHandle } from '@/components/TurnstileWidget'
import { cn } from '@/lib/utils/cn'
import { ensureXsrfToken, readXsrfToken } from '@/lib/csrf'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
// CAPTCHA is enabled only when a site key is configured (GAP-01).
const TURNSTILE_ENABLED = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

export default function AdminLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const attempts = useRef(0)
  const lockoutUntil = useRef(0)
  const turnstileRef = useRef<TurnstileHandle>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const now = Date.now()
    if (now < lockoutUntil.current) {
      const remaining = Math.ceil((lockoutUntil.current - now) / 1000)
      setError(`Too many attempts. Try again in ${remaining} seconds.`)
      return
    }

    setLoading(true)

    try {
      // GAP-01: obtain an invisible Turnstile token before submitting.
      // When CAPTCHA is disabled (no site key) this resolves to '' and
      // the login is sent exactly as before.
      const turnstileToken = TURNSTILE_ENABLED
        ? (await turnstileRef.current?.getToken()) ?? ''
        : ''

      if (TURNSTILE_ENABLED && !turnstileToken) {
        turnstileRef.current?.reset()
        setError('CAPTCHA verification failed. Please try again.')
        return
      }

      // G-01: the API's stateful routes are CSRF-gated — prime the
      // XSRF-TOKEN cookie and echo it on this POST (see lib/csrf.ts).
      await ensureXsrfToken(API)
      const xsrf = readXsrfToken()

      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
        },
        body: JSON.stringify({ email, password, remember, turnstile_token: turnstileToken }),
        credentials: 'include',
      })

      const body = await res.json()

      if (!res.ok || !body.success) {
        attempts.current++
        if (attempts.current >= 5) {
          lockoutUntil.current = Date.now() + 30000
          attempts.current = 0
          setError('Too many attempts. Please wait 30 seconds.')
        } else {
          setError('Invalid email or password.')
        }
        return
      }

      attempts.current = 0
      turnstileRef.current?.reset()
      router.push('/admin/dashboard')
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      {/* Background */}
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
            Admin Portal
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            YS Systems & Software
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </div>
            )}

            {/* Email */}
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
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pe-11"
                  placeholder="••••••••"
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
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2.5">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <label htmlFor="remember" className="text-sm text-foreground-muted cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              <Lock size={16} aria-hidden="true" />
              Sign In
            </Button>

            {/* GAP-01: invisible Turnstile challenge (no-op when disabled) */}
            <TurnstileWidget ref={turnstileRef} />
          </form>
        </div>

        <p className="text-center text-xs text-foreground-muted mt-6">
          Protected area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}
