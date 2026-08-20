'use client'

import { createContext, useContext, useState } from 'react'
import { bootstrapPlatform } from './bootstrap'
import { ModuleKernel } from './kernel/ModuleKernel'
import type { PlatformModule } from './contracts/ModuleManifest'
import { registeredModules } from '@/modules'

interface PlatformContextValue {
  kernel: ModuleKernel | null
  loaded: boolean
}

const PlatformContext = createContext<PlatformContextValue>({
  kernel: null,
  loaded: false,
})

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [{ kernel, loaded }] = useState(() => {
    const kernel = bootstrapPlatform(registeredModules as PlatformModule[])
    return { kernel, loaded: true }
  })

  return (
    <PlatformContext.Provider value={{ kernel, loaded }}>
      {children}
    </PlatformContext.Provider>
  )
}

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext)
}
