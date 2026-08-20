export interface CspDirective {
  name: string
  sources: string[]
}

export interface SecurityHeader {
  header: string
  value: string
}

export interface SessionPolicy {
  maxLifetime: number
  idleTimeout: number
  singleSession: boolean
  requireMfa: boolean
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecial: boolean
  maxAge: number
  historyCount: number
}

export class SecurityHardening {
  private cspDirectives: CspDirective[] = []
  private headers: SecurityHeader[] = []
  private trustedDomains: string[] = []
  private sessionPolicy: SessionPolicy = {
    maxLifetime: 86400,
    idleTimeout: 1800,
    singleSession: true,
    requireMfa: false,
  }
  private passwordPolicy: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false,
    maxAge: 90,
    historyCount: 5,
  }

  setCspDirective(directive: CspDirective): void {
    const existing = this.cspDirectives.findIndex(d => d.name === directive.name)
    if (existing >= 0) this.cspDirectives[existing] = directive
    else this.cspDirectives.push(directive)
  }

  getCspDirective(name: string): CspDirective | undefined {
    return this.cspDirectives.find(d => d.name === name)
  }

  getCspString(): string {
    return this.cspDirectives.map(d => `${d.name} ${d.sources.join(' ')}`).join('; ')
  }

  setHeader(header: SecurityHeader): void {
    const existing = this.headers.findIndex(h => h.header === header.header)
    if (existing >= 0) this.headers[existing] = header
    else this.headers.push(header)
  }

  removeHeader(header: string): void {
    this.headers = this.headers.filter(h => h.header !== header)
  }

  getHeaders(): SecurityHeader[] {
    return [...this.headers]
  }

  addTrustedDomain(domain: string): void {
    if (!this.trustedDomains.includes(domain)) this.trustedDomains.push(domain)
  }

  removeTrustedDomain(domain: string): void {
    this.trustedDomains = this.trustedDomains.filter(d => d !== domain)
  }

  getTrustedDomains(): string[] {
    return [...this.trustedDomains]
  }

  isTrustedDomain(domain: string): boolean {
    return this.trustedDomains.some(d => domain.endsWith(d))
  }

  setSessionPolicy(policy: Partial<SessionPolicy>): void {
    this.sessionPolicy = { ...this.sessionPolicy, ...policy }
  }

  getSessionPolicy(): SessionPolicy {
    return { ...this.sessionPolicy }
  }

  setPasswordPolicy(policy: Partial<PasswordPolicy>): void {
    this.passwordPolicy = { ...this.passwordPolicy, ...policy }
  }

  getPasswordPolicy(): PasswordPolicy {
    return { ...this.passwordPolicy }
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const p = this.passwordPolicy
    if (password.length < p.minLength) errors.push(`Minimum ${p.minLength} characters required`)
    if (p.requireUppercase && !/[A-Z]/.test(password)) errors.push('Uppercase letter required')
    if (p.requireLowercase && !/[a-z]/.test(password)) errors.push('Lowercase letter required')
    if (p.requireNumber && !/\d/.test(password)) errors.push('Number required')
    if (p.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Special character required')
    return { valid: errors.length === 0, errors }
  }

  getDefaultHeaders(): SecurityHeader[] {
    return [
      { header: 'X-Content-Type-Options', value: 'nosniff' },
      { header: 'X-Frame-Options', value: 'DENY' },
      { header: 'X-XSS-Protection', value: '1; mode=block' },
      { header: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { header: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]
  }

  getStats() {
    return {
      cspDirectives: this.cspDirectives.length,
      customHeaders: this.headers.length,
      trustedDomains: this.trustedDomains.length,
      sessionPolicy: this.sessionPolicy,
      passwordPolicy: this.passwordPolicy,
    }
  }

  clear(): void {
    this.cspDirectives = []
    this.headers = []
    this.trustedDomains = []
  }
}
