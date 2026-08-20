import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'sans-serif'],
      },

      colors: {
        background: {
          DEFAULT: 'var(--color-background)',
          subtle:  'var(--color-background-subtle)',
          muted:   'var(--color-background-muted)',
          inverse: 'var(--color-background-inverse)',
        },
        foreground: {
          DEFAULT: 'var(--color-foreground)',
          subtle:  'var(--color-foreground-subtle)',
          muted:   'var(--color-foreground-muted)',
          inverse: 'var(--color-foreground-inverse)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover:   'var(--color-accent-hover)',
          muted:   'var(--color-accent-muted)',
          subtle:  'var(--color-accent-subtle)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle:  'var(--color-border-subtle)',
          strong:  'var(--color-border-strong)',
        },
        // surface as a proper Tailwind color token
        surface: {
          DEFAULT:  'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error:   'var(--color-error)',
        info:    'var(--color-info)',
      },

      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
      },

      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      boxShadow: {
        'xs':     '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'glow':   '0 0 40px -8px var(--color-accent)',
        'glow-sm':'0 0 20px -4px var(--color-accent)',
      },

      maxWidth: {
        'site':   '1280px',
        'prose':  '72ch',
        'narrow': '48ch',
      },

      screens: {
        'xs':  '375px',
        'sm':  '640px',
        'md':  '768px',
        'lg':  '1024px',
        'xl':  '1280px',
        '2xl': '1440px',
        '3xl': '1920px',
      },

      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0,0,0.2,1) both',
        'fade-in': 'fade-in 0.4s cubic-bezier(0,0,0.2,1) both',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
