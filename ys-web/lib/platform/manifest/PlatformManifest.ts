import type { ModuleKernel } from '../kernel/ModuleKernel'

export interface PlatformManifestData {
  platformName: string
  platformUuid: string
  platformVersion: string
  buildNumber: string
  buildDate: string
  environment: string
  kernelVersion: string
  sdkVersion: string
  manifestVersion: string
  supportedApiVersion: string
  minimumProductSdkVersion: string
  supportedDriverTypes: string[]
  registeredModulesCount: number
  registeredServicesCount: number
  registeredDriversCount: number
  registeredCommandsCount: number
  registeredQueriesCount: number
  registeredEventsCount: number
  featureFlagCount: number
  platformStatus: 'booted' | 'running' | 'maintenance' | 'error'
}

export class PlatformManifest {
  private kernel: ModuleKernel
  private uuid: string

  constructor(kernel: ModuleKernel) {
    this.kernel = kernel
    this.uuid = this.generateUuid()
  }

  private generateUuid(): string {
    return 'ys-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  }

  generate(): PlatformManifestData {
    const container = this.kernel.getContainer()

    const commandBus = container.has('commandBus') ? container.resolve<any>('commandBus') : null
    const queryBus = container.has('queryBus') ? container.resolve<any>('queryBus') : null
    const driverReg = container.has('driverRegistry') ? container.resolve<any>('driverRegistry') : null
    const config = container.has('config') ? container.resolve<any>('config') : null
    const eventBus = container.has('eventBus') ? container.resolve<any>('eventBus') : null
    const ffEngine = container.has('featureFlagEngine') ? container.resolve<any>('featureFlagEngine') : null

    return {
      platformName: config?.getString('platform.name') ?? 'YS Platform',
      platformUuid: this.uuid,
      platformVersion: config?.getString('platform.version') ?? '1.0.0',
      buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER ?? 'dev',
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      kernelVersion: '1.0.0',
      sdkVersion: '1.0.0',
      manifestVersion: '1.0.0',
      supportedApiVersion: 'v1',
      minimumProductSdkVersion: '1.0.0',
      supportedDriverTypes: ['cache', 'storage', 'mail', 'search', 'notification', 'logger'],
      registeredModulesCount: this.kernel.getModules().length,
      registeredServicesCount: container.getRegisteredIds().length,
      registeredDriversCount: driverReg?.count() ?? 0,
      registeredCommandsCount: commandBus?.getRegisteredTypes().length ?? 0,
      registeredQueriesCount: queryBus?.getRegisteredTypes().length ?? 0,
      registeredEventsCount: eventBus?.getHistory().length ?? 0,
      featureFlagCount: ffEngine?.getAllFlags().length ?? 0,
      platformStatus: this.kernel.isBooted() ? 'running' : this.kernel.isLoaded() ? 'booted' : 'error',
    }
  }

  getUuid(): string {
    return this.uuid
  }

  refreshUuid(): void {
    this.uuid = this.generateUuid()
  }
}
