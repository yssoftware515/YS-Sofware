export interface PlatformSnapshot {
  generatedAt: string
  platform: {
    name: string
    uuid: string
    version: string
    environment: string
    status: string
  }
  modules: Array<{ id: string; version: string; enabled: boolean }>
  dependencyGraph: {
    nodes: number
    errors: string[]
  }
  featureFlags: Array<{ key: string; enabled: boolean }>
  drivers: Array<{ category: string; name: string; state: string }>
  services: string[]
  commands: string[]
  queries: string[]
  events: Array<{ event: string; success: boolean; duration: number }>
  scheduler: Array<{ id: string; status: string }>
  health: { status: string; checks: number }
  performance: {
    metrics: number
    slowOperations: number
    startupDuration: number
    memory: { used: number; total: number; percentage: number }
  }
  errors: Array<{ code: string; message: string; severity: string; timestamp: string }>
  warnings: string[]
  security: {
    servicesCount: number
    permissionsCount: number
    rolesCount: number
  }
}
