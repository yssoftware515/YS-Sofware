import type { VersionInfo, UpdateResult } from './types'

export class UpdateCenter {
  private versions: VersionInfo[] = []
  private currentVersion?: string
  private migrationHistory: Array<{ migration: string; appliedAt: string }> = []

  setCurrentVersion(version: string): void {
    this.currentVersion = version
  }

  getCurrentVersion(): string | undefined {
    return this.currentVersion
  }

  registerVersion(info: VersionInfo): void {
    const existing = this.versions.findIndex(v => v.version === info.version)
    if (existing >= 0) this.versions[existing] = info
    else this.versions.push(info)
  }

  getLatestVersion(): VersionInfo | undefined {
    if (this.versions.length === 0) return undefined
    return this.versions.reduce((latest, v) =>
      v.releaseDate > latest.releaseDate ? v : latest
    )
  }

  getAvailableUpdates(): VersionInfo[] {
    if (!this.currentVersion) return [...this.versions]
    return this.versions.filter(v => v.releaseDate > this.getVersionDate(this.currentVersion!))
  }

  getRequiredUpdates(): VersionInfo[] {
    return this.getAvailableUpdates().filter(v => v.required)
  }

  checkCompatibility(version: string, moduleVersions?: Record<string, string>): { compatible: boolean; issues: string[] } {
    const info = this.versions.find(v => v.version === version)
    if (!info) return { compatible: false, issues: [`Version ${version} not found`] }

    const issues: string[] = []
    if (moduleVersions && info.compatibility.moduleVersions) {
      for (const [mod, req] of Object.entries(info.compatibility.moduleVersions)) {
        const current = moduleVersions[mod]
        if (current && current !== req) issues.push(`Module ${mod} requires version ${req}, current: ${current}`)
      }
    }
    return { compatible: issues.length === 0, issues }
  }

  getMigrations(version: string): string[] {
    const allMigrations: string[] = []
    if (!this.currentVersion) return allMigrations

    for (const v of this.versions) {
      if (v.releaseDate > this.getVersionDate(this.currentVersion) && v.releaseDate <= this.getVersionDate(version)) {
        allMigrations.push(...v.migrations)
      }
    }
    return allMigrations
  }

  isMigrationApplied(migration: string): boolean {
    return this.migrationHistory.some(m => m.migration === migration)
  }

  getMigrationHistory(): Array<{ migration: string; appliedAt: string }> {
    return [...this.migrationHistory]
  }

  getStats() {
    return {
      currentVersion: this.currentVersion,
      totalVersions: this.versions.length,
      availableUpdates: this.getAvailableUpdates().length,
      requiredUpdates: this.getRequiredUpdates().length,
      latestVersion: this.getLatestVersion()?.version,
      migrationsApplied: this.migrationHistory.length,
    }
  }

  private getVersionDate(version: string): string {
    const v = this.versions.find(x => x.version === version)
    return v?.releaseDate ?? '1970-01-01'
  }

  clear(): void {
    this.versions = []
    this.currentVersion = undefined
    this.migrationHistory = []
  }
}
