import type { LucideIcon } from 'lucide-react'
import { AnimatedBox } from './AnimatedBox'

export interface FeatureRowItem {
  icon: LucideIcon
  /** Bold accent line (e.g. "3", "Secure"). Omit for a plain single-line title. */
  titleAccent?: string
  /** Main title line. Rendered under titleAccent when present, or alone otherwise. */
  title: string
  description: string
}

interface FeatureRowProps {
  items: FeatureRowItem[]
  /** Icon/accent color. 'violet' is the About-page-only identity color. */
  accent?: 'blue' | 'violet'
}

/**
 * FeatureRow — one connected bordered bar of icon + title + description
 * cells (same visual grammar as the homepage's WhyChooseBar), for pages
 * that need this "row of capability cards" pattern outside the
 * hero-docked context.
 *
 * Border technique: the container gets a start+top border, every cell
 * gets an end+bottom border. That alone produces a complete table-style
 * grid of 1px dividers — including the outer edge — for any column count,
 * with no per-index conditional classes to get wrong. `borderInlineStart`/
 * `borderInlineEnd` are used (not left/right) so it mirrors correctly
 * in RTL.
 */
export function FeatureRow({ items, accent = 'blue' }: FeatureRowProps) {
  const accentColor = accent === 'violet' ? '#8B5CF6' : 'var(--color-accent)'

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 rounded-[1.5rem] overflow-hidden"
      style={{
        borderInlineStart: '1px solid var(--color-border)',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {items.map((item, i) => (
        <AnimatedBox
          key={item.title}
          whileInView
          delay={i * 0.08}
          className="p-4 sm:p-6 lg:p-7"
          style={{ borderInlineEnd: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ border: `1px solid ${accentColor}` }}
          >
            <item.icon size={22} style={{ color: accentColor }} aria-hidden="true" />
          </div>

          {item.titleAccent ? (
            <div className="mb-2">
              <div className="font-display font-bold" style={{ color: accentColor, fontSize: '1.375rem', lineHeight: 1.2 }}>
                {item.titleAccent}
              </div>
              <div className="font-display font-semibold" style={{ color: 'var(--color-foreground)', fontSize: '1.0625rem' }}>
                {item.title}
              </div>
            </div>
          ) : (
            <h3 className="font-display font-semibold text-[1.0625rem] mb-2" style={{ color: 'var(--color-foreground)' }}>
              {item.title}
            </h3>
          )}

          <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
            {item.description}
          </p>
        </AnimatedBox>
      ))}
    </div>
  )
}
