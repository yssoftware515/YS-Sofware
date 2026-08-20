export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'offline' | 'unknown'

export interface HealthCheck {
  id: string
  label: string
  moduleId: string
  status: HealthStatus
  responseTime?: number
  lastCheck?: string
  reason?: string
  check: () => Promise<HealthStatus> | HealthStatus
}

export interface HealthReport {
  status: HealthStatus
  checks: HealthCheckResult[]
  timestamp: string
}

export interface HealthCheckResult {
  id: string
  label: string
  moduleId: string
  status: HealthStatus
  responseTime?: number
  lastCheck: string
  reason?: string
}

export class HealthReporter {
  private checks: HealthCheck[] = []
  private cachedResults = new Map<string, HealthCheckResult>()
  private cacheTtl = 30000

  registerCheck(check: HealthCheck): void {
    const existing = this.checks.findIndex(c => c.id === check.id)
    if (existing >= 0) {
      this.checks[existing] = check
    } else {
      this.checks.push(check)
    }
  }

  async runCheck(id: string): Promise<HealthCheckResult> {
    const check = this.checks.find(c => c.id === id)
    if (!check) {
      return { id, label: id, moduleId: '', status: 'unknown', lastCheck: new Date().toISOString(), reason: 'Check not registered' }
    }

    const start = performance.now()
    try {
      const status = await check.check()
      const responseTime = performance.now() - start
      const result: HealthCheckResult = {
        id: check.id, label: check.label, moduleId: check.moduleId,
        status, responseTime: Math.round(responseTime),
        lastCheck: new Date().toISOString(), reason: check.reason,
      }
      this.cachedResults.set(id, result)
      return result
    } catch (e) {
      const responseTime = performance.now() - start
      const result: HealthCheckResult = {
        id: check.id, label: check.label, moduleId: check.moduleId,
        status: 'critical', responseTime: Math.round(responseTime),
        lastCheck: new Date().toISOString(),
        reason: e instanceof Error ? e.message : String(e),
      }
      this.cachedResults.set(id, result)
      return result
    }
  }

  async runAllChecks(): Promise<HealthReport> {
    const results: HealthCheckResult[] = []
    for (const check of this.checks) {
      results.push(await this.runCheck(check.id))
    }
    return {
      status: this.overallStatus(results),
      checks: results,
      timestamp: new Date().toISOString(),
    }
  }

  getCachedResult(id: string): HealthCheckResult | undefined {
    const cached = this.cachedResults.get(id)
    if (!cached) return undefined
    const age = Date.now() - new Date(cached.lastCheck).getTime()
    if (age > this.cacheTtl) return undefined
    return cached
  }

  getCachedReport(): HealthReport | undefined {
    if (this.cachedResults.size === 0) return undefined
    const results = Array.from(this.cachedResults.values())
    return { status: this.overallStatus(results), checks: results, timestamp: new Date().toISOString() }
  }

  getRegisteredChecks(): HealthCheck[] {
    return [...this.checks]
  }

  clearCache(): void {
    this.cachedResults.clear()
  }

  private overallStatus(results: HealthCheckResult[]): HealthStatus {
    if (results.some(r => r.status === 'critical')) return 'critical'
    if (results.some(r => r.status === 'offline')) return 'offline'
    if (results.some(r => r.status === 'warning')) return 'warning'
    if (results.some(r => r.status === 'unknown')) return 'unknown'
    return 'healthy'
  }
}
