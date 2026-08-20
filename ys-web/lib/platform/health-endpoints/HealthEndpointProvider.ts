import type { EndpointType, HealthEndpointResponse, HealthEndpointCheck, HealthCheckFn } from './types'

export class HealthEndpointProvider {
  private checks = new Map<EndpointType, HealthCheckFn[]>()
  private version = '1.0.0'
  private startupDone = false
  private readyTime = 0

  constructor() {
    this.checks.set('live', [])
    this.checks.set('ready', [])
    this.checks.set('startup', [])
    this.checks.set('deep', [])
  }

  setVersion(version: string): void {
    this.version = version
  }

  markReady(): void {
    this.startupDone = true
    this.readyTime = Date.now()
  }

  registerCheck(type: EndpointType, fn: HealthCheckFn): void {
    this.checks.get(type)!.push(fn)
  }

  registerLive(key: string, fn: HealthCheckFn): void {
    this.registerCheck('live', fn)
  }

  registerReady(key: string, fn: HealthCheckFn): void {
    this.registerCheck('ready', fn)
  }

  registerStartup(key: string, fn: HealthCheckFn): void {
    this.registerCheck('startup', fn)
  }

  registerDeep(key: string, fn: HealthCheckFn): void {
    this.registerCheck('deep', fn)
  }

  async check(type: EndpointType): Promise<HealthEndpointResponse> {
    const start = Date.now()
    const fns = this.checks.get(type) ?? []

    if (type === 'startup' && this.startupDone) {
      return {
        status: 'ok',
        version: this.version,
        timestamp: new Date().toISOString(),
        duration: 0,
        checks: [{ name: 'startup', status: 'ok', duration: 0, metadata: { startedAt: new Date(this.readyTime).toISOString() } }],
      }
    }

    const results: HealthEndpointCheck[] = []
    for (const fn of fns) {
      try {
        const result = await fn()
        results.push(result)
      } catch (e) {
        results.push({
          name: 'unknown',
          status: 'fail',
          duration: 0,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }

    const duration = Date.now() - start
    const hasFails = results.some(r => r.status === 'fail')
    const hasDegraded = results.some(r => r.status === 'degraded')

    let status: 'ok' | 'degraded' | 'fail'
    if (hasFails) status = 'fail'
    else if (hasDegraded) status = 'degraded'
    else status = 'ok'

    return { status, version: this.version, timestamp: new Date().toISOString(), duration, checks: results }
  }

  async checkLive(): Promise<HealthEndpointResponse> {
    return this.check('live')
  }

  async checkReady(): Promise<HealthEndpointResponse> {
    return this.check('ready')
  }

  async checkStartup(): Promise<HealthEndpointResponse> {
    return this.check('startup')
  }

  async checkDeep(): Promise<HealthEndpointResponse> {
    return this.check('deep')
  }

  getStats() {
    return {
      version: this.version,
      startupDone: this.startupDone,
      uptime: this.startupDone ? Date.now() - this.readyTime : 0,
      liveChecks: this.checks.get('live')!.length,
      readyChecks: this.checks.get('ready')!.length,
      startupChecks: this.checks.get('startup')!.length,
      deepChecks: this.checks.get('deep')!.length,
    }
  }

  clear(): void {
    this.checks.set('live', [])
    this.checks.set('ready', [])
    this.checks.set('startup', [])
    this.checks.set('deep', [])
    this.startupDone = false
    this.readyTime = 0
  }
}
