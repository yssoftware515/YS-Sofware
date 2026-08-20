export interface ConfigValidationError {
  key: string
  message: string
}

export type ConfigValue = string | number | boolean | null | undefined

export class PlatformConfig {
  private values = new Map<string, ConfigValue>()
  private defaults = new Map<string, ConfigValue>()
  private secrets = new Set<string>()
  private validators = new Map<string, (value: ConfigValue) => string | null>()

  set(key: string, value: ConfigValue, isSecret = false): void {
    const validator = this.validators.get(key)
    if (validator) {
      const error = validator(value)
      if (error) throw new Error(`Config validation failed for "${key}": ${error}`)
    }
    this.values.set(key, value)
    if (isSecret) this.secrets.add(key)
  }

  setDefault(key: string, value: ConfigValue): void {
    this.defaults.set(key, value)
  }

  get(key: string): ConfigValue {
    if (this.values.has(key)) return this.values.get(key)!
    if (this.defaults.has(key)) return this.defaults.get(key)!
    return null
  }

  getString(key: string, fallback = ''): string {
    const val = this.get(key)
    if (val === null || val === undefined) return fallback
    return String(val)
  }

  getNumber(key: string, fallback = 0): number {
    const val = this.get(key)
    if (val === null || val === undefined) return fallback
    const n = Number(val)
    return isNaN(n) ? fallback : n
  }

  getBoolean(key: string, fallback = false): boolean {
    const val = this.get(key)
    if (val === null || val === undefined) return fallback
    if (typeof val === 'boolean') return val
    if (val === 'true' || val === '1') return true
    if (val === 'false' || val === '0') return false
    return fallback
  }

  isSecret(key: string): boolean {
    return this.secrets.has(key)
  }

  addValidator(key: string, validator: (value: ConfigValue) => string | null): void {
    this.validators.set(key, validator)
  }

  validate(): ConfigValidationError[] {
    const errors: ConfigValidationError[] = []
    for (const [key, validator] of this.validators) {
      const value = this.get(key)
      const error = validator(value)
      if (error) errors.push({ key, message: error })
    }
    return errors
  }

  getAll(): Array<{ key: string; value: ConfigValue; isSecret: boolean }> {
    const result: Array<{ key: string; value: ConfigValue; isSecret: boolean }> = []
    const seen = new Set<string>()

    for (const [key, value] of this.values) {
      result.push({ key, value, isSecret: this.secrets.has(key) })
      seen.add(key)
    }
    for (const [key, value] of this.defaults) {
      if (!seen.has(key)) {
        result.push({ key, value, isSecret: this.secrets.has(key) })
      }
    }

    return result
  }

  loadFromEnv(prefix = 'NEXT_PUBLIC_'): void {
    if (typeof process === 'undefined' || !process.env) return
    for (const key of Object.keys(process.env)) {
      if (key.startsWith(prefix)) {
        this.set(key, process.env[key]!)
      }
    }
  }
}
