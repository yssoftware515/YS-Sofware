import type { ReactNode } from 'react'

/**
 * PageHero — the internal-page header pattern (eyebrow + title + description),
 * previously hand-duplicated with `style={{ paddingTop: '7rem', ... }}` in
 * ~20 route files. This does NOT touch the homepage Hero (`HeroSection.tsx`)
 * — that's a separate, deliberately different composition and is frozen.
 *
 * Deliberately narrow: covers the single-column header case shared by most
 * internal pages. Pages with a genuinely different intro layout (e.g. a
 * two-column hero with a side card) are left as bespoke sections rather
 * than being forced through this component — consistency shouldn't mean
 * every page looks identical.
 */

interface PageHeroProps {
  eyebrow: string
  title: string
  description?: string
  /** Inner container max-width, e.g. '48rem'. Omit for full container-site width. */
  maxWidth?: string
  /** Optional breadcrumb trail rendered above the eyebrow. */
  breadcrumb?: ReactNode
  /** Optional actions (buttons/links) rendered below the description. */
  actions?: ReactNode
  /** Optional id placed on the <h1>, so a caller can reference it via aria-labelledby. */
  headingId?: string
}

export function PageHero({ eyebrow, title, description, maxWidth, breadcrumb, actions, headingId }: PageHeroProps) {
  return (
    <section
      style={{ paddingTop: '7rem', paddingBottom: '5rem', borderBottom: '1px solid var(--color-border)' }}
      aria-labelledby={headingId}
    >
      <div className="container-site" style={maxWidth ? { maxWidth } : undefined}>
        {breadcrumb && <div style={{ marginBottom: '1.5rem' }}>{breadcrumb}</div>}
        <p style={{
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem',
        }}>
          {eyebrow}
        </p>
        <h1
          id={headingId}
          className="font-display font-semibold tracking-tight text-fluid-2xl"
          style={{ color: 'var(--color-foreground)', marginBottom: description ? '1rem' : 0 }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-fluid-base" style={{ color: 'var(--color-foreground-muted)', maxWidth: '48rem', lineHeight: 1.7 }}>
            {description}
          </p>
        )}
        {actions && <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>{actions}</div>}
      </div>
    </section>
  )
}
