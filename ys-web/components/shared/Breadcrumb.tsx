import Link from 'next/link'

/**
 * Breadcrumb — visible navigation trail for deep pages (product detail,
 * docs articles). Deliberately separate from the `BreadcrumbList` JSON-LD
 * already generated in `app/[locale]/(public)/layout.tsx` for search
 * engines: that one is derived generically from the URL path, which
 * produces a slug-guess label for dynamic routes (e.g. "Ys Matrix"
 * instead of "YS-Matrix"). This component takes explicit, real labels
 * from the page's own data instead, so a page opts in only where a
 * breadcrumb genuinely helps (per-page, not injected globally).
 *
 * A "Home" crumb is prepended automatically. The last item is rendered as
 * the current page (no link, `aria-current="page"`).
 */

interface BreadcrumbItem {
  label: string
  /** Locale-prefixed path, e.g. `/${locale}/products`. Omit for the current page. */
  href?: string
}

interface BreadcrumbProps {
  locale: string
  items: BreadcrumbItem[]
}

const homeLabel: Record<string, string> = { en: 'Home', ar: 'الرئيسية' }
const navLabel: Record<string, string> = { en: 'Breadcrumb', ar: 'مسار التصفح' }

export function Breadcrumb({ locale, items }: BreadcrumbProps) {
  const trail: BreadcrumbItem[] = [
    { label: homeLabel[locale] ?? homeLabel.en, href: `/${locale}` },
    ...items,
  ]

  return (
    <nav aria-label={navLabel[locale] ?? navLabel.en}>
      <ol style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem',
        margin: 0, padding: 0, listStyle: 'none',
        fontSize: '0.8125rem', color: 'var(--color-foreground-muted)',
      }}>
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {i > 0 && <span aria-hidden="true">/</span>}
              {isLast || !crumb.href ? (
                <span aria-current={isLast ? 'page' : undefined} style={{ color: 'var(--color-foreground)' }}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
