import { describe, it, expect } from 'vitest'
import { ReleaseManager } from '@/lib/platform/release/ReleaseManager'

describe('ReleaseManager', () => {
  it('creates and manages releases', () => {
    const mgr = new ReleaseManager()
    const release = mgr.create({
      version: 'v1.0.0',
      buildNumber: '100',
      gitSha: 'abc123',
      gitBranch: 'main',
      releaseNotes: 'Initial release',
      changelog: 'Changelog content',
      author: 'test',
    })
    expect(release.status).toBe('draft')
    expect(mgr.getByVersion('v1.0.0')).toBeDefined()
  })

  it('tracks release lifecycle', () => {
    const mgr = new ReleaseManager()
    const r = mgr.create({ version: 'v2.0.0', buildNumber: '200', gitSha: 'def456', gitBranch: 'main', releaseNotes: '', changelog: '', author: 'test' })
    mgr.release(r.id)
    expect(mgr.getRelease(r.id)!.status).toBe('released')
    mgr.markDeployed(r.id)
    expect(mgr.getRelease(r.id)!.status).toBe('deployed')
    expect(mgr.getCurrentVersion()).toBe('v2.0.0')
  })
})
