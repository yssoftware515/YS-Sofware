'use client'

import { useState } from 'react'

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

// Curated palette — deliberately not "any color a picker allows". These 12
// are chosen to stay legible on the dark surface every product card uses
// and to read as visually distinct from each other at a glance in a list
// of many products. Custom hex is still available below for edge cases,
// but this is the recommended, tested-to-look-good set.
const SWATCHES = [
  '#0A4FE7', '#8B5CF6', '#10B981', '#F59E0B',
  '#EF4444', '#06B6D4', '#EC4899', '#6366F1',
  '#14B8A6', '#F43F5E', '#84CC16', '#7C3AED',
]

interface ColorPickerProps {
  value: string | null
  onChange: (color: string) => void
  error?: string
}

export function ColorPicker({ value, onChange, error }: ColorPickerProps) {
  // Local text buffer so the admin can type a partial hex ("#0A") without
  // each keystroke being rejected — validation/onChange only fires once
  // the string is a complete, valid #RRGGBB (same rule the backend
  // enforces), matching what CreateProductRequest will actually accept.
  const [text, setText] = useState(value ?? '')
  const [lastValue, setLastValue] = useState(value ?? '')
  // Keep the local buffer in sync when the form's value changes
  // externally (reset, async load) — derived during render, the
  // documented pattern for prop-derived state (no effect round-trip).
  // Both sides normalize null → '' so an unset color converges instead
  // of looping: `null !== ''` is always true, which made setState run on
  // every render and blew past React's render limit when value was null.
  const normalized = value ?? ''
  if (normalized !== lastValue) {
    setLastValue(normalized)
    setText(normalized)
  }

  const handleTextChange = (next: string) => {
    setText(next)
    if (HEX_PATTERN.test(next)) onChange(next)
  }

  const swatchColor = value && HEX_PATTERN.test(value) ? value : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {SWATCHES.map(hex => {
          const selected = value?.toLowerCase() === hex.toLowerCase()
          return (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              aria-pressed={selected}
              title={hex}
              onClick={() => onChange(hex)}
              style={{
                width: '2rem', height: '2rem', borderRadius: '50%', cursor: 'pointer',
                backgroundColor: hex,
                border: selected ? '2px solid var(--color-foreground)' : '2px solid transparent',
                outline: selected ? `2px solid ${hex}` : 'none',
                outlineOffset: 2,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.15) inset',
              }}
            />
          )
        })}

        {/* Custom color — native picker for anything outside the palette */}
        <label
          title="Custom color"
          style={{
            width: '2rem', height: '2rem', borderRadius: '50%', cursor: 'pointer', position: 'relative',
            border: '2px dashed var(--color-border)',
            backgroundImage: swatchColor
              ? `linear-gradient(${swatchColor}, ${swatchColor})`
              : 'conic-gradient(from 0deg, #EF4444, #F59E0B, #10B981, #06B6D4, #6366F1, #EC4899, #EF4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <input
            type="color"
            value={swatchColor ?? '#0A4FE7'}
            onChange={e => onChange(e.target.value.toUpperCase())}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          aria-hidden="true"
          style={{
            width: '1.25rem', height: '1.25rem', borderRadius: 6, flexShrink: 0,
            backgroundColor: swatchColor ?? 'var(--color-background-muted)',
            border: '1px solid var(--color-border)',
          }}
        />
        <input
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          placeholder="#0A4FE7"
          maxLength={7}
          style={{
            width: '8rem', padding: '0.4rem 0.625rem', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.8125rem',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', outline: 'none',
          }}
        />
      </div>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>{error}</span>}
    </div>
  )
}
