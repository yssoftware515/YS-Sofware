import { describe, it, expect } from 'vitest'
import { SecretsManager } from '@/lib/platform/secrets/SecretsManager'

describe('SecretsManager', () => {
  it('masks values correctly', () => {
    const mgr = new SecretsManager()
    expect(mgr.mask('abc')).toBe('****')
    expect(mgr.mask('abcdefgh')).toBe('ab****gh')
    expect(mgr.mask('a')).toBe('****')
  })

  it('stores and retrieves secrets', () => {
    const mgr = new SecretsManager()
    mgr.set('JWT_SECRET', 'my-secret-value')
    expect(mgr.get('JWT_SECRET')).toBe('my-secret-value')
    expect(mgr.exists('JWT_SECRET')).toBe(true)
    expect(mgr.exists('NONEXISTENT')).toBe(false)
  })

  it('validates missing secrets', () => {
    const mgr = new SecretsManager()
    mgr.define({ key: 'API_KEY', provider: 'env', description: 'API Key', rotationRequired: false })
    const result = mgr.validate()
    expect(result.valid).toBe(false)
    expect(result.missing).toContain('API_KEY')
  })
})
