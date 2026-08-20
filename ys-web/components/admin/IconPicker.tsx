'use client'

import { PRODUCT_ICONS } from '@/lib/utils/productIcons'

interface IconPickerProps {
  value: string | null
  onChange: (iconKey: string) => void
  color?: string | null
}

/**
 * IconPicker — a closed-set visual picker over PRODUCT_ICONS, the exact
 * same lookup table that renders live product cards on the public site.
 * There is no free-text option here on purpose: a typo in a hand-typed
 * icon key used to mean a card silently rendered with no icon at all,
 * discovered only by someone looking at the live site. Picking from this
 * grid makes an invalid value structurally impossible.
 */
export function IconPicker({ value, onChange, color }: IconPickerProps) {
  const swatchColor = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : 'var(--color-accent)'

  return (
    <div
      role="radiogroup"
      aria-label="Product icon"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(2.75rem, 1fr))', gap: '0.5rem' }}
    >
      {Object.entries(PRODUCT_ICONS).map(([key, Icon]) => {
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={key}
            title={key}
            onClick={() => onChange(key)}
            style={{
              width: '2.75rem', height: '2.75rem', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 120ms',
              border: selected ? `2px solid ${swatchColor}` : '1px solid var(--color-border)',
              backgroundColor: selected ? `${swatchColor}1F` : 'var(--color-background-subtle)',
              color: selected ? swatchColor : 'var(--color-foreground-muted)',
            }}
          >
            <Icon size={18} strokeWidth={selected ? 2.25 : 2} />
          </button>
        )
      })}
    </div>
  )
}
