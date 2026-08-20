import type { EnvironmentName, EnvVariableDefinition, EnvValidationIssue, EnvValidationReport } from './types'

export class EnvironmentManager {
  private definitions: EnvVariableDefinition[] = []
  private environment: EnvironmentName = 'development'

  constructor() {
    this.registerDefaults()
  }

  private registerDefaults(): void {
    this.define({
      key: 'APP_ENV',
      required: true,
      secret: false,
      description: 'Application environment',
      validValues: ['development', 'testing', 'staging', 'production'],
    })
    this.define({
      key: 'APP_URL',
      required: true,
      secret: false,
      description: 'Application base URL',
    })
    this.define({
      key: 'APP_NAME',
      required: false,
      secret: false,
      defaultValue: 'YS Platform',
      description: 'Application display name',
    })
    this.define({
      key: 'APP_DEBUG',
      required: false,
      secret: false,
      defaultValue: 'false',
      description: 'Enable debug mode',
    })
    this.define({
      key: 'DB_CONNECTION',
      required: true,
      secret: false,
      description: 'Database connection string',
    })
    this.define({
      key: 'REDIS_HOST',
      required: false,
      secret: false,
      defaultValue: '127.0.0.1',
      description: 'Redis host',
    })
    this.define({
      key: 'REDIS_PORT',
      required: false,
      secret: false,
      defaultValue: '6379',
      description: 'Redis port',
    })
    this.define({
      key: 'MAIL_HOST',
      required: false,
      secret: false,
      description: 'SMTP host',
    })
    this.define({
      key: 'MAIL_PORT',
      required: false,
      secret: false,
      defaultValue: '587',
      description: 'SMTP port',
    })
    this.define({
      key: 'MAIL_USERNAME',
      required: false,
      secret: true,
      description: 'SMTP username',
    })
    this.define({
      key: 'MAIL_PASSWORD',
      required: false,
      secret: true,
      description: 'SMTP password',
    })
    this.define({
      key: 'STORAGE_DRIVER',
      required: false,
      secret: false,
      defaultValue: 'local',
      description: 'Default storage driver',
      validValues: ['local', 's3'],
    })
    this.define({
      key: 'CACHE_DRIVER',
      required: false,
      secret: false,
      defaultValue: 'memory',
      description: 'Default cache driver',
      validValues: ['memory', 'redis'],
    })
    this.define({
      key: 'QUEUE_DRIVER',
      required: false,
      secret: false,
      defaultValue: 'sync',
      description: 'Default queue driver',
      validValues: ['sync', 'redis'],
    })
    this.define({
      key: 'JWT_SECRET',
      required: true,
      secret: true,
      description: 'JWT signing secret',
    })
    this.define({
      key: 'APP_KEY',
      required: true,
      secret: true,
      description: 'Application encryption key',
    })
    this.define({
      key: 'LOG_LEVEL',
      required: false,
      secret: false,
      defaultValue: 'debug',
      description: 'Minimum log level',
      validValues: ['debug', 'info', 'warning', 'error'],
    })
  }

  setEnvironment(env: EnvironmentName): void {
    this.environment = env
  }

  getEnvironment(): EnvironmentName {
    return this.environment
  }

  define(def: EnvVariableDefinition): void {
    const existing = this.definitions.findIndex(d => d.key === def.key)
    if (existing >= 0) this.definitions[existing] = def
    else this.definitions.push(def)
  }

  getDefinitions(): EnvVariableDefinition[] {
    return [...this.definitions]
  }

  getDefinition(key: string): EnvVariableDefinition | undefined {
    return this.definitions.find(d => d.key === key)
  }

  validate(source: (key: string) => string | undefined): EnvValidationReport {
    const issues: EnvValidationIssue[] = []

    for (const def of this.definitions) {
      const value = source(def.key)

      if (def.deprecated && value !== undefined) {
        issues.push({
          key: def.key,
          severity: 'warning',
          message: `Variable "${def.key}" is deprecated${def.deprecatedSince ? ` since ${def.deprecatedSince}` : ''}`,
        })
      }

      if (def.required && (value === undefined || value === '')) {
        issues.push({
          key: def.key,
          severity: 'error',
          message: `Required variable "${def.key}" is missing`,
        })
        continue
      }

      if (def.validValues && value !== undefined && !def.validValues.includes(value)) {
        issues.push({
          key: def.key,
          severity: 'error',
          message: `Variable "${def.key}" has invalid value "${value}". Valid values: ${def.validValues.join(', ')}`,
        })
      }

      if (value !== undefined && def.validator) {
        const error = def.validator(value)
        if (error) issues.push({ key: def.key, severity: 'error', message: error })
      }
    }

    const errors = issues.filter(i => i.severity === 'error').length
    const warnings = issues.filter(i => i.severity === 'warning').length
    const infos = issues.filter(i => i.severity === 'info').length

    return {
      environment: this.environment,
      timestamp: new Date().toISOString(),
      total: issues.length,
      errors,
      warnings,
      infos,
      issues,
      passed: errors === 0,
    }
  }

  validateCurrentProcess(): EnvValidationReport {
    return this.validate((key) => process.env[key])
  }

  generateEnvFile(): string {
    const lines: string[] = []
    for (const def of this.definitions) {
      if (def.secret) {
        lines.push(`# ${def.description}`)
        lines.push(`${def.key}=`)
      } else {
        lines.push(`# ${def.description}`)
        lines.push(`${def.key}=${def.defaultValue ?? ''}`)
      }
    }
    return lines.join('\n')
  }

  getStats() {
    return {
      environment: this.environment,
      totalDefinitions: this.definitions.length,
      required: this.definitions.filter(d => d.required).length,
      secrets: this.definitions.filter(d => d.secret).length,
      deprecated: this.definitions.filter(d => d.deprecated).length,
    }
  }

  clear(): void {
    this.definitions = []
    this.environment = 'development'
    this.registerDefaults()
  }
}
