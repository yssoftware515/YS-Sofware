import type { ModuleKernel } from '../kernel/ModuleKernel'
import type { PlatformSnapshot } from './types'
import type { PlatformManifest } from '../manifest/PlatformManifest'
import type { RuntimeInspector } from '../inspector/RuntimeInspector'

export class SnapshotGenerator {
  private kernel: ModuleKernel
  private manifest: PlatformManifest
  private inspector: RuntimeInspector

  constructor(kernel: ModuleKernel, manifest: PlatformManifest, inspector: RuntimeInspector) {
    this.kernel = kernel
    this.manifest = manifest
    this.inspector = inspector
  }

  generate(): PlatformSnapshot {
    const container = this.kernel.getContainer()
    const registries = this.kernel.getRegistries()
    const manifestData = this.manifest.generate()
    const runtime = this.inspector.inspect()

    const config = container.has('config') ? container.resolve<any>('config') : null
    const eventBus = container.has('eventBus') ? container.resolve<any>('eventBus') : null
    const errorCatalog = container.has('errorCatalog') ? container.resolve<any>('errorCatalog') : null
    const perfMonitor = container.has('performanceMonitor') ? container.resolve<any>('performanceMonitor') : null
    const securityManager = container.has('securityManager') ? container.resolve<any>('securityManager') : null
    const depGraph = container.has('dependencyGraph') ? container.resolve<any>('dependencyGraph') : null

    const eventHistory = eventBus?.getHistory() ?? []
    const errors = errorCatalog?.getHistory() ?? []
    const slowOps = perfMonitor?.getSlowOperations() ?? []
    const warnings: string[] = []

    if (depGraph) {
      const validation = depGraph.validate()
      for (const err of validation) warnings.push(err.message)
    }

    const services = container.getRegisteredIds()

    return {
      generatedAt: new Date().toISOString(),
      platform: {
        name: manifestData.platformName,
        uuid: manifestData.platformUuid,
        version: manifestData.platformVersion,
        environment: manifestData.environment,
        status: manifestData.platformStatus,
      },
      modules: this.kernel.getModules().map(m => ({
        id: m.manifest.id,
        version: m.manifest.version,
        enabled: m.manifest.enabled,
      })),
      dependencyGraph: {
        nodes: depGraph?.getNodeCount() ?? 0,
        errors: depGraph?.validate().map((e: any) => e.message) ?? [],
      },
      featureFlags: runtime.featureFlags,
      drivers: runtime.drivers,
      services,
      commands: runtime.commands,
      queries: runtime.queries,
      events: eventHistory.slice(-50).map((h: any) => ({
        event: h.event, success: h.success, duration: h.duration,
      })),
      scheduler: runtime.scheduler.map(s => ({ id: s.id, status: s.status })),
      health: {
        status: runtime.health.checkCount > 0 ? 'monitored' : 'unmonitored',
        checks: runtime.health.checkCount,
      },
      performance: {
        metrics: perfMonitor?.getMetricNames().length ?? 0,
        slowOperations: slowOps.length,
        startupDuration: runtime.startupDuration,
        memory: runtime.memory,
      },
      errors: errors.slice(-20).map((e: any) => ({
        code: e.code, message: e.message, severity: e.severity, timestamp: e.timestamp,
      })),
      warnings,
      security: {
        servicesCount: config?.isSecret ? 0 : services.length,
        permissionsCount: registries.permissions.getAllKeys().length,
        rolesCount: securityManager?.getRoles().length ?? 0,
      },
    }
  }

  generateJson(): string {
    const snapshot = this.generate()
    return JSON.stringify(snapshot, this.sanitizeSecrets(), 2)
  }

  generateHtml(): string {
    const s = this.generate()
    const rows = (items: any[], fields: string[]) => items.map(item =>
      `<tr>${fields.map(f => `<td>${item[f] ?? '—'}</td>`).join('')}</tr>`
    ).join('')

    return `<!DOCTYPE html>
<html><head><title>Platform Snapshot</title>
<style>body{font-family:system-ui;max-width:960px;margin:2rem auto;padding:0 1rem;color:#333}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{padding:0.5rem;border:1px solid #ddd;text-align:left;font-size:0.875rem}h2{color:#6366f1;margin-top:2rem}.badge{display:inline-block;padding:0.125rem 0.5rem;border-radius:999px;font-size:0.75rem}</style></head>
<body>
<h1>Platform Snapshot</h1>
<p>Generated: ${s.generatedAt} | ${s.platform.environment}</p>
<h2>Platform</h2>
<table><tr><th>Name</th><th>Version</th><th>Status</th></tr>
<tr><td>${s.platform.name}</td><td>${s.platform.version}</td><td>${s.platform.status}</td></tr></table>
<h2>Modules (${s.modules.length})</h2>
<table><tr><th>ID</th><th>Version</th><th>Enabled</th></tr>${rows(s.modules, ['id', 'version', 'enabled'])}</table>
<h2>Services (${s.services.length})</h2>
<p>${s.services.join(', ') || 'None'}</p>
<h2>Health</h2>
<p>Status: ${s.health.status} | Checks: ${s.health.checks}</p>
<h2>Performance</h2>
<p>Startup: ${s.performance.startupDuration}ms | Memory: ${s.performance.memory.used}MB / ${s.performance.memory.total}MB</p>
<h2>Warnings (${s.warnings.length})</h2>
<ul>${s.warnings.map(w => `<li>${w}</li>`).join('')}</ul>
</body></html>`
  }

  private sanitizeSecrets(): (key: string, value: unknown) => unknown {
    const secretKeys = ['password', 'secret', 'token', 'key', 'credential', 'auth']
    return (key: string, value: unknown) => {
      if (secretKeys.some(k => key.toLowerCase().includes(k))) return '[REDACTED]'
      return value
    }
  }
}
