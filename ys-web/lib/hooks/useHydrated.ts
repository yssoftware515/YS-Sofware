'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// Hydration guard: returns true only after the component has mounted on
// the client. Anything that must not render differently between SSR and
// the first client render (theme icon, keyboard hint, cookie banner)
// should key off this instead of a "mounted" state set in an effect.
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}