import type { ModuleKernel, KernelRegistries } from '@/lib/platform/kernel/ModuleKernel'
import type { PlatformModule } from '@/lib/platform/contracts/ModuleManifest'
import type { ServiceContainer } from '@/lib/platform/services/ServiceContainer'
import type { Logger } from '@/lib/platform/services/Logger'
import type { PlatformConfig } from '@/lib/platform/services/PlatformConfig'
import type { EventBus } from '@/lib/platform/services/EventBus'
import { manifest } from './module.config'
import { coreNavGroups } from './navigation'
import { corePermissionGroups } from './permissions'
import { coreWidgets } from './widgets'

function register(kernel: ModuleKernel): void {
  const registries = kernel.getRegistries()
  const container = kernel.getContainer()

  registerNavigation(registries)
  registerPermissions(registries)
  registerWidgets(registries)
  registerCoreServices(container, kernel)
}

function registerNavigation(reg: KernelRegistries): void {
  for (const group of coreNavGroups) {
    reg.navigation.registerGroup(group)
  }
}

function registerPermissions(reg: KernelRegistries): void {
  for (const pg of corePermissionGroups) {
    reg.permissions.registerPermissions('core', pg.group, pg.permissions)
  }
}

function registerWidgets(reg: KernelRegistries): void {
  for (const widget of coreWidgets) {
    reg.widgets.registerWidget(widget)
  }
}

function registerCoreServices(container: ServiceContainer, kernel: ModuleKernel): void {
  const logger = kernel.resolve<Logger>('logger')
  const config = kernel.resolve<PlatformConfig>('config')
  const eventBus = kernel.resolve<EventBus>('eventBus')

  logger.info('Core', 'Core module registering services')

  config.set('platform.name', 'YS System', false)
  config.set('platform.version', '1.0.0', false)
  config.setDefault('app.name', 'YS System')
  config.setDefault('app.debug', false)

  eventBus.on('kernel.booted', () => {
    logger.info('Core', 'Platform fully booted')
  }, 0, 'core')
}

export const coreModule: PlatformModule = {
  manifest,
  register,
  boot: (kernel: ModuleKernel) => {
    const logger = kernel.resolve<Logger>('logger')
    logger.info('Core', 'Core module booted successfully')
  },
  shutdown: (kernel: ModuleKernel) => {
    const logger = kernel.resolve<Logger>('logger')
    logger.info('Core', 'Core module shutting down')
  },
}
