import type { StorageDriver, FileVisibility } from './types'

export interface SigningConfig {
  enabled: boolean
  ttl: number
  secret: string
}

export interface VersioningConfig {
  enabled: boolean
  maxVersions: number
}

export interface RetentionConfig {
  enabled: boolean
  ttl: number
  cleanupSchedule: string
}

export interface QuotaConfig {
  enabled: boolean
  maxSize: number
  maxFiles: number
}

export interface StoragePolicy {
  id: string
  name: string
  signing: SigningConfig
  versioning: VersioningConfig
  retention: RetentionConfig
  quota: QuotaConfig
  moduleId?: string
}

export class StoragePolicyManager {
  private policies: StoragePolicy[] = []
  private defaultPolicy: StoragePolicy = {
    id: 'default',
    name: 'Default',
    signing: { enabled: false, ttl: 3600, secret: '' },
    versioning: { enabled: false, maxVersions: 5 },
    retention: { enabled: false, ttl: 86400 * 30, cleanupSchedule: '0 3 * * *' },
    quota: { enabled: false, maxSize: 500 * 1024 * 1024, maxFiles: 10000 },
  }

  setPolicy(policy: StoragePolicy): void {
    const idx = this.policies.findIndex(p => p.id === policy.id)
    if (idx >= 0) this.policies[idx] = policy
    else this.policies.push(policy)
  }

  getPolicy(id: string): StoragePolicy {
    return this.policies.find(p => p.id === id) ?? this.defaultPolicy
  }

  getPolicyForModule(moduleId: string): StoragePolicy {
    return this.policies.find(p => p.moduleId === moduleId) ?? this.defaultPolicy
  }

  getPolicies(): StoragePolicy[] {
    return [...this.policies]
  }

  removePolicy(id: string): void {
    this.policies = this.policies.filter(p => p.id !== id)
  }

  validateQuota(policy: StoragePolicy, currentSize: number, currentFiles: number): { allowed: boolean; reason?: string } {
    if (!policy.quota.enabled) return { allowed: true }
    if (policy.quota.maxSize > 0 && currentSize >= policy.quota.maxSize) {
      return { allowed: false, reason: `Storage quota exceeded (${currentSize}/${policy.quota.maxSize})` }
    }
    if (policy.quota.maxFiles > 0 && currentFiles >= policy.quota.maxFiles) {
      return { allowed: false, reason: `File count quota exceeded (${currentFiles}/${policy.quota.maxFiles})` }
    }
    return { allowed: true }
  }

  async generateSignedUrl(driver: StorageDriver, path: string, policy: StoragePolicy): Promise<string> {
    if (!policy.signing.enabled) return driver.temporaryUrl(path, policy.signing.ttl)
    const expiry = Date.now() + policy.signing.ttl * 1000
    const token = Buffer.from(`${path}:${expiry}:${policy.signing.secret}`).toString('base64')
    return `${policy.signing.secret ? '/signed' : ''}/${path}?expires=${expiry}&token=${token}`
  }

  clear(): void {
    this.policies = []
  }
}
