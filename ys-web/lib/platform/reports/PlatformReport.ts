import type { ModuleKernel } from '../kernel/ModuleKernel'
import type { PlatformManifest } from '../manifest/PlatformManifest'
import type { RuntimeInspector } from '../inspector/RuntimeInspector'

export interface ReportSection {
  title: string
  data: Record<string, unknown>
}

export interface PlatformReportData {
  generatedAt: string
  type: string
  sections: ReportSection[]
}

export class PlatformReport {
  private kernel: ModuleKernel
  private manifest: PlatformManifest
  private inspector: RuntimeInspector

  constructor(kernel: ModuleKernel, manifest: PlatformManifest, inspector: RuntimeInspector) {
    this.kernel = kernel
    this.manifest = manifest
    this.inspector = inspector
  }

  generateArchitectureReport(): PlatformReportData {
    const m = this.manifest.generate()
    const r = this.inspector.inspect()

    return {
      generatedAt: new Date().toISOString(),
      type: 'architecture',
      sections: [
        { title: 'Platform', data: { name: m.platformName, version: m.platformVersion, environment: m.environment, status: m.platformStatus, uuid: m.platformUuid } },
        { title: 'Modules', data: { count: m.registeredModulesCount, list: r.modules.map(m => `${m.id}@${m.version}`) } },
        { title: 'Services', data: { count: r.services.length, list: r.services.map(s => s.id) } },
        { title: 'Registries', data: Object.fromEntries(r.registries.map(reg => [reg.name, reg.itemCount])) },
        { title: 'Drivers', data: { count: r.drivers.length, list: r.drivers } },
        { title: 'Middleware', data: r.middleware },
      ],
    }
  }

  generateRuntimeReport(): PlatformReportData {
    const r = this.inspector.inspect()
    return {
      generatedAt: new Date().toISOString(),
      type: 'runtime',
      sections: [
        { title: 'Memory', data: r.memory },
        { title: 'Startup', data: { duration: `${r.startupDuration}ms` } },
        { title: 'Modules', data: { booted: r.modules.filter(m => m.booted).length, total: r.modules.length } },
        { title: 'Scheduler', data: { tasks: r.scheduler.length, active: r.scheduler.filter(s => s.status === 'running').length } },
      ],
    }
  }

  generateModuleReport(): PlatformReportData {
    const modules = this.kernel.getModules()
    const r = this.inspector.inspect()
    return {
      generatedAt: new Date().toISOString(),
      type: 'modules',
      sections: [
        { title: 'Summary', data: { total: modules.length, enabled: modules.filter(m => m.manifest.enabled).length } },
        { title: 'Modules', data: Object.fromEntries(modules.map(m => [m.manifest.id, { version: m.manifest.version, enabled: m.manifest.enabled, order: m.manifest.order }])) },
        { title: 'Commands', data: { total: r.commands.length, list: r.commands } },
        { title: 'Queries', data: { total: r.queries.length, list: r.queries } },
      ],
    }
  }

  generatePerformanceReport(): PlatformReportData {
    const container = this.kernel.getContainer()
    const perf = container.has('performanceMonitor') ? container.resolve<any>('performanceMonitor') : null
    const obsv = container.has('observabilityManager') ? container.resolve<any>('observabilityManager') : null
    const r = this.inspector.inspect()

    return {
      generatedAt: new Date().toISOString(),
      type: 'performance',
      sections: [
        { title: 'Summary', data: { startupDuration: `${r.startupDuration}ms`, memoryUsed: `${r.memory.used}MB`, memoryTotal: `${r.memory.total}MB` } },
        { title: 'Metrics', data: { names: perf?.getMetricNames() ?? [], count: perf?.getMetricNames().length ?? 0 } },
        { title: 'Slow Operations', data: { count: obsv?.getSlowOperations().length ?? 0 } },
        { title: 'Average Execution', data: { middleware: obsv?.getAverageDuration() ?? 0 } },
      ],
    }
  }

  generateSecurityReport(): PlatformReportData {
    const registries = this.kernel.getRegistries()
    const container = this.kernel.getContainer()
    const security = container.has('securityManager') ? container.resolve<any>('securityManager') : null
    return {
      generatedAt: new Date().toISOString(),
      type: 'security',
      sections: [
        { title: 'Permissions', data: { total: registries.permissions.getAllKeys().length } },
        { title: 'Roles', data: { total: security?.getRoles().length ?? 0, list: security?.getRoles().map((r: any) => r.name) ?? [] } },
        { title: 'Sensitive Config', data: { masked: true } },
      ],
    }
  }

  generateConfigurationReport(): PlatformReportData {
    const container = this.kernel.getContainer()
    const config = container.has('config') ? container.resolve<any>('config') : null
    const allConfig = config?.getAll() ?? []
    const masked = allConfig.map((c: any) => ({
      key: c.key,
      value: c.isSecret ? '••••••••' : c.value,
      secret: c.isSecret,
    }))
    return {
      generatedAt: new Date().toISOString(),
      type: 'configuration',
      sections: [
        { title: 'Configuration', data: { total: masked.length, entries: masked } },
      ],
    }
  }

  toJson(report: PlatformReportData): string {
    return JSON.stringify(report, null, 2)
  }
}
