import type { ReleaseEntry, ReleaseStatus, ReleaseMigration } from './types'

export class ReleaseManager {
  private releases: ReleaseEntry[] = []
  private migrations: ReleaseMigration[] = []
  private maxReleases = 50

  create(options: {
    version: string
    buildNumber: string
    gitSha: string
    gitBranch: string
    releaseNotes: string
    changelog: string
    author: string
    migrations?: string[]
  }): ReleaseEntry {
    const release: ReleaseEntry = {
      id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...options,
      status: 'draft',
      migrations: options.migrations ?? [],
      createdAt: new Date().toISOString(),
    }
    this.releases.push(release)
    if (this.releases.length > this.maxReleases) this.releases.shift()
    return release
  }

  release(id: string): ReleaseEntry {
    const release = this.getRelease(id)
    if (!release) throw new Error(`Release not found: ${id}`)
    release.status = 'released'
    return release
  }

  markDeployed(id: string): ReleaseEntry {
    const release = this.getRelease(id)
    if (!release) throw new Error(`Release not found: ${id}`)
    release.status = 'deployed'
    release.deploymentDate = new Date().toISOString()
    return release
  }

  rollback(id: string): ReleaseEntry {
    const release = this.getRelease(id)
    if (!release) throw new Error(`Release not found: ${id}`)
    release.status = 'rolled_back'
    return release
  }

  getRelease(id: string): ReleaseEntry | undefined {
    return this.releases.find(r => r.id === id)
  }

  getByVersion(version: string): ReleaseEntry | undefined {
    return this.releases.find(r => r.version === version)
  }

  getReleases(status?: ReleaseStatus): ReleaseEntry[] {
    if (status) return this.releases.filter(r => r.status === status)
    return [...this.releases]
  }

  getLatestRelease(): ReleaseEntry | undefined {
    if (this.releases.length === 0) return undefined
    return this.releases.reduce((a, b) => a.createdAt > b.createdAt ? a : b)
  }

  getCurrentVersion(): string | undefined {
    const deployed = this.releases.filter(r => r.status === 'deployed')
    if (deployed.length === 0) return undefined
    return deployed.reduce((a, b) => a.createdAt > b.createdAt ? a : b).version
  }

  addMigration(migration: ReleaseMigration): void {
    this.migrations.push(migration)
  }

  getMigrations(version?: string): ReleaseMigration[] {
    if (version) return this.migrations.filter(m => m.version === version)
    return [...this.migrations]
  }

  getAppliedMigrations(): ReleaseMigration[] {
    return this.migrations.filter(m => m.status === 'applied')
  }

  getPendingMigrations(): ReleaseMigration[] {
    return this.migrations.filter(m => m.status === 'pending')
  }

  getStats() {
    return {
      totalReleases: this.releases.length,
      totalMigrations: this.migrations.length,
      currentVersion: this.getCurrentVersion(),
      byStatus: this.releases.reduce((acc: Record<string, number>, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1
        return acc
      }, {}),
      lastRelease: this.getLatestRelease()?.createdAt ?? null,
    }
  }

  clear(): void {
    this.releases = []
    this.migrations = []
  }
}
