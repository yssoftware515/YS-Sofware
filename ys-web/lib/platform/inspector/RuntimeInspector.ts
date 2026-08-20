import type { ModuleKernel } from '../kernel/ModuleKernel'

export interface RuntimeInspection {
  modules: Array<{ id: string; version: string; enabled: boolean; booted: boolean }>
  services: Array<{ id: string; shared: boolean }>
  drivers: Array<{ category: string; name: string; state: string }>
  commands: string[]
  queries: string[]
  events: Array<{ event: string; listeners: number }>
  middleware: { commandBus: number; queryBus: number }
  registries: Array<{ name: string; itemCount: number }>
  adapters: Array<{ id: string; state: string }>
  featureFlags: Array<{ key: string; enabled: boolean }>
  scheduler: Array<{ id: string; enabled: boolean; status: string }>
  health: { checkCount: number }
  memory: { used: number; total: number; percentage: number }
  startupDuration: number
}

export class RuntimeInspector {
  private kernel: ModuleKernel
  private startupTime: number

  constructor(kernel: ModuleKernel) {
    this.kernel = kernel
    this.startupTime = Date.now()
  }

  inspect(): RuntimeInspection {
    const container = this.kernel.getContainer()
    const registries = this.kernel.getRegistries()

    const commandBus = container.has('commandBus') ? container.resolve<any>('commandBus') : null
    const queryBus = container.has('queryBus') ? container.resolve<any>('queryBus') : null
    const driverReg = container.has('driverRegistry') ? container.resolve<any>('driverRegistry') : null
    const eventBus = container.has('eventBus') ? container.resolve<any>('eventBus') : null
    const scheduler = registries.scheduler
    const health = container.has('healthReporter') ? container.resolve<any>('healthReporter') : null
    const ffEngine = container.has('featureFlagEngine') ? container.resolve<any>('featureFlagEngine') : null

    const memory = typeof process !== 'undefined' && process.memoryUsage
      ? (() => {
          const usage = process.memoryUsage()
          return { used: Math.round(usage.heapUsed / 1024 / 1024), total: Math.round(usage.heapTotal / 1024 / 1024), percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100) }
        })()
      : { used: 0, total: 0, percentage: 0 }

    return {
      modules: this.kernel.getModules().map(m => ({
        id: m.manifest.id,
        version: m.manifest.version,
        enabled: m.manifest.enabled,
        booted: this.kernel.isBooted(),
      })),
      services: container.getRegisteredIds().map(id => ({
        id,
        shared: true,
      })),
      drivers: driverReg?.discover().map((d: any) => ({
        category: d.category, name: d.name, state: d.state,
      })) ?? [],
      commands: commandBus?.getRegisteredTypes() ?? [],
      queries: queryBus?.getRegisteredTypes() ?? [],
      events: eventBus
        ? eventBus.getHistory().reduce((acc: any[], h: any) => {
            const existing = acc.find((e: any) => e.event === h.event)
            if (existing) existing.listeners++
            else acc.push({ event: h.event, listeners: 1 })
            return acc
          }, [])
        : [],
      middleware: {
        commandBus: commandBus?.getMiddlewareCount() ?? 0,
        queryBus: queryBus?.getMiddlewareCount() ?? 0,
      },
      registries: [
        { name: 'navigation', itemCount: registries.navigation.getGroups().length },
        { name: 'permissions', itemCount: registries.permissions.getAllKeys().length },
        { name: 'widgets', itemCount: registries.widgets.getWidgets().length },
        { name: 'settings', itemCount: registries.settings.getSections().length },
        { name: 'search', itemCount: registries.search.getProviders().length },
        { name: 'seo', itemCount: registries.seo.getContributions().length },
        { name: 'featureFlags', itemCount: registries.featureFlags.getFlags().length },
        { name: 'scheduler', itemCount: registries.scheduler.getAllTasks().length },
      ],
      adapters: [],
      featureFlags: ffEngine?.getAllFlags().map((f: any) => ({
        key: f.key, enabled: f.enabled,
      })) ?? [],
      scheduler: scheduler.getAllTasks().map(t => ({
        id: t.id, enabled: t.enabled, status: t.status ?? 'idle',
      })),
      health: { checkCount: health?.getRegisteredChecks().length ?? 0 },
      memory,
      startupDuration: Date.now() - this.startupTime,
    }
  }

  getStartupDuration(): number {
    return Date.now() - this.startupTime
  }
}
