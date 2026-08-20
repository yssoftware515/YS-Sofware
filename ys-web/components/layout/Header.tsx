'use client'

import { useState, useEffect, useRef, useCallback, useReducer } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, Moon, Sun, Globe, Search, ArrowRight, Command, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import type { Menu as CmsMenu, SearchResult } from '@/types'
import { api } from '@/lib/api/client'
import { useThemeStore } from '@/lib/stores/theme'
import { useHydrated } from '@/lib/hooks/useHydrated'
import {
  searchReducer,
  initialSearchState,
  shouldFetchQuery,
  SEARCH_DEBOUNCE_MS,
} from '@/lib/search/state'

const navContent = {
  en: {
    products: 'Products',
    services: 'Services',
    docs: 'Docs',
    updates: 'Updates',
    about: 'About',
    faq: 'FAQ',
    get_started: 'Get Started',
    search_placeholder: 'Search products, docs, careers...',
    search_navigate: 'to navigate',
    search_select: 'to select',
    search_close: 'to close',
    lang: 'AR',
  },
  ar: {
    products: 'المنتجات',
    services: 'الخدمات',
    docs: 'التوثيق',
    updates: 'المستجدات',
    about: 'عن الشركة',
    faq: 'الأسئلة الشائعة',
    get_started: 'ابدأ الآن',
    search_placeholder: 'ابحث في المنتجات، التوثيق، الوظائف...',
    search_navigate: 'للتنقل',
    search_select: 'للاختيار',
    search_close: 'للإغلاق',
    lang: 'EN',
  },
} as const

interface HeaderProps {
  locale: string
  menu?: CmsMenu
}

interface NavLink {
  href: string
  label: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-CONTAINED SEARCH MODAL — fully controlled, no external dependencies
// Starts CLOSED. Opens on click or Ctrl+K. Closes on Escape, overlay click, or X.
// Live search: debounced (SEARCH_DEBOUNCE_MS) fetch against /public/search,
// with idle → loading → results/empty/error phases and ↑/↓/Enter navigation.
// ═══════════════════════════════════════════════════════════════════════════════
function SearchModal({
  open,
  onClose,
  locale,
}: {
  open: boolean
  onClose: () => void
  locale: string
}) {
  const isAr = locale === 'ar'
  const t = navContent[isAr ? 'ar' : 'en']
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, dispatch] = useReducer(
    searchReducer<SearchResult>,
    undefined,
    initialSearchState<SearchResult>,
  )
  const query = state.query
  const lastFetchedRef = useRef('')
  const debounceRef = useRef<number | null>(null)
  const seqRef = useRef(0)

  // Focus input when opened and reset stale state
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      lastFetchedRef.current = ''
      seqRef.current += 1
      dispatch({ type: 'RESET' })
      return () => clearTimeout(timer)
    }
  }, [open])

  // Debounced live search — no empty-query or duplicate requests; stale
  // responses are dropped via a request sequence guard (the client's
  // request() has no signal plumbing, so this is the cancellation policy).
  useEffect(() => {
    if (!open) return
    if (!shouldFetchQuery(lastFetchedRef.current, query)) {
      if (query.trim().length < 2 && state.phase !== 'idle') {
        lastFetchedRef.current = ''
        dispatch({ type: 'RESET' })
      }
      return
    }
    const q = query.trim()
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      const seq = ++seqRef.current
      lastFetchedRef.current = q
      dispatch({ type: 'FETCH_STARTED' })
      try {
        const res = await api.search(q, locale)
        if (seq !== seqRef.current) return
        dispatch({ type: 'RESULTS_RECEIVED', results: res.results })
      } catch {
        if (seq !== seqRef.current) return
        dispatch({ type: 'FETCH_FAILED', error: isAr ? 'حدث خطأ أثناء البحث.' : 'Search failed. Try again.' })
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    }
  }, [query, open, locale, isAr, state.phase])

  // Close on Escape, navigate with arrows and Enter
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        dispatch({ type: 'ARROW', direction: 1 })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        dispatch({ type: 'ARROW', direction: -1 })
      } else if (e.key === 'Enter') {
        const result = state.results[state.activeIndex]
        if (result) {
          e.preventDefault()
          router.push(result.url)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, router, state.results, state.activeIndex])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const goTo = (result: SearchResult) => {
    router.push(result.url)
    onClose()
  }

  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      style={{ backgroundColor: 'rgba(1, 5, 15, 0.75)', backdropFilter: 'blur(8px)' }}
      onClick={handleOverlayClick}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-modal-xl)',
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Search size={18} style={{ color: 'var(--color-foreground-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => dispatch({ type: 'QUERY_CHANGED', query: e.target.value })}
            placeholder={t.search_placeholder}
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--color-foreground)' }}
            dir={isAr ? 'rtl' : 'ltr'}
            role="combobox"
            aria-label={t.search_placeholder}
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-expanded={state.phase === 'results'}
          />
          {state.phase === 'loading' && (
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-foreground-muted)' }} />
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
            style={{ color: 'var(--color-foreground-muted)' }}
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        {/* Keyboard hints */}
        <div
          className="flex items-center gap-4 px-5 py-2.5 text-[11px]"
          style={{ color: 'var(--color-foreground-muted)', borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>↑</kbd>
            <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>↓</kbd>
            <span className="ms-1">{t.search_navigate}</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>↵</kbd>
            <span className="ms-1">{t.search_select}</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)' }}>esc</kbd>
            <span className="ms-1">{t.search_close}</span>
          </span>
        </div>

        {/* Results / states */}
        <div id="search-results" className="max-h-[45vh] overflow-y-auto">
          {state.phase === 'idle' && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
                {isAr ? 'ابدأ الكتابة للبحث...' : 'Start typing to search...'}
              </p>
            </div>
          )}

          {state.phase === 'loading' && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
                {isAr ? 'جارٍ البحث...' : 'Searching...'}
              </p>
            </div>
          )}

          {state.phase === 'empty' && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-foreground-muted)' }}>
                {isAr ? `لا توجد نتائج لـ "${query.trim()}"` : `No results for "${query.trim()}"`}
              </p>
            </div>
          )}

          {state.phase === 'error' && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-error)' }}>{state.error}</p>
            </div>
          )}

          {state.phase === 'results' && (
            <ul role="listbox" aria-label="Search results">
              {state.results.map((result, i) => (
                <li key={`${result.type}-${result.id}`} role="option" aria-selected={i === state.activeIndex}>
                  <button
                    type="button"
                    onMouseEnter={() => { if (state.activeIndex !== i) dispatch({ type: 'SET_ACTIVE', index: i }) }}
                    onClick={() => goTo(result)}
                    className="w-full text-left px-5 py-3 flex items-start gap-3 transition-colors"
                    style={{
                      backgroundColor: i === state.activeIndex ? 'var(--color-surface)' : 'transparent',
                    }}
                  >
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--color-background-subtle)', color: 'var(--color-foreground-muted)' }}
                    >
                      {result.type}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate" style={{ color: 'var(--color-foreground)' }}>
                        {result.title}
                      </span>
                      {result.excerpt && (
                        <span className="block text-xs truncate mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>
                          {result.excerpt}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER — matches reference design exactly
// ═══════════════════════════════════════════════════════════════════════════════
export function Header({ locale, menu }: HeaderProps) {
  const isAr = locale === 'ar'
  const t = navContent[isAr ? 'ar' : 'en']
  const pathname = usePathname()
  const hydrated = useHydrated()
  const { theme, setTheme, resolvedTheme } = useThemeStore()
  const isDark = hydrated ? resolvedTheme() === 'dark' : false
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  // Scroll detection for glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change — derived during render (the
// documented pattern for adjusting state when props/route change).
const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMobileOpen(false)
  }

  // Keyboard shortcut: Ctrl+K / Cmd+K for search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const mainNav: NavLink[] = [
    { href: `/${locale}/products`, label: t.products },
    { href: `/${locale}/services`, label: t.services },
    { href: `/${locale}/docs`, label: t.docs },
    { href: `/${locale}/updates`, label: t.updates },
    { href: `/${locale}/about`, label: t.about },
    { href: `/${locale}/faq`, label: t.faq },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled ? 'header-glass scrolled' : 'header-glass'
        )}
        style={{ height: '3rem' }}
      >
        <div className="container-site h-full flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg">
            <Image
              src="/branding/logo/logo.svg"
              alt="YS Systems"
              width={32}
              height={32}
              className="shrink-0"
              priority
            />
            <span className="font-display font-semibold text-base tracking-tight hidden sm:block" style={{ color: 'var(--color-foreground)' }}>
              YS Systems
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive(item.href)
                    ? 'text-[var(--color-foreground)]'
                    : 'text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150"
              style={{
                color: 'var(--color-foreground-muted)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
              }}
              aria-label="Open search"
            >
              <Search size={14} />
              <span className="text-xs">{isAr ? 'بحث' : 'Search'}</span>
              <kbd
                className="hidden lg:inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
                style={{
                  backgroundColor: 'var(--color-background-subtle)',
                  color: 'var(--color-foreground-muted)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                Ctrl K
              </kbd>
            </button>

            {/* Language toggle */}
            <Link
              href={isAr ? pathname.replace('/ar', '/en') : pathname.replace('/en', '/ar')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150"
              style={{ color: 'var(--color-foreground-muted)' }}
              aria-label="Toggle language"
            >
              <Globe size={15} />
              <span className="text-xs font-semibold">{t.lang}</span>
            </Link>

            {/* Theme toggle */}
            {hydrated && (
              <button
                type="button"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150"
                style={{ color: 'var(--color-foreground-muted)' }}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}

            {/* CTA Button */}
            <Link
              href={`/${locale}/contact`}
              className={cn(
                'hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                'btn-hero-primary'
              )}
            >
              {t.get_started}
              <ArrowRight size={14} className={cn(isAr && 'rotate-180')} />
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ color: 'var(--color-foreground)' }}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: 'rgba(1,5,15,0.85)', backdropFilter: 'blur(12px)' }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-14 inset-x-0 p-6 flex flex-col gap-1"
              style={{ backgroundColor: 'var(--color-background)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-3 rounded-xl text-base font-medium transition-colors',
                    isActive(item.href)
                      ? 'text-[var(--color-foreground)]'
                      : 'text-[var(--color-foreground-muted)]'
                  )}
                  style={{
                    backgroundColor: isActive(item.href) ? 'var(--color-surface)' : 'transparent',
                  }}
                >
                  {item.label}
                </Link>
              ))}

              <div className="mt-4 pt-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); setSearchOpen(true) }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium"
                  style={{ color: 'var(--color-foreground-muted)' }}
                >
                  <Search size={18} />
                  {isAr ? 'بحث' : 'Search'}
                </button>
                <Link
                  href={isAr ? pathname.replace('/ar', '/en') : pathname.replace('/en', '/ar')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium"
                  style={{ color: 'var(--color-foreground-muted)' }}
                >
                  <Globe size={18} />
                  {t.lang}
                </Link>
                <Link
                  href={`/${locale}/contact`}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-semibold btn-hero-primary"
                >
                  {t.get_started}
                  <ArrowRight size={16} className={cn(isAr && 'rotate-180')} />
                </Link>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal — self-contained, fully controlled */}
      <AnimatePresence>
        {searchOpen && (
          <SearchModal
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            locale={locale}
          />
        )}
      </AnimatePresence>
    </>
  )
}
