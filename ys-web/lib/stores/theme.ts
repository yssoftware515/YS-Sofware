'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: () => 'light' | 'dark'
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme) => {
        set({ theme })
        if (typeof window !== 'undefined') {
          applyTheme(theme)
        }
      },

      resolvedTheme: () => {
        // Guard for SSR
        if (typeof window === 'undefined') return 'light'

        const { theme } = get()
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
        }
        return theme
      },
    }),
    {
      name: 'ys-theme',
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          applyTheme(state.theme)
        }
      },
    },
  ),
)

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return

  const root   = document.documentElement
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
  root.classList.toggle('dark', isDark)
}
