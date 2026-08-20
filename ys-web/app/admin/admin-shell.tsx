'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/admin/Toast'
import { AuthProvider, useAuth } from '@/components/admin/PermissionGate'
import { PlatformProvider, usePlatform } from '@/lib/platform/PlatformProvider'
import { LogOut, Menu, X, ChevronRight } from 'lucide-react'
import type { NavGroup } from '@/lib/platform/registries/NavigationRegistry'
import { ensureXsrfToken, readXsrfToken } from '@/lib/csrf'

const CommandPalette = lazy(() => import('@/components/admin/CommandPalette').then(m => ({ default: m.CommandPalette })))

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

function SidebarNav({ isOpen, onClose, locale }: { isOpen: boolean; onClose: () => void; locale: string }) {
  const { hasPermission } = useAuth()
  const { kernel, loaded } = usePlatform()
  const pathname = usePathname()
  const isRtl = locale === 'ar'

  const groups: NavGroup[] = loaded && kernel
    ? kernel.getRegistry('navigation').getFilteredGroups(hasPermission)
    : []

  return (
    <>
      <aside style={{
        position: 'fixed', top: 0, [isRtl ? 'right' : 'left']: 0, bottom: 0, zIndex: 40,
        width: 240, backgroundColor: 'var(--color-surface)',
        borderInlineEnd: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : isRtl ? 'translateX(100%)' : 'translateX(-100%)',
        transition: 'transform 300ms',
        direction: isRtl ? 'rtl' : 'ltr',
      }} className="lg:translate-x-0 lg:transform-none">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={`/${locale}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>YS</div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-foreground)' }}>{isRtl ? 'لوحة التحكم' : 'Admin Panel'}</span>
          </Link>
          <button onClick={onClose} aria-label="Close sidebar" className="lg:hidden" style={{ padding: '0.5rem', minWidth: 44, minHeight: 44, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)' }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Sidebar navigation" style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
          {!loaded && (
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>Loading...</div>
          )}
          {groups.map(group => (
            <div key={group.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{
                padding: '0.5rem 0.875rem 0.25rem',
                fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase',
                color: 'var(--color-foreground-muted)',
                letterSpacing: '0.05em',
              }}>
                {isRtl ? group.labelAr : group.labelEn}
              </div>
              {group.items.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href} onClick={onClose} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0.875rem', borderRadius: 8, marginBottom: '0.125rem',
                    fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
                    backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent',
                    transition: 'all 150ms',
                  }}>
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    {isRtl ? item.labelAr : item.labelEn}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
          <LogoutButton locale={locale} />
        </div>
      </aside>

      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 30, backgroundColor: 'rgba(0,0,0,0.5)' }}
          className="lg:hidden"
        />
      )}
    </>
  )
}

function LogoutButton({ locale }: { locale: string }) {
  const router = useRouter()
  const isRtl = locale === 'ar'

  const handleLogout = async () => {
    try {
      // G-01: stateful POSTs are CSRF-gated — echo the XSRF cookie.
      await ensureXsrfToken(API)
      const xsrf = readXsrfToken()
      const res = await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
        },
      })
      if (!res.ok) {
        // NOTE: `ys_admin_token` is set HttpOnly by the API (correctly —
        // don't change that), which means client JS can never read OR
        // clear it. The old code here tried `document.cookie = 'ys_admin_
        // token=...'` to force a logout on failure; that line silently did
        // nothing — the browser ignores JS writes to an HttpOnly cookie
        // name. If the API call fails, the session is genuinely still
        // valid server-side no matter what runs here, so we surface that
        // honestly instead of redirecting to /login as if it succeeded.
        window.alert(
          isRtl
            ? 'تعذر تسجيل الخروج. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.'
            : 'Logout failed. Check your connection and try again.'
        )
        return
      }
    } catch {
      window.alert(
        isRtl
          ? 'تعذر تسجيل الخروج. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.'
          : 'Logout failed. Check your connection and try again.'
      )
      return
    }
    router.push('/admin/login')
  }

  return (
    <button onClick={handleLogout} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
      padding: '0.625rem 0.875rem', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontSize: '0.875rem', fontWeight: 500,
      color: 'var(--color-foreground-muted)', backgroundColor: 'transparent',
      transition: 'all 150ms',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-error)' }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-foreground-muted)' }}
    >
      <LogOut size={16} />
      {isRtl ? 'تسجيل الخروج' : 'Logout'}
    </button>
  )
}

function Breadcrumb({ locale }: { locale: string }) {
  const pathname = usePathname()
  const { kernel, loaded } = usePlatform()
  const isRtl = locale === 'ar'

  let label: string
  if (loaded && kernel) {
    const item = kernel.getRegistry('navigation').findItem(pathname)
    label = item ? (isRtl ? item.labelAr : item.labelEn) : ''
  } else {
    label = ''
  }

  return (
    <nav aria-label="Breadcrumb">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
        <span aria-current={!label ? 'page' : undefined}>{isRtl ? 'الإدارة' : 'Admin'}</span>
        {label && (
          <>
            <ChevronRight size={14} style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
            <span aria-current="page" style={{ color: 'var(--color-foreground)', fontWeight: 500 }}>{label}</span>
          </>
        )}
      </div>
    </nav>
  )
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const locale = 'en' as string

  // Created once per component instance (not per render) via useState's
  // lazy initializer — the standard TanStack Query + Next.js App Router
  // pattern. Creating a fresh QueryClient on every render would wipe the
  // cache constantly and defeat the entire point of using it.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Admin data changes from other admins too — 30s keeps the UI
        // reasonably fresh without re-fetching on every focus/click.
        staleTime: 30_000,
        retry: 1,
      },
    },
  }))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
    <PlatformProvider>
    {commandOpen && (
      <Suspense fallback={null}>
        <CommandPalette onClose={() => setCommandOpen(false)} />
      </Suspense>
    )}
    <AuthProvider>
    <ToastProvider>
    <a href="#admin-main" className="skip-link">
      Skip to main content
    </a>
    <div style={{ display: 'flex', minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} locale={locale} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="lg:ml-60">
        <header style={{ position: 'sticky', top: 0, zIndex: 20, height: 56, borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: '1rem' }}>
          <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar navigation" className="lg:hidden" style={{ padding: '0.375rem', minWidth: 44, minHeight: 44, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-foreground-muted)' }}>
            <Menu size={20} aria-hidden="true" />
          </button>
          <Breadcrumb locale={locale} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href={`/${locale}`} style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', textDecoration: 'none', padding: '0.375rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              {locale === 'ar' ? '→ عرض الموقع' : '← View Site'}
            </Link>
          </div>
        </header>

        <main id="admin-main" style={{ flex: 1, padding: '2rem 1.5rem', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
    </AuthProvider>
    </PlatformProvider>
    </QueryClientProvider>
  )
}