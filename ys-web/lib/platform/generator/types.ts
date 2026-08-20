export interface GeneratorInput {
  name: string
  slug: string
  description: string
  version?: string
  features?: GeneratorFeatures
}

export interface GeneratorFeatures {
  navigation?: boolean
  permissions?: boolean
  settings?: boolean
  seo?: boolean
  widgets?: boolean
  health?: boolean
  featureFlags?: boolean
  events?: boolean
  commands?: boolean
  queries?: boolean
  scheduler?: boolean
  search?: boolean
  tests?: boolean
}

export interface GeneratedModule {
  manifest: Record<string, unknown>
  files: Array<{ path: string; content: string }>
  routes?: Array<{ method: string; path: string; handler: string }>
}
