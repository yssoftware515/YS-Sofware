import type { PlatformModule } from '../contracts/ModuleManifest'
import { NavigationRegistry } from '../registries/NavigationRegistry'
import { PermissionRegistry } from '../registries/PermissionRegistry'
import { WidgetRegistry } from '../registries/WidgetRegistry'
import { SettingsRegistry } from '../registries/SettingsRegistry'
import { SearchRegistry } from '../registries/SearchRegistry'
import { SeoRegistry } from '../registries/SeoRegistry'
import { FeatureFlagRegistry } from '../registries/FeatureFlagRegistry'
import { SchedulerRegistry } from '../registries/SchedulerRegistry'
import { ServiceContainer } from '../services/ServiceContainer'
import { Logger, createConsoleTransport } from '../services/Logger'
import { PlatformConfig } from '../services/PlatformConfig'
import { EventBus } from '../services/EventBus'
import { NotificationBus } from '../services/NotificationBus'
import { AuditEngine } from '../services/AuditEngine'
import { HealthReporter } from '../services/HealthReporter'
import { PerformanceMonitor } from '../services/PerformanceMonitor'
import { SecurityManager } from '../services/SecurityManager'
import { FeatureFlagEngine } from '../engine/FeatureFlagEngine'
import { DependencyGraph } from '../engine/DependencyGraph'
import { CommandBus } from '../bus/CommandBus'
import { QueryBus } from '../bus/QueryBus'
import { CacheManager } from '../cache/CacheManager'
import { MemoryDriver } from '../cache/drivers/MemoryDriver'
import { NullDriver } from '../cache/drivers/NullDriver'
import { StorageManager } from '../storage/StorageManager'
import { LocalDriver } from '../storage/drivers/LocalDriver'
import { MailManager } from '../mail/MailManager'
import { SmtpDriver } from '../mail/drivers/SmtpDriver'
import { SearchEngine } from '../search/SearchEngine'
import { DatabaseDriver } from '../search/drivers/DatabaseDriver'
import { DriverRegistry } from '../drivers/DriverRegistry'
import { ModuleGenerator } from '../generator/ModuleGenerator'
import { ObservabilityManager } from '../observability/ObservabilityManager'
import { PlatformManifest } from '../manifest/PlatformManifest'
import { RuntimeInspector } from '../inspector/RuntimeInspector'
import { SnapshotGenerator } from '../snapshot/SnapshotGenerator'
import { ErrorCatalog, defaultErrorCodes } from '../errors/ErrorCatalog'
import { LifecycleMonitor } from '../lifecycle/LifecycleMonitor'
import { ExtensionValidator } from '../validator/ExtensionValidator'
import { CompatibilityEngine } from '../compatibility/CompatibilityEngine'
import { ConfigurationInspector } from '../config/ConfigurationInspector'
import { ServiceGraph } from '../graph/ServiceGraph'
import { PlatformReport } from '../reports/PlatformReport'
import { PlatformAudit } from '../audit/PlatformAudit'
import { OperationalHealthCenter } from '../health/OperationalHealthCenter'
import { QueueManager } from '../queue/QueueManager'
import { SyncDriver } from '../queue/drivers/SyncDriver'
import { WorkerManager } from '../worker/WorkerManager'
import { EnterpriseScheduler } from '../scheduler/EnterpriseScheduler'
import { MediaManager } from '../media/MediaManager'
import { LocalDriver as LocalMediaDriver } from '../media/drivers/LocalMediaDriver'
import { StoragePolicyManager } from '../storage/policies'
import { BackupManager } from '../backup/BackupManager'
import { LogCenter } from '../logs/LogCenter'
import { MonitoringCenter } from '../monitoring/MonitoringCenter'
import { MaintenanceManager } from '../maintenance/MaintenanceManager'
import { DeploymentCenter } from '../deployments/DeploymentCenter'
import { UpdateCenter } from '../updates/UpdateCenter'
import { PerformanceCenter } from '../performance/PerformanceCenter'
import { SecurityHardening } from '../security/hardening'
import { EnvironmentManager } from '../environment/EnvironmentManager'
import { SecretsManager } from '../secrets/SecretsManager'
import { HealthEndpointProvider } from '../health-endpoints/HealthEndpointProvider'
import { ReleaseManager } from '../release/ReleaseManager'
import { RecoveryManager } from '../recovery/RecoveryManager'
import { InstallationWizard } from '../installer/InstallationWizard'
import { SecurityReview } from '../reviews/SecurityReview'
import { PerformanceReview } from '../reviews/PerformanceReview'
import { wirePlatformObservability } from '../observability/PlatformObservability'

export interface KernelRegistries {
  navigation: NavigationRegistry
  permissions: PermissionRegistry
  widgets: WidgetRegistry
  settings: SettingsRegistry
  search: SearchRegistry
  seo: SeoRegistry
  featureFlags: FeatureFlagRegistry
  scheduler: SchedulerRegistry
}

export class ModuleKernel {
  private registries: KernelRegistries
  private container: ServiceContainer
  private loaded = false
  private booted = false
  private modules: PlatformModule[] = []

  constructor() {
    this.registries = {
      navigation: new NavigationRegistry(),
      permissions: new PermissionRegistry(),
      widgets: new WidgetRegistry(),
      settings: new SettingsRegistry(),
      search: new SearchRegistry(),
      seo: new SeoRegistry(),
      featureFlags: new FeatureFlagRegistry(),
      scheduler: new SchedulerRegistry(),
    }
    this.container = new ServiceContainer()
  }

  getRegistries(): KernelRegistries {
    return this.registries
  }

  getRegistry<K extends keyof KernelRegistries>(key: K): KernelRegistries[K] {
    return this.registries[key]
  }

  getContainer(): ServiceContainer {
    return this.container
  }

  resolve<T>(id: string): T {
    return this.container.resolve<T>(id)
  }

  hasService(id: string): boolean {
    return this.container.has(id)
  }

  isLoaded(): boolean {
    return this.loaded
  }

  isBooted(): boolean {
    return this.booted
  }

  getModules(): PlatformModule[] {
    return [...this.modules]
  }

  private registerInfrastructureServices(): void {
    const logger = new Logger()
    logger.addTransport(createConsoleTransport())
    this.container.singleton('logger', () => logger)
    this.container.singleton('config', () => new PlatformConfig())
    this.container.singleton('eventBus', () => new EventBus())
    this.container.singleton('notificationBus', () => new NotificationBus())
    this.container.singleton('auditEngine', () => new AuditEngine())
    this.container.singleton('healthReporter', () => new HealthReporter())
    this.container.singleton('performanceMonitor', () => new PerformanceMonitor())
    this.container.singleton('securityManager', () => new SecurityManager())
    this.container.singleton('featureFlagEngine', () => new FeatureFlagEngine())
    this.container.singleton('dependencyGraph', () => new DependencyGraph())
    this.container.singleton('commandBus', () => new CommandBus())
    this.container.singleton('queryBus', () => new QueryBus())
    this.container.singleton('cacheManager', () => new CacheManager(new MemoryDriver()))
    this.container.singleton('storageManager', () => new StorageManager())
    this.container.singleton('mailManager', () => new MailManager())
    this.container.singleton('searchEngine', () => new SearchEngine(new DatabaseDriver()))
    this.container.singleton('driverRegistry', () => new DriverRegistry())
    this.container.singleton('moduleGenerator', () => new ModuleGenerator())
    this.container.singleton('observabilityManager', () => new ObservabilityManager())
    this.container.singleton('platformManifest', () => new PlatformManifest(this))
    this.container.singleton('runtimeInspector', () => new RuntimeInspector(this))
    this.container.singleton('lifecycleMonitor', () => new LifecycleMonitor())
    this.container.singleton('errorCatalog', () => {
      const catalog = new ErrorCatalog()
      catalog.registerMany(defaultErrorCodes)
      return catalog
    })
    this.container.singleton('extensionValidator', () => new ExtensionValidator(this))
    this.container.singleton('compatibilityEngine', () => new CompatibilityEngine())
    this.container.singleton('configurationInspector', () => new ConfigurationInspector(this))
    this.container.singleton('serviceGraph', () => new ServiceGraph(this))
    this.container.singleton('operationalHealthCenter', () => new OperationalHealthCenter(this))
    this.container.singleton('platformAudit', () => new PlatformAudit(this))
    this.container.singleton('queueManager', () => new QueueManager(new SyncDriver()))
    this.container.singleton('workerManager', () => new WorkerManager())
    this.container.singleton('enterpriseScheduler', () => new EnterpriseScheduler(this.registries.scheduler))
    this.container.singleton('mediaManager', () => new MediaManager(new LocalMediaDriver()))
    this.container.singleton('storagePolicyManager', () => new StoragePolicyManager())
    this.container.singleton('backupManager', () => new BackupManager())
    this.container.singleton('logCenter', () => new LogCenter())
    this.container.singleton('monitoringCenter', () => new MonitoringCenter())
    this.container.singleton('maintenanceManager', () => new MaintenanceManager())
    this.container.singleton('deploymentCenter', () => new DeploymentCenter())
    this.container.singleton('updateCenter', () => new UpdateCenter())
    this.container.singleton('performanceCenter', () => new PerformanceCenter())
    this.container.singleton('securityHardening', () => new SecurityHardening())
    this.container.singleton('environmentManager', () => new EnvironmentManager())
    this.container.singleton('secretsManager', () => new SecretsManager())
    this.container.singleton('healthEndpointProvider', () => new HealthEndpointProvider())
    this.container.singleton('releaseManager', () => new ReleaseManager())
    this.container.singleton('recoveryManager', () => new RecoveryManager())
    this.container.singleton('installationWizard', () => new InstallationWizard())
  }

  private registerReviewServices(): void {
    const logger = this.resolve<Logger>('logger')
    const securityManager = this.resolve<SecurityManager>('securityManager')
    const securityHardening = this.resolve<SecurityHardening>('securityHardening')
    const platformAudit = this.resolve<PlatformAudit>('platformAudit')
    const performanceCenter = this.resolve<PerformanceCenter>('performanceCenter')
    const monitoringCenter = this.resolve<MonitoringCenter>('monitoringCenter')
    const config = this.resolve<PlatformConfig>('config')

    this.container.singleton('securityReview', () => new SecurityReview(logger, securityManager, securityHardening, platformAudit))
    this.container.singleton('performanceReview', () => new PerformanceReview(logger, performanceCenter, monitoringCenter, config))
  }

  private wireObservability(): void {
    wirePlatformObservability({
      logger: this.resolve<Logger>('logger'),
      eventBus: this.resolve<EventBus>('eventBus'),
      auditEngine: this.resolve<AuditEngine>('auditEngine'),
      monitoringCenter: this.resolve<MonitoringCenter>('monitoringCenter'),
      performanceCenter: this.resolve<PerformanceCenter>('performanceCenter'),
      healthReporter: this.resolve<HealthReporter>('healthReporter'),
      platformReport: this.resolve<PlatformReport>('platformReport'),
      healthEndpointProvider: this.resolve<HealthEndpointProvider>('healthEndpointProvider'),
      environmentManager: this.resolve<EnvironmentManager>('environmentManager'),
      secretsManager: this.resolve<SecretsManager>('secretsManager'),
      releaseManager: this.resolve<ReleaseManager>('releaseManager'),
      recoveryManager: this.resolve<RecoveryManager>('recoveryManager'),
      installationWizard: this.resolve<InstallationWizard>('installationWizard'),
    })
  }

  private registerSnapshotGenerator(): void {
    const manifest = this.resolve<PlatformManifest>('platformManifest')
    const inspector = this.resolve<RuntimeInspector>('runtimeInspector')
    this.container.singleton('snapshotGenerator', () => new SnapshotGenerator(this, manifest, inspector))
    this.container.singleton('platformReport', () => new PlatformReport(this, manifest, inspector))
  }

  loadModules(moduleList: PlatformModule[]): void {
    if (this.loaded) return

    this.registerInfrastructureServices()
    this.registerReviewServices()
    this.registerSnapshotGenerator()
    const logger = this.resolve<Logger>('logger')
    const eventBus = this.resolve<EventBus>('eventBus')
    const depGraph = this.resolve<DependencyGraph>('dependencyGraph')

    for (const mod of moduleList) {
      depGraph.addNode(mod.manifest.id, mod.manifest.dependencies ?? [], mod.manifest.enabled, mod.manifest.version)
    }

    const validationErrors = depGraph.validate()
    if (validationErrors.length > 0) {
      for (const err of validationErrors) {
        logger.warning('Kernel', `Dependency validation: ${err.message}`)
      }
    }

    for (const mod of moduleList) {
      if (mod.manifest.enabled && mod.register) {
        logger.info('Kernel', `Registering module: ${mod.manifest.id}`)
        mod.register(this)
      }
      this.modules.push(mod)
    }

    this.loaded = true
    this.bootModules()
    eventBus.emit('kernel.loaded', { moduleCount: moduleList.length })
  }

  private async bootModules(): Promise<void> {
    if (this.booted) return
    const logger = this.resolve<Logger>('logger')
    const eventBus = this.resolve<EventBus>('eventBus')

    for (const mod of this.modules) {
      if (mod.manifest.enabled && mod.boot) {
        try {
          logger.info('Kernel', `Booting module: ${mod.manifest.id}`)
          await mod.boot(this)
        } catch (e) {
          logger.error('Kernel', `Failed to boot module ${mod.manifest.id}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }

    this.booted = true
    eventBus.emit('kernel.booted', {})
    this.wireObservability()
  }

  async shutdownModules(): Promise<void> {
    const logger = this.resolve<Logger>('logger')
    const eventBus = this.resolve<EventBus>('eventBus')
    eventBus.emit('kernel.shuttingDown', {})

    for (const mod of this.modules.reverse()) {
      if (mod.shutdown) {
        try {
          logger.info('Kernel', `Shutting down module: ${mod.manifest.id}`)
          await mod.shutdown(this)
        } catch (e) {
          logger.error('Kernel', `Shutdown error for ${mod.manifest.id}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
      eventBus.offModuleAll(mod.manifest.id)
    }

    this.booted = false
    this.loaded = false
  }

  async installModule(mod: PlatformModule): Promise<void> {
    if (mod.install) {
      const result = await mod.install(this)
      if (result && !result.success) throw new Error(result.error ?? 'Install failed')
    }
    this.modules.push(mod)
    if (mod.manifest.enabled && mod.register) {
      mod.register(this)
    }
  }

  async upgradeModule(mod: PlatformModule, fromVersion: string): Promise<void> {
    if (mod.upgrade) {
      const result = await mod.upgrade(this, fromVersion)
      if (result && !result.success) throw new Error(result.error ?? 'Upgrade failed')
    }
  }

  reset(): void {
    for (const key of Object.keys(this.registries) as (keyof KernelRegistries)[]) {
      this.registries[key].clear()
    }
    this.container.clear()
    this.modules = []
    this.loaded = false
    this.booted = false
  }
}
