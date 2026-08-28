import type { PlatformModule } from '../contracts/ModuleManifest'
import { NavigationRegistry } from '../registries/NavigationRegistry'
import { PermissionRegistry } from '../registries/PermissionRegistry'
import { WidgetRegistry } from '../registries/WidgetRegistry'
import { SeoRegistry } from '../registries/SeoRegistry'
import { ServiceContainer } from '../services/ServiceContainer'
import { Logger, createConsoleTransport } from '../services/Logger'
import { PlatformConfig } from '../services/PlatformConfig'
import { EventBus } from '../services/EventBus'

export interface KernelRegistries {
  navigation: NavigationRegistry
  permissions: PermissionRegistry
  widgets: WidgetRegistry
  seo: SeoRegistry
}

export class ModuleKernel {
  private registries: KernelRegistries
  private container: ServiceContainer
  private loaded = false
  private booted = false
  private modules: PlatformModule[] = []

  constructor() {
    this.registries = {
      navigation: new NavigationRegistry(),
      permissions: new PermissionRegistry(),
      widgets: new WidgetRegistry(),
      seo: new SeoRegistry(),
    }
    this.container = new ServiceContainer()
  }

  getRegistries(): KernelRegistries {
    return this.registries
  }

  getRegistry<K extends keyof KernelRegistries>(key: K): KernelRegistries[K] {
    return this.registries[key]
  }

  getContainer(): ServiceContainer {
    return this.container
  }

  resolve<T>(id: string): T {
    return this.container.resolve<T>(id)
  }

  hasService(id: string): boolean {
    return this.container.has(id)
  }

  isLoaded(): boolean {
    return this.loaded
  }

  isBooted(): boolean {
    return this.booted
  }

  getModules(): PlatformModule[] {
    return [...this.modules]
  }

  private registerInfrastructureServices(): void {
    const logger = new Logger()
    logger.addTransport(createConsoleTransport())
    this.container.singleton('logger', () => logger)
    this.container.singleton('config', () => new PlatformConfig())
    this.container.singleton('eventBus', () => new EventBus())
  }

  loadModules(moduleList: PlatformModule[]): void {
    if (this.loaded) return

    this.registerInfrastructureServices()
    const logger = this.resolve<Logger>('logger')
    const eventBus = this.resolve<EventBus>('eventBus')

    for (const mod of moduleList) {
      if (mod.manifest.enabled && mod.register) {
        logger.info('Kernel', `Registering module: ${mod.manifest.id}`)
        mod.register(this)
      }
      this.modules.push(mod)
    }

    this.loaded = true
    this.bootModules()
    eventBus.emit('kernel.loaded', { moduleCount: moduleList.length })
  }

  private async bootModules(): Promise<void> {
    if (this.booted) return
    const logger = this.resolve<Logger>('logger')
    const eventBus = this.resolve<EventBus>('eventBus')

    for (const mod of this.modules) {
      if (mod.manifest.enabled && mod.boot) {
        try {
          logger.info('Kernel', `Booting module: ${mod.manifest.id}`)
          await mod.boot(this)
        } catch (e) {
          logger.error('Kernel', `Failed to boot module ${mod.manifest.id}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }

    this.booted = true
    eventBus.emit('kernel.booted', {})
  }

  async shutdownModules(): Promise<void> {
    const logger = this.resolve<Logger>('logger')
    const eventBus = this.resolve<EventBus>('eventBus')
    eventBus.emit('kernel.shuttingDown', {})

    for (const mod of this.modules.reverse()) {
      if (mod.shutdown) {
        try {
          logger.info('Kernel', `Shutting down module: ${mod.manifest.id}`)
          await mod.shutdown(this)
        } catch (e) {
          logger.error('Kernel', `Shutdown error for ${mod.manifest.id}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
      eventBus.offModuleAll(mod.manifest.id)
    }

    this.booted = false
    this.loaded = false
  }

  async installModule(mod: PlatformModule): Promise<void> {
    if (mod.install) {
      const result = await mod.install(this)
      if (result && !result.success) throw new Error(result.error ?? 'Install failed')
    }
    this.modules.push(mod)
    if (mod.manifest.enabled && mod.register) {
      mod.register(this)
    }
  }

  async upgradeModule(mod: PlatformModule, fromVersion: string): Promise<void> {
    if (mod.upgrade) {
      const result = await mod.upgrade(this, fromVersion)
      if (result && !result.success) throw new Error(result.error ?? 'Upgrade failed')
    }
  }

  reset(): void {
    for (const key of Object.keys(this.registries) as (keyof KernelRegistries)[]) {
      this.registries[key].clear()
    }
    this.container.clear()
    this.modules = []
    this.loaded = false
    this.booted = false
  }
}
