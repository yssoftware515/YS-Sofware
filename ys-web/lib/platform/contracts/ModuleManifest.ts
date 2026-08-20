import type { ModuleKernel } from '../kernel/ModuleKernel'

export interface Dependency {
  moduleId: string
  version?: string
  optional?: boolean
}

export interface ModuleManifest {
  id: string
  name: Record<string, string>
  description: Record<string, string>
  version: string
  slug: string
  enabled: boolean
  order: number
  dependencies?: Dependency[]
  requires?: string[]
}

export interface SetupResult {
  success: boolean
  error?: string
}

export interface PlatformModule {
  manifest: ModuleManifest
  register?(kernel: ModuleKernel): void
  boot?(kernel: ModuleKernel): void | Promise<void>
  shutdown?(kernel: ModuleKernel): void | Promise<void>
  install?(kernel: ModuleKernel): void | Promise<SetupResult>
  upgrade?(kernel: ModuleKernel, fromVersion: string): void | Promise<SetupResult>
  providers?: React.ComponentType<{ children: React.ReactNode }>[]
}

export interface PluginConfig {
  moduleId: string
  pluginId: string
  name: Record<string, string>
  description: Record<string, string>
  version?: string
  hooks?: {
    beforeRegister?: (kernel: ModuleKernel) => void
    afterRegister?: (kernel: ModuleKernel) => void
  }
}

export interface PluginFoundation {
  config: PluginConfig
  mount: (kernel: ModuleKernel) => void
  unmount?: (kernel: ModuleKernel) => void
}
