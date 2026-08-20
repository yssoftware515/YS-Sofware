import type { PlatformConfig } from '../services/PlatformConfig'
import type { ModuleKernel } from '../kernel/ModuleKernel'

export interface ConfigEntryView {
  key: string
  value: string
  masked: boolean
  source: string
}

export interface ConfigurationView {
  environment: string
  entries: ConfigEntryView[]
  sections: Array<{ name: string; entries: ConfigEntryView[] }>
  sensitiveKeys: string[]
}

const SENSITIVE_PATTERNS = ['password', 'secret', 'token', 'api_key', 'api_secret', 'private_key', 'credential', 'auth', 'access_key']

export class ConfigurationInspector {
  private kernel: ModuleKernel

  constructor(kernel: ModuleKernel) {
    this.kernel = kernel
  }

  inspect(): ConfigurationView {
    const container = this.kernel.getContainer()
    const config = container.has('config') ? container.resolve<PlatformConfig>('config') : null

    const allConfig = config?.getAll() ?? []
    const sensitiveKeys: string[] = []

    const entries: ConfigEntryView[] = allConfig.map(c => {
      const isSensitive = c.isSecret || SENSITIVE_PATTERNS.some(p => c.key.toLowerCase().includes(p))
      if (isSensitive) sensitiveKeys.push(c.key)
      return {
        key: c.key,
        value: isSensitive ? '••••••••' : String(c.value ?? ''),
        masked: isSensitive,
        source: c.isSecret ? 'environment' : 'default',
      }
    })

    const sections: ConfigurationView['sections'] = [
      {
        name: 'Platform',
        entries: entries.filter(e => e.key.startsWith('platform.')),
      },
      {
        name: 'Application',
        entries: entries.filter(e => e.key.startsWith('app.')),
      },
      {
        name: 'Other',
        entries: entries.filter(e => !e.key.startsWith('platform.') && !e.key.startsWith('app.')),
      },
    ]

    return {
      environment: process.env.NODE_ENV ?? 'development',
      entries,
      sections: sections.filter(s => s.entries.length > 0),
      sensitiveKeys,
    }
  }

  getServiceConfigurations(): Record<string, unknown> {
    const container = this.kernel.getContainer()
    return {
      cache: container.has('cacheManager') ? { driver: container.resolve<any>('cacheManager').getDriver().constructor.name } : null,
      storage: container.has('storageManager') ? { disks: container.resolve<any>('storageManager').getDisks() } : null,
      mail: container.has('mailManager') ? { drivers: container.resolve<any>('mailManager').getDrivers() } : null,
      search: container.has('searchEngine') ? { available: container.resolve<any>('searchEngine').isAvailable() } : null,
      services: container.getRegisteredIds(),
    }
  }
}
