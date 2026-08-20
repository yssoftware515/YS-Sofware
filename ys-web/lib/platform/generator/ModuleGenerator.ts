import type { GeneratorInput, GeneratorFeatures, GeneratedModule } from './types'

export class ModuleGenerator {
  generate(input: GeneratorInput): GeneratedModule {
    const features = input.features ?? {}
    const slug = input.slug
    const files: GeneratedModule['files'] = []

    const manifest: Record<string, unknown> = {
      id: slug,
      name: { en: input.name, ar: input.name },
      description: { en: input.description, ar: input.description },
      version: input.version ?? '1.0.0',
      slug,
      enabled: true,
      order: 10,
    }

    files.push({ path: `${slug}/module.config.ts`, content: this.generateModuleConfig(slug, input) })
    files.push({ path: `${slug}/index.ts`, content: this.generateModuleIndex(slug) })

    if (features.navigation) files.push({ path: `${slug}/navigation.ts`, content: this.generateNavigation(slug) })
    if (features.permissions) files.push({ path: `${slug}/permissions.ts`, content: this.generatePermissions(slug) })
    if (features.settings) files.push({ path: `${slug}/settings.ts`, content: this.generateSettings(slug) })
    if (features.seo) files.push({ path: `${slug}/seo.ts`, content: this.generateSEO(slug) })
    if (features.widgets) files.push({ path: `${slug}/widgets.ts`, content: this.generateWidgets(slug) })
    if (features.featureFlags) files.push({ path: `${slug}/feature-flags.ts`, content: this.generateFeatureFlags(slug) })
    if (features.events) files.push({ path: `${slug}/events.ts`, content: this.generateEvents(slug) })
    if (features.commands) files.push({ path: `${slug}/commands.ts`, content: this.generateCommands(slug) })
    if (features.queries) files.push({ path: `${slug}/queries.ts`, content: this.generateQueries(slug) })
    if (features.scheduler) files.push({ path: `${slug}/scheduler.ts`, content: this.generateScheduler(slug) })
    if (features.search) files.push({ path: `${slug}/search.ts`, content: this.generateSearch(slug) })
    if (features.health) files.push({ path: `${slug}/health.ts`, content: this.generateHealth(slug) })
    if (features.tests) files.push({ path: `${slug}/__tests__/index.test.ts`, content: this.generateTests(slug) })

    files.push({ path: `${slug}/README.md`, content: this.generateReadme(input) })

    return { manifest, files }
  }

  private generateModuleConfig(slug: string, input: GeneratorInput): string {
    return `import type { ModuleManifest } from '@/lib/platform/contracts/ModuleManifest'

export const manifest: ModuleManifest = {
  id: '${slug}',
  name: { en: '${input.name}', ar: '${input.name}' },
  description: { en: '${input.description}', ar: '${input.description}' },
  version: '${input.version ?? '1.0.0'}',
  slug: '${slug}',
  enabled: true,
  order: 10,
}
`
  }

  private generateModuleIndex(slug: string): string {
    return `import type { ModuleKernel } from '@/lib/platform/kernel/ModuleKernel'
import type { PlatformModule } from '@/lib/platform/contracts/ModuleManifest'
import { manifest } from './module.config'

function register(kernel: ModuleKernel): void {
  const registries = kernel.getRegistries()
}

export const ${slug}Module: PlatformModule = {
  manifest,
  register,
}
`
  }

  private generateNavigation(slug: string): string {
    return `import type { NavGroup } from '@/lib/platform/registries/NavigationRegistry'

export const ${slug}NavGroups: NavGroup[] = [
  {
    id: '${slug}',
    label: '${slug}',
    order: 10,
    items: [
      { label: 'Dashboard', href: '/admin/${slug}', icon: 'LayoutDashboard' },
    ],
  },
]
`
  }

  private generatePermissions(slug: string): string {
    return `export const ${slug}Permissions = [
  { group: '${slug}', permissions: ['view_${slug}', 'manage_${slug}'] },
]
`
  }

  private generateSettings(slug: string): string {
    return `import type { SettingsSection } from '@/lib/platform/registries/SettingsRegistry'

export const ${slug}Settings: SettingsSection[] = [
  {
    id: '${slug}',
    label: '${slug}',
    order: 10,
    moduleId: '${slug}',
    items: [
      { key: '${slug}_enabled', label: 'Enabled', type: 'toggle', default: true },
    ],
  },
]
`
  }

  private generateSEO(slug: string): string {
    return `import type { SeoContribution } from '@/lib/platform/registries/SeoRegistry'

export const ${slug}Seo: SeoContribution[] = [
  { route: '/${slug}', title: '${slug}', description: '${slug} page', moduleId: '${slug}' },
]
`
  }

  private generateWidgets(slug: string): string {
    return `import type { WidgetDefinition } from '@/lib/platform/registries/WidgetRegistry'

export const ${slug}Widgets: WidgetDefinition[] = [
  { id: '${slug}_stats', label: '${slug} Stats', value: '0', moduleId: '${slug}' },
]
`
  }

  private generateFeatureFlags(slug: string): string {
    return `export const ${slug}FeatureFlags = [
  { key: '${slug}.enabled', label: '${slug}', default: false, moduleId: '${slug}' },
]
`
  }

  private generateEvents(slug: string): string {
    return `export const ${slug}Events = [
  { name: '${slug}.created', description: 'Triggered when a ${slug} is created' },
  { name: '${slug}.updated', description: 'Triggered when a ${slug} is updated' },
  { name: '${slug}.deleted', description: 'Triggered when a ${slug} is deleted' },
]
`
  }

  private generateCommands(slug: string): string {
    return `export const ${slug}Commands = [
  { type: 'Create${slug}Command', description: 'Create a new ${slug}' },
  { type: 'Delete${slug}Command', description: 'Delete an existing ${slug}' },
]
`
  }

  private generateQueries(slug: string): string {
    return `export const ${slug}Queries = [
  { type: 'Get${slug}Query', description: 'Get ${slug} details' },
  { type: 'List${slug}Query', description: 'List all ${slug} items' },
]
`
  }

  private generateScheduler(slug: string): string {
    return `import type { ScheduledTask } from '@/lib/platform/registries/SchedulerRegistry'

export const ${slug}Tasks: ScheduledTask[] = []
`
  }

  private generateSearch(slug: string): string {
    return `export const ${slug}SearchProviders = [
  { moduleId: '${slug}', label: '${slug}' },
]
`
  }

  private generateHealth(slug: string): string {
    return `import type { HealthCheck } from '@/lib/platform/services/HealthReporter'

export const ${slug}HealthChecks: HealthCheck[] = []
`
  }

  private generateTests(slug: string): string {
    return `import { describe, it, expect } from 'vitest'

describe('${slug}Module', () => {
  it('should be defined', () => {
    expect(true).toBe(true)
  })
})
`
  }

  private generateReadme(input: GeneratorInput): string {
    return `# ${input.name}

${input.description}

## Features

- Auto-generated module scaffold
- Ready for extension`
  }
}
