import type { SecurityManager } from '../services/SecurityManager'
import type { SecurityHardening } from '../security/hardening'
import type { Logger } from '../services/Logger'
import type { PlatformAudit } from '../audit/PlatformAudit'

export interface SecurityFinding {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  recommendation: string
  affected: string[]
}

export class SecurityReview {
  private logger: Logger
  private securityManager: SecurityManager
  private hardening: SecurityHardening
  private audit: PlatformAudit

  constructor(logger: Logger, securityManager: SecurityManager, hardening: SecurityHardening, audit: PlatformAudit) {
    this.logger = logger
    this.securityManager = securityManager
    this.hardening = hardening
    this.audit = audit
  }

  run(): SecurityFinding[] {
    const findings: SecurityFinding[] = []

    findings.push(...this.reviewAuthentication())
    findings.push(...this.reviewAuthorization())
    findings.push(...this.reviewSessions())
    findings.push(...this.reviewHeaders())
    findings.push(...this.reviewCsp())
    findings.push(...this.reviewSecrets())
    findings.push(...this.reviewRateLimits())
    findings.push(...this.reviewStorageAccess())

    this.logger.info('SecurityReview', `Audit complete: ${findings.length} findings (${findings.filter(f => f.severity === 'critical').length} critical)`)

    return findings
  }

  private reviewAuthentication(): SecurityFinding[] {
    const findings: SecurityFinding[] = []
    const policy = this.hardening.getPasswordPolicy()

    if (policy.minLength < 8) {
      findings.push({
        category: 'Authentication',
        severity: 'high',
        title: 'Weak password policy',
        description: `Minimum password length is ${policy.minLength} characters`,
        recommendation: 'Set minimum password length to at least 8 characters',
        affected: ['PasswordPolicy.minLength', 'SecurityHardening'],
      })
    }

    if (!policy.requireUppercase || !policy.requireLowercase || !policy.requireNumber) {
      findings.push({
        category: 'Authentication',
        severity: 'medium',
        title: 'Password complexity requirements incomplete',
        description: 'Password policy should require uppercase, lowercase, and numeric characters',
        recommendation: 'Enable all password complexity requirements',
        affected: ['PasswordPolicy'],
      })
    }

    return findings
  }

  private reviewAuthorization(): SecurityFinding[] {
    return []
  }

  private reviewSessions(): SecurityFinding[] {
    const findings: SecurityFinding[] = []
    const policy = this.hardening.getSessionPolicy()

    if (policy.maxLifetime > 86400) {
      findings.push({
        category: 'Sessions',
        severity: 'medium',
        title: 'Long session lifetime',
        description: `Session max lifetime is ${policy.maxLifetime}s (${policy.maxLifetime / 86400} days)`,
        recommendation: 'Reduce session lifetime to 24 hours or less',
        affected: ['SessionPolicy.maxLifetime'],
      })
    }

    if (!policy.requireMfa) {
      findings.push({
        category: 'Sessions',
        severity: 'medium',
        title: 'Multi-factor authentication not required',
        description: 'MFA is not enforced for administrative sessions',
        recommendation: 'Enable MFA requirement for admin sessions',
        affected: ['SessionPolicy.requireMfa'],
      })
    }

    return findings
  }

  private reviewHeaders(): SecurityFinding[] {
    const findings: SecurityFinding[] = []
    const headers = this.hardening.getHeaders()
    const hasHsts = headers.some(h => h.header.toLowerCase() === 'strict-transport-security')
    const hasXfo = headers.some(h => h.header.toLowerCase() === 'x-frame-options')

    if (!hasHsts) {
      findings.push({
        category: 'Headers',
        severity: 'medium',
        title: 'HSTS header missing',
        description: 'Strict-Transport-Security header is not configured',
        recommendation: 'Add HSTS header with max-age=31536000; includeSubDomains',
        affected: ['SecurityHardening.headers'],
      })
    }

    if (!hasXfo) {
      findings.push({
        category: 'Headers',
        severity: 'low',
        title: 'X-Frame-Options header missing',
        description: 'Clickjacking protection header is not set',
        recommendation: 'Add X-Frame-Options: DENY header',
        affected: ['SecurityHardening.headers'],
      })
    }

    return findings
  }

  private reviewCsp(): SecurityFinding[] {
    const findings: SecurityFinding[] = []
    const cspString = this.hardening.getCspString()

    if (!cspString) {
      findings.push({
        category: 'CSP',
        severity: 'high',
        title: 'Content Security Policy not configured',
        description: 'No CSP directives have been defined',
        recommendation: 'Implement a CSP policy with script-src, style-src, and object-src directives',
        affected: ['SecurityHardening.cspDirectives'],
      })
    }

    return findings
  }

  private reviewSecrets(): SecurityFinding[] {
    const findings: SecurityFinding[] = []

    findings.push({
      category: 'Secrets',
      severity: 'low',
      title: 'Secrets should use environment variables or vault',
      description: 'Ensure all secrets use env-based or vault-based storage, never hardcoded',
      recommendation: 'Use SecretsManager with env or vault provider',
      affected: ['SecretsManager', '.env'],
    })

    return findings
  }

  private reviewRateLimits(): SecurityFinding[] {
    return []
  }

  private reviewStorageAccess(): SecurityFinding[] {
    return []
  }

  generateReport(findings: SecurityFinding[]): string {
    const critical = findings.filter(f => f.severity === 'critical').length
    const high = findings.filter(f => f.severity === 'high').length
    const medium = findings.filter(f => f.severity === 'medium').length
    const low = findings.filter(f => f.severity === 'low').length

    let report = '=== SECURITY REVIEW REPORT ===\n\n'
    report += `Date: ${new Date().toISOString()}\n`
    report += `Total Findings: ${findings.length}\n`
    report += `  Critical: ${critical}\n`
    report += `  High: ${high}\n`
    report += `  Medium: ${medium}\n`
    report += `  Low: ${low}\n\n`

    for (const f of findings) {
      report += `[${f.severity.toUpperCase()}] ${f.category}: ${f.title}\n`
      report += `  ${f.description}\n`
      report += `  Recommendation: ${f.recommendation}\n`
      report += `  Affected: ${f.affected.join(', ')}\n\n`
    }

    return report
  }
}
