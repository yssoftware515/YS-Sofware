import type { EventBus } from '../services/EventBus'
import type { Logger } from '../services/Logger'
import type { AuditEngine } from '../services/AuditEngine'
import type { MonitoringCenter } from '../monitoring/MonitoringCenter'
import type { PerformanceCenter } from '../performance/PerformanceCenter'
import type { HealthReporter } from '../services/HealthReporter'
import type { PlatformReport } from '../reports/PlatformReport'
import type { HealthEndpointProvider } from '../health-endpoints/HealthEndpointProvider'
import type { EnvironmentManager } from '../environment/EnvironmentManager'
import type { SecretsManager } from '../secrets/SecretsManager'
import type { ReleaseManager } from '../release/ReleaseManager'
import type { RecoveryManager } from '../recovery/RecoveryManager'
import type { InstallationWizard } from '../installer/InstallationWizard'

interface ObservabilityServices {
  logger: Logger
  eventBus: EventBus
  auditEngine: AuditEngine
  monitoringCenter: MonitoringCenter
  performanceCenter: PerformanceCenter
  healthReporter: HealthReporter
  platformReport: PlatformReport
  healthEndpointProvider: HealthEndpointProvider
  environmentManager: EnvironmentManager
  secretsManager: SecretsManager
  releaseManager: ReleaseManager
  recoveryManager: RecoveryManager
  installationWizard: InstallationWizard
}

const REGISTERED_EVENTS: Array<{ source: string; event: string; description: string }> = []

export function registerObservabilityEvent(source: string, event: string, description: string): void {
  REGISTERED_EVENTS.push({ source, event, description })
}

export function getRegisteredEvents(): Array<{ source: string; event: string; description: string }> {
  return [...REGISTERED_EVENTS]
}

export function wirePlatformObservability(services: ObservabilityServices): void {
  const { logger, eventBus, auditEngine, monitoringCenter, healthEndpointProvider } = services

  registerObservabilityEvent('environment', 'environment.validation', 'Environment variable validation completed')
  registerObservabilityEvent('secrets', 'secrets.validated', 'Secrets validation completed')
  registerObservabilityEvent('health', 'health.check', 'Health endpoint checked')
  registerObservabilityEvent('release', 'release.created', 'New release created')
  registerObservabilityEvent('release', 'release.deployed', 'Release deployed to environment')
  registerObservabilityEvent('release', 'release.rolled_back', 'Release rolled back')
  registerObservabilityEvent('recovery', 'recovery.simulated', 'Recovery simulation completed')
  registerObservabilityEvent('recovery', 'recovery.executed', 'Recovery execution completed')
  registerObservabilityEvent('installer', 'installer.completed', 'Installation wizard completed')

  const originalEnvValidate = services.environmentManager.validate.bind(services.environmentManager)
  services.environmentManager.validate = (source: (key: string) => string | undefined) => {
    const report = originalEnvValidate(source)
    eventBus.emit('environment.validation', { passed: report.passed, errors: report.errors, warnings: report.warnings })
    if (report.errors > 0) logger.warning('Observability', `Environment validation failed: ${report.errors} error(s)`)
    return report
  }

  const originalSecretsValidate = services.secretsManager.validate.bind(services.secretsManager)
  services.secretsManager.validate = () => {
    const result = originalSecretsValidate()
    eventBus.emit('secrets.validated', { valid: result.valid, missing: result.missing })
    if (!result.valid) logger.warning('Observability', `Secrets validation: ${result.missing.length} missing`)
    return result
  }

  const originalReleaseCreate = services.releaseManager.create.bind(services.releaseManager)
  services.releaseManager.create = (options) => {
    const release = originalReleaseCreate(options)
    eventBus.emit('release.created', { version: release.version, id: release.id })
    auditEngine.record({ action: 'created', actorId: options.author, entityType: 'release', entityId: release.id, moduleId: 'core', newValues: { version: release.version } })
    monitoringCenter.record('release.created', 1, 'count')
    return release
  }

  const originalReleaseDeploy = services.releaseManager.markDeployed.bind(services.releaseManager)
  services.releaseManager.markDeployed = (id) => {
    const release = originalReleaseDeploy(id)
    eventBus.emit('release.deployed', { version: release.version, id: release.id })
    auditEngine.record({ action: 'custom', actorId: 'system', entityType: 'release', entityId: release.id, moduleId: 'core', newValues: { version: release.version, status: 'deployed' } })
    return release
  }

  const originalRecoveryExecute = services.recoveryManager.execute.bind(services.recoveryManager)
  services.recoveryManager.execute = async (planId) => {
    const execution = await originalRecoveryExecute(planId)
    eventBus.emit('recovery.executed', { planId, status: execution.status, duration: execution.duration })
    auditEngine.record({ action: 'custom', actorId: 'system', entityType: 'recovery', entityId: planId, moduleId: 'core', newValues: { status: execution.status } })
    return execution
  }

  const originalHealthCheck = healthEndpointProvider.check.bind(healthEndpointProvider)
  healthEndpointProvider.check = async (type) => {
    const response = await originalHealthCheck(type)
    monitoringCenter.record(`health.${type}.duration`, response.duration, 'ms')
    monitoringCenter.record(`health.${type}.status`, response.status === 'ok' ? 1 : 0, 'count')
    return response
  }

  logger.info('Observability', 'Platform observability wiring completed')
  logger.info('Observability', `Registered ${REGISTERED_EVENTS.length} observable events`)
}
