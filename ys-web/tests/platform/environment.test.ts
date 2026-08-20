import { describe, it, expect } from 'vitest'
import { EnvironmentManager } from '@/lib/platform/environment/EnvironmentManager'

describe('EnvironmentManager', () => {
  it('validates required variables', () => {
    const mgr = new EnvironmentManager()
    const report = mgr.validate(() => undefined)
    expect(report.passed).toBe(false)
    expect(report.errors).toBeGreaterThan(0)
  })

  it('passes with all required variables', () => {
    const mgr = new EnvironmentManager()
    const report = mgr.validate((key) => {
      const vars: Record<string, string> = {
        APP_ENV: 'production',
        APP_URL: 'https://example.com',
        DB_CONNECTION: 'pgsql://user:pass@localhost/db',
        JWT_SECRET: 'some-secret',
        APP_KEY: 'some-key',
      }
      return vars[key]
    })
    expect(report.passed).toBe(true)
  })

  it('detects invalid values', () => {
    const mgr = new EnvironmentManager()
    const report = mgr.validate((key) => {
      if (key === 'APP_ENV') return 'invalid'
      if (key === 'APP_URL') return 'https://example.com'
      if (key === 'DB_CONNECTION') return 'pgsql://...'
      if (key === 'JWT_SECRET') return 'secret'
      if (key === 'APP_KEY') return 'key'
      return undefined
    })
    expect(report.errors).toBeGreaterThan(0)
  })
})
