import type { ModuleKernel } from '../kernel/ModuleKernel'

export interface HealthScore {
  name: string
  value: number
  max: number
  percentage: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
}

export interface OperationalHealthReport {
  timestamp: string
  platformScore: HealthScore
  architectureScore: HealthScore
  healthScore: HealthScore
  performanceScore: HealthScore
  securityScore: HealthScore
  maintainabilityScore: HealthScore
  dependencyHealth: HealthScore
  configurationHealth: HealthScore
  driverHealth: HealthScore
  registryHealth: HealthScore
  observabilityHealth: HealthScore
  warnings: string[]
  recommendations: string[]
}

export class OperationalHealthCenter {
  private kernel: ModuleKernel

  constructor(kernel: ModuleKernel) {
    this.kernel = kernel
  }

  assess(): OperationalHealthReport {
    const container = this.kernel.getContainer()
    const registries = this.kernel.getRegistries()
    const warnings: string[] = []
    const recommendations: string[] = []

    const depGraph = container.has('dependencyGraph') ? container.resolve<any>('dependencyGraph') : null
    const depErrors = depGraph?.validate() ?? []

    const perfMonitor = container.has('performanceMonitor') ? container.resolve<any>('performanceMonitor') : null
    const securityManager = container.has('securityManager') ? container.resolve<any>('securityManager') : null
    const healthReporter = container.has('healthReporter') ? container.resolve<any>('healthReporter') : null
    const commandBus = container.has('commandBus') ? container.resolve<any>('commandBus') : null
    const queryBus = container.has('queryBus') ? container.resolve<any>('queryBus') : null
    const eventBus = container.has('eventBus') ? container.resolve<any>('eventBus') : null
    const config = container.has('config') ? container.resolve<any>('config') : null
    const errorCatalog = container.has('errorCatalog') ? container.resolve<any>('errorCatalog') : null

    if (depErrors.length > 0) {
      warnings.push(`${depErrors.length} dependency issues found`)
      recommendations.push('Resolve dependency issues in the DependencyGraph')
    }

    if (!securityManager || securityManager.getRoles().length === 0) {
      warnings.push('No roles configured')
      recommendations.push('Configure roles for access control')
    }

    if (!healthReporter || healthReporter.getRegisteredChecks().length === 0) {
      warnings.push('No health checks registered')
      recommendations.push('Register health checks for system monitoring')
    }

    const slowOps = perfMonitor?.getSlowOperations() ?? []
    if (slowOps.length > 0) {
      warnings.push(`${slowOps.length} slow operations detected`)
      recommendations.push('Investigate slow operations in Performance Monitor')
    }

    const platformScore = this.score(
      this.kernel.isLoaded() ? 80 : 0,
      100,
      this.kernel.isLoaded() ? 'Platform loaded' : 'Platform not loaded',
    )

    const architectureScore = this.score(
      (commandBus ? 20 : 0) + (queryBus ? 20 : 0) + (eventBus ? 20 : 0) + (depGraph ? 20 : 0) + (errorCatalog ? 20 : 0),
      100,
      'Architecture completeness',
    )

    const healthScore = this.score(
      Math.min((healthReporter?.getRegisteredChecks().length ?? 0) * 10, 100),
      100,
      'Health check coverage',
    )

    const performanceScore = this.score(
      Math.max(0, 100 - slowOps.length * 10),
      100,
      'Performance based on slow operations',
    )

    const securityScore = this.score(
      (securityManager ? 30 : 0) + (registries.permissions.getAllKeys().length > 0 ? 40 : 0) + (securityManager?.getRoles().length ?? 0 > 0 ? 30 : 0),
      100,
      'Security posture',
    )

    const maintainabilityScore = this.score(
      errorCatalog ? 100 : 0,
      100,
      'Error catalog completeness',
    )

    const dependencyHealth = this.score(
      Math.max(0, 100 - depErrors.length * 25),
      100,
      `${depErrors.length} dependency error(s)`,
    )

    const configurationHealth = this.score(
      config ? 100 : 0,
      100,
      'Configuration validation',
    )

    const driverHealth = this.score(
      container.has('driverRegistry') ? 100 : 0,
      100,
      'Driver registry status',
    )

    const registryHealth = this.score(
      Math.min(registries.navigation.getGroups().length * 5 + registries.permissions.getAllKeys().length + registries.widgets.getWidgets().length * 5, 100),
      100,
      'Registry population',
    )

    const observabilityHealth = this.score(
      (perfMonitor ? 25 : 0) + (healthReporter ? 25 : 0) + (eventBus ? 25 : 0) + (errorCatalog ? 25 : 0),
      100,
      'Observability coverage',
    )

    return {
      timestamp: new Date().toISOString(),
      platformScore, architectureScore, healthScore, performanceScore,
      securityScore, maintainabilityScore, dependencyHealth, configurationHealth,
      driverHealth, registryHealth, observabilityHealth,
      warnings, recommendations,
    }
  }

  private score(value: number, max: number, description: string): HealthScore {
    const percentage = Math.round((value / max) * 100)
    const status = percentage >= 90 ? 'excellent' : percentage >= 70 ? 'good' : percentage >= 50 ? 'fair' : percentage >= 25 ? 'poor' : 'critical'
    return { name: description, value, max, percentage, status }
  }
}
