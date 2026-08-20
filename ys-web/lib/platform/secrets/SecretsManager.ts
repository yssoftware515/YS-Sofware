import type { SecretProvider, SecretDefinition, SecretEntry } from './types'

export class SecretsManager {
  private definitions: SecretDefinition[] = []
  private store = new Map<string, string>()
  private provider: SecretProvider = 'env'

  define(def: SecretDefinition): void {
    const existing = this.definitions.findIndex(d => d.key === def.key)
    if (existing >= 0) this.definitions[existing] = def
    else this.definitions.push(def)
  }

  set(key: string, value: string): void {
    this.store.set(key, value)
    const def = this.definitions.find(d => d.key === key)
    if (def) def.lastRotated = new Date().toISOString()
  }

  get(key: string): string | undefined {
    return this.store.get(key)
  }

  mask(value: string): string {
    if (value.length <= 4) return '****'
    return value.slice(0, 2) + '****' + value.slice(-2)
  }

  getMasked(key: string): string {
    const value = this.store.get(key)
    if (!value) return '****'
    return this.mask(value)
  }

  exists(key: string): boolean {
    return this.store.has(key)
  }

  getDefinition(key: string): SecretDefinition | undefined {
    return this.definitions.find(d => d.key === key)
  }

  getDefinitions(): SecretDefinition[] {
    return [...this.definitions]
  }

  list(): SecretEntry[] {
    return this.definitions.map(def => ({
      key: def.key,
      maskedValue: this.getMasked(def.key),
      provider: def.provider,
      exists: this.store.has(def.key),
      lastSet: def.lastRotated,
    }))
  }

  validate(): { missing: string[]; valid: boolean } {
    const missing = this.definitions
      .filter(d => !this.store.has(d.key))
      .map(d => d.key)
    return { missing, valid: missing.length === 0 }
  }

  rotate(key: string, newValue: string): void {
    this.set(key, newValue)
    const def = this.definitions.find(d => d.key === key)
    if (def) {
      def.lastRotated = new Date().toISOString()
      def.rotationRequired = false
    }
  }

  needsRotation(key: string): boolean {
    const def = this.definitions.find(d => d.key === key)
    if (!def || !def.rotationRequired) return false
    if (!def.expiresAt) return false
    return new Date() >= new Date(def.expiresAt)
  }

  loadFromEnv(): void {
    for (const def of this.definitions) {
      const value = process.env[def.key]
      if (value) this.store.set(def.key, value)
    }
  }

  getStats() {
    return {
      totalDefinitions: this.definitions.length,
      present: this.store.size,
      missing: this.definitions.length - this.store.size,
      needsRotation: this.definitions.filter(d => this.needsRotation(d.key)).length,
    }
  }

  clear(): void {
    this.definitions = []
    this.store.clear()
  }
}
