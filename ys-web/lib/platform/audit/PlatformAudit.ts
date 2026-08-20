import type { ModuleKernel } from '../kernel/ModuleKernel'

export interface AuditFinding {
  category: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  recommendation: string
}

export interface AuditReport {
  generatedAt: string
  findings: AuditFinding[]
  summary: { info: number; warning: number; critical: number; total: number }
}

export class PlatformAudit {
  private kernel: ModuleKernel

  constructor(kernel: ModuleKernel) {
    this.kernel = kernel
  }

  run(): AuditReport {
    const findings: AuditFinding[] = [
      ...this.auditServices(),
      ...this.auditDependencies(),
      ...this.auditRegistries(),
      ...this.auditConfiguration(),
      ...this.auditDrivers(),
    ]

    const info = findings.filter(f => f.severity === 'info').length
    const warning = findings.filter(f => f.severity === 'warning').length
    const critical = findings.filter(f => f.severity === 'critical').length

    return {
      generatedAt: new Date().toISOString(),
      findings,
      summary: { info, warning, critical, total: findings.length },
    }
  }

  private auditServices(): AuditFinding[] {
    const findings: AuditFinding[] = []
    const container = this.kernel.getContainer()
    const services = container.getRegisteredIds()

    if (services.length === 0) {
      findings.push({ category: 'services', severity: 'critical', message: 'No services registered in the container', recommendation: 'Register infrastructure services on bootstrap' })
    }

    const duplicateCheck = new Map<string, number>()
    for (const s of services) {
      duplicateCheck.set(s, (duplicateCheck.get(s) ?? 0) + 1)
    }
    for (const [id, count] of duplicateCheck) {
      if (count > 1) findings.push({ category: 'services', severity: 'warning', message: `Service "${id}" registered ${count} times`, recommendation: 'Use singleton() or check for duplicate registrations' })
    }

    return findings
  }

  private auditDependencies(): AuditFinding[] {
    const findings: AuditFinding[] = []
    const container = this.kernel.getContainer()
    const depGraph = container.has('dependencyGraph') ? container.resolve<any>('dependencyGraph') : null

    if (!depGraph) {
      findings.push({ category: 'dependencies', severity: 'critical', message: 'DependencyGraph not registered', recommendation: 'Register DependencyGraph in the service container' })
      return findings
    }

    const errors = depGraph.validate()
    for (const err of errors) {
      findings.push({
        category: 'dependencies',
        severity: err.type === 'circular' ? 'critical' : 'warning',
        message: err.message,
        recommendation: `Resolve ${err.type} issue between modules`,
      })
    }

    return findings
  }

  private auditRegistries(): AuditFinding[] {
    const findings: AuditFinding[] = []
    const registries = this.kernel.getRegistries()

    const allPerms = registries.permissions.getAllKeys()
    if (allPerms.length === 0) {
      findings.push({ category: 'registries', severity: 'warning', message: 'No permissions registered', recommendation: 'Register permissions for access control' })
    }

    if (registries.navigation.getGroups().length === 0) {
      findings.push({ category: 'registries', severity: 'info', message: 'No navigation groups registered', recommendation: 'Register at least one navigation group' })
    }

    return findings
  }

  private auditConfiguration(): AuditFinding[] {
    const findings: AuditFinding[] = []
    const container = this.kernel.getContainer()
    const config = container.has('config') ? container.resolve<any>('config') : null

    if (config) {
      const errors = config.validate()
      for (const err of errors) {
        findings.push({ category: 'configuration', severity: 'warning', message: `Config validation: ${err.message}`, recommendation: `Fix configuration key: ${err.key}` })
      }
    }

    return findings
  }

  private auditDrivers(): AuditFinding[] {
    const findings: AuditFinding[] = []
    const container = this.kernel.getContainer()
    const driverReg = container.has('driverRegistry') ? container.resolve<any>('driverRegistry') : null

    if (!driverReg) {
      findings.push({ category: 'drivers', severity: 'info', message: 'DriverRegistry not registered', recommendation: 'Services will work but driver tracking is disabled' })
    }

    return findings
  }
}
