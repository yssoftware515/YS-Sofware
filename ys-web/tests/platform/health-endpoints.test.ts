import { describe, it, expect } from 'vitest'
import { HealthEndpointProvider } from '@/lib/platform/health-endpoints/HealthEndpointProvider'

describe('HealthEndpointProvider', () => {
  it('returns ok for empty live check', async () => {
    const provider = new HealthEndpointProvider()
    const result = await provider.checkLive()
    expect(result.status).toBe('ok')
    expect(result.checks).toHaveLength(0)
  })

  it('returns fail when check throws', async () => {
    const provider = new HealthEndpointProvider()
    provider.registerLive('failing', async () => { throw new Error('fail') })
    const result = await provider.checkLive()
    expect(result.status).toBe('fail')
  })

  it('returns startup status after markReady', async () => {
    const provider = new HealthEndpointProvider()
    provider.markReady()
    const result = await provider.checkStartup()
    expect(result.status).toBe('ok')
    expect(result.checks[0].name).toBe('startup')
  })
})
