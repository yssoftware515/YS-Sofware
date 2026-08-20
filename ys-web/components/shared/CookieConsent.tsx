'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useHydrated } from '@/lib/hooks/useHydrated'

const STORAGE_KEY = 'ys-cookie-consent'
const COOKIE_CATEGORIES = ['essential', 'analytics'] as const
type CookieCategory = typeof COOKIE_CATEGORIES[number]

interface SavedConsent {
  version: number
  accepted: boolean
  categories: CookieCategory[]
  timestamp: number
}

const CONSENT_VERSION = 1

function loadConsent(): SavedConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedConsent
    if (parsed.version !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

function saveConsent(accepted: boolean, categories: CookieCategory[]) {
  const consent: SavedConsent = { version: CONSENT_VERSION, accepted, categories, timestamp: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  window.dispatchEvent(new CustomEvent('cookie-consent', { detail: consent }))
}

export function getConsent(): SavedConsent | null {
  return loadConsent()
}

export function hasConsentFor(category: CookieCategory): boolean {
  const consent = loadConsent()
  if (!consent) return false
  if (category === 'essential') return true
  return consent.accepted && consent.categories.includes(category)
}

const content: Record<string, { title: string; message: string; accept: string; decline: string; customize: string; essential: string; analytics: string; save: string; learn_more: string }> = {
  en: {
    title: 'Cookie Consent',
    message: 'We use essential cookies to make our site work and analytics cookies to help us improve it.',
    accept: 'Accept All',
    decline: 'Only Essential',
    customize: 'Customize',
    essential: 'Essential (required)',
    analytics: 'Analytics',
    save: 'Save Preferences',
    learn_more: 'Learn more',
  },
  ar: {
    title: 'الموافقة على ملفات تعريف الارتباط',
    message: 'نستخدم ملفات تعريف الارتباط الأساسية لتشغيل موقعنا وملفات تحليلية لمساعدتنا على تحسينه.',
    accept: 'قبول الكل',
    decline: 'الأساسية فقط',
    customize: 'تخصيص',
    essential: 'أساسية (مطلوبة)',
    analytics: 'تحليلية',
    save: 'حفظ التفضيلات',
    learn_more: 'معرفة المزيد',
  },
}

export function CookieConsent({ locale }: { locale: string }) {
  const t = content[locale] ?? content.en
  const mounted = useHydrated()
  const [show, setShow] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    const existing = loadConsent()
    if (!existing) {
      const timer = setTimeout(() => setShow(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = () => {
    saveConsent(true, ['essential', 'analytics'])
    setShow(false)
  }

  const handleDecline = () => {
    saveConsent(false, ['essential'])
    setShow(false)
  }

  const handleSave = () => {
    const categories: CookieCategory[] = ['essential']
    if (analytics) categories.push('analytics')
    saveConsent(categories.length > 1, categories)
    setShow(false)
  }

  if (!mounted || !show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, insetInline: 0, zIndex: 9999,
      padding: '1rem', pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: 640, marginInline: 'auto',
        padding: '1.25rem', borderRadius: '1rem',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        boxShadow: 'var(--shadow-float)',
        pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', lineHeight: 1.6, margin: 0 }}>
          {t.message}{' '}
          <Link href={`/${locale}/cookie-policy`} style={{ color: 'var(--color-accent)', textDecoration: 'underline', fontSize: '0.8125rem' }}>
            {t.learn_more}
          </Link>
        </p>

        {customizing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--color-foreground)', cursor: 'pointer' }}>
              <input type="checkbox" checked disabled style={{ accentColor: 'var(--color-accent)' }} />
              <span>{t.essential}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--color-foreground)', cursor: 'pointer' }}>
              <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} style={{ accentColor: 'var(--color-accent)' }} />
              <span>{t.analytics}</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button onClick={handleSave} style={{
                flex: 1, padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                backgroundColor: 'var(--color-accent)', color: '#fff',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              }}>{t.save}</button>
              <button onClick={() => setCustomizing(false)} style={{
                padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--color-border)',
                backgroundColor: 'transparent', color: 'var(--color-foreground-muted)',
                fontSize: '0.8125rem', cursor: 'pointer',
              }}>{locale === 'ar' ? 'رجوع' : 'Back'}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={handleAcceptAll} style={{
              flex: 1, minWidth: 120, padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
              backgroundColor: 'var(--color-accent)', color: '#fff',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
            }}>{t.accept}</button>
            <button onClick={handleDecline} style={{
              flex: 1, minWidth: 120, padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--color-border)',
              backgroundColor: 'transparent', color: 'var(--color-foreground-muted)',
              fontSize: '0.8125rem', cursor: 'pointer',
            }}>{t.decline}</button>
            <button onClick={() => setCustomizing(true)} style={{
              padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--color-border)',
              backgroundColor: 'transparent', color: 'var(--color-foreground-muted)',
              fontSize: '0.8125rem', cursor: 'pointer',
            }}>{t.customize}</button>
          </div>
        )}
      </div>
    </div>
  )
}
