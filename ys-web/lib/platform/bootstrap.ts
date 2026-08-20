import { ModuleKernel } from './kernel/ModuleKernel'
import type { PlatformModule } from './contracts/ModuleManifest'

let kernel: ModuleKernel | null = null

export function bootstrapPlatform(modules?: PlatformModule[]): ModuleKernel {
  if (kernel && kernel.isLoaded()) return kernel

  if (!kernel) {
    kernel = new ModuleKernel()
  }

  if (modules && modules.length > 0) {
    kernel.loadModules(modules)
  }

  return kernel
}

export function getKernel(): ModuleKernel {
  if (!kernel) {
    throw new Error('Platform kernel not initialized. Call bootstrapPlatform() first.')
  }
  return kernel
}

export function resetKernel(): void {
  if (kernel) {
    kernel.reset()
    kernel = null
  }
}
