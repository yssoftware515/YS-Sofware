import type { ModuleKernel } from '../kernel/ModuleKernel'
import type { ExtensionProposal, ValidationReport, ValidationCheck, ValidationVerdict } from './types'

export class ExtensionValidator {
  private kernel: ModuleKernel

  constructor(kernel: ModuleKernel) {
    this.kernel = kernel
  }

  validate(proposal: ExtensionProposal): ValidationReport {
    const checks: ValidationCheck[] = [
      this.checkManifest(proposal),
      this.checkModuleId(proposal),
      this.checkDependencies(proposal),
      this.checkPermissions(proposal),
      this.checkCommands(proposal),
      this.checkQueries(proposal),
      this.checkEvents(proposal),
      this.checkDrivers(proposal),
    ]

    const pass = checks.filter(c => c.verdict === 'pass').length
    const warning = checks.filter(c => c.verdict === 'warning').length
    const fail = checks.filter(c => c.verdict === 'fail').length

    const overall: ValidationVerdict = fail > 0 ? 'fail' : warning > 0 ? 'warning' : 'pass'

    return { overall, timestamp: new Date().toISOString(), checks, summary: { pass, warning, fail } }
  }

  private checkManifest(proposal: ExtensionProposal): ValidationCheck {
    if (!proposal.id) return { name: 'Manifest ID', category: 'manifest', verdict: 'fail', message: 'Extension must have an ID' }
    if (!proposal.version) return { name: 'Manifest Version', category: 'manifest', verdict: 'fail', message: 'Extension must have a version' }
    return { name: 'Manifest Complete', category: 'manifest', verdict: 'pass', message: `Extension "${proposal.id}" v${proposal.version} is valid` }
  }

  private checkModuleId(proposal: ExtensionProposal): ValidationCheck {
    const exists = this.kernel.getModules().some(m => m.manifest.id === proposal.id)
    if (exists) return { name: 'Module ID Unique', category: 'manifest', verdict: 'fail', message: `Module ID "${proposal.id}" is already registered` }
    return { name: 'Module ID Unique', category: 'manifest', verdict: 'pass', message: `Module ID "${proposal.id}" is available` }
  }

  private checkDependencies(proposal: ExtensionProposal): ValidationCheck {
    if (!proposal.dependencies || proposal.dependencies.length === 0) {
      return { name: 'Dependencies', category: 'dependencies', verdict: 'pass', message: 'No dependencies required' }
    }

    const missing: string[] = []
    for (const dep of proposal.dependencies) {
      const found = this.kernel.getModules().some(m => m.manifest.id === dep.moduleId)
      if (!found) missing.push(dep.moduleId)
    }

    if (missing.length > 0) {
      return { name: 'Dependencies', category: 'dependencies', verdict: 'fail', message: `Missing dependencies: ${missing.join(', ')}` }
    }

    return { name: 'Dependencies', category: 'dependencies', verdict: 'pass', message: 'All dependencies satisfied' }
  }

  private checkPermissions(proposal: ExtensionProposal): ValidationCheck {
    if (!proposal.permissions || proposal.permissions.length === 0) {
      return { name: 'Permissions', category: 'permissions', verdict: 'pass', message: 'No permissions declared' }
    }

    const registries = this.kernel.getRegistries()
    const existing = registries.permissions.getAllKeys()
    const duplicates = proposal.permissions.filter(p => existing.includes(p))

    if (duplicates.length > 0) {
      return { name: 'Permissions', category: 'permissions', verdict: 'warning', message: `Duplicate permission keys: ${duplicates.join(', ')}` }
    }

    return { name: 'Permissions', category: 'permissions', verdict: 'pass', message: `${proposal.permissions.length} permission(s) OK` }
  }

  private checkCommands(proposal: ExtensionProposal): ValidationCheck {
    if (!proposal.commands || proposal.commands.length === 0) {
      return { name: 'Commands', category: 'commands', verdict: 'pass', message: 'No commands declared' }
    }

    const container = this.kernel.getContainer()
    const commandBus = container.has('commandBus') ? container.resolve<any>('commandBus') : null
    const duplicates = proposal.commands.filter(c => commandBus?.hasHandler(c))

    if (duplicates.length > 0) {
      return { name: 'Commands', category: 'commands', verdict: 'warning', message: `Command handlers already exist for: ${duplicates.join(', ')}` }
    }

    return { name: 'Commands', category: 'commands', verdict: 'pass', message: `${proposal.commands.length} command(s) OK` }
  }

  private checkQueries(proposal: ExtensionProposal): ValidationCheck {
    if (!proposal.queries || proposal.queries.length === 0) {
      return { name: 'Queries', category: 'queries', verdict: 'pass', message: 'No queries declared' }
    }

    const container = this.kernel.getContainer()
    const queryBus = container.has('queryBus') ? container.resolve<any>('queryBus') : null
    const duplicates = proposal.queries.filter(q => queryBus?.hasHandler(q))

    if (duplicates.length > 0) {
      return { name: 'Queries', category: 'queries', verdict: 'warning', message: `Query handlers already exist for: ${duplicates.join(', ')}` }
    }

    return { name: 'Queries', category: 'queries', verdict: 'pass', message: `${proposal.queries.length} query(ies) OK` }
  }

  private checkEvents(proposal: ExtensionProposal): ValidationCheck {
    if (!proposal.events || proposal.events.length === 0) {
      return { name: 'Events', category: 'events', verdict: 'pass', message: 'No events declared' }
    }
    return { name: 'Events', category: 'events', verdict: 'pass', message: `${proposal.events.length} event(s) OK` }
  }

  private checkDrivers(proposal: ExtensionProposal): ValidationCheck {
    if (!proposal.drivers || proposal.drivers.length === 0) {
      return { name: 'Drivers', category: 'drivers', verdict: 'pass', message: 'No drivers declared' }
    }

    const container = this.kernel.getContainer()
    const driverReg = container.has('driverRegistry') ? container.resolve<any>('driverRegistry') : null

    const conflicts: string[] = []
    for (const d of proposal.drivers) {
      const existing = driverReg?.getInfo(d.category as any, d.name)
      if (existing) conflicts.push(`${d.category}/${d.name}`)
    }

    if (conflicts.length > 0) {
      return { name: 'Drivers', category: 'drivers', verdict: 'warning', message: `Driver conflicts: ${conflicts.join(', ')}` }
    }

    return { name: 'Drivers', category: 'drivers', verdict: 'pass', message: `${proposal.drivers.length} driver(s) OK` }
  }
}
