import type { ErrorCodeEntry, ErrorSeverity, CodedError } from './types'

export class ErrorCatalog {
  private codes = new Map<string, ErrorCodeEntry>()
  private history: CodedError[] = []
  private maxHistory = 500

  register(entry: ErrorCodeEntry): void {
    if (this.codes.has(entry.code)) throw new Error(`Error code already registered: ${entry.code}`)
    this.codes.set(entry.code, entry)
  }

  registerMany(entries: ErrorCodeEntry[]): void {
    for (const entry of entries) {
      this.register(entry)
    }
  }

  get(code: string): ErrorCodeEntry | undefined {
    return this.codes.get(code)
  }

  getByCategory(category: string): ErrorCodeEntry[] {
    return Array.from(this.codes.values()).filter(e => e.category === category)
  }

  getBySeverity(severity: ErrorSeverity): ErrorCodeEntry[] {
    return Array.from(this.codes.values()).filter(e => e.severity === severity)
  }

  throw(code: string, message?: string, details?: Record<string, unknown>): never {
    const entry = this.codes.get(code)
    if (!entry) throw new Error(`Unknown error code: ${code}`)

    const error: CodedError = {
      code,
      message: message ?? entry.description,
      severity: entry.severity,
      category: entry.category,
      details,
      timestamp: new Date().toISOString(),
    }

    this.history.push(error)
    if (this.history.length > this.maxHistory) this.history.shift()

    const fullMessage = `[${code}] ${error.message}`
    throw new Error(fullMessage)
  }

  createError(code: string, message?: string, details?: Record<string, unknown>): CodedError {
    const entry = this.codes.get(code)
    return {
      code,
      message: message ?? entry?.description ?? 'Unknown error',
      severity: entry?.severity ?? 'info',
      category: entry?.category ?? 'unknown',
      details,
      timestamp: new Date().toISOString(),
    }
  }

  getHistory(): CodedError[] {
    return [...this.history]
  }

  getAllCodes(): ErrorCodeEntry[] {
    return Array.from(this.codes.values())
  }

  count(): number {
    return this.codes.size
  }

  clear(): void {
    this.codes.clear()
    this.history = []
  }
}

export const defaultErrorCodes: ErrorCodeEntry[] = [
  { code: 'PLATFORM_001', category: 'platform', severity: 'critical', description: 'Platform kernel failed to initialize', suggestedResolution: 'Check kernel dependencies and configuration', docsReference: '/docs/errors/PLATFORM_001' },
  { code: 'PLATFORM_002', category: 'platform', severity: 'minor', description: 'Platform already initialized', suggestedResolution: 'Call bootstrapPlatform() only once' },
  { code: 'KERNEL_001', category: 'kernel', severity: 'critical', description: 'Module dependency not found', suggestedResolution: 'Install the required module', docsReference: '/docs/errors/KERNEL_001' },
  { code: 'KERNEL_002', category: 'kernel', severity: 'major', description: 'Circular dependency detected between modules', suggestedResolution: 'Remove circular dependency', docsReference: '/docs/errors/KERNEL_002' },
  { code: 'MODULE_001', category: 'module', severity: 'major', description: 'Module registration failed', suggestedResolution: 'Check module manifest and register() function' },
  { code: 'MODULE_002', category: 'module', severity: 'major', description: 'Module boot failed', suggestedResolution: 'Check module boot() implementation' },
  { code: 'MODULE_010', category: 'module', severity: 'info', description: 'Module is disabled', suggestedResolution: 'Enable the module in configuration' },
  { code: 'SDK_001', category: 'sdk', severity: 'major', description: 'Product SDK version incompatible with platform', suggestedResolution: 'Update product SDK version', docsReference: '/docs/errors/SDK_001' },
  { code: 'SDK_020', category: 'sdk', severity: 'info', description: 'Product registration contains duplicate identifiers', suggestedResolution: 'Check for duplicate keys in registration' },
  { code: 'CACHE_001', category: 'cache', severity: 'minor', description: 'Cache driver unavailable', suggestedResolution: 'Check cache driver configuration', docsReference: '/docs/errors/CACHE_001' },
  { code: 'CACHE_030', category: 'cache', severity: 'info', description: 'Cache miss', suggestedResolution: 'No action needed — cache miss is normal' },
  { code: 'MAIL_001', category: 'mail', severity: 'major', description: 'Mail driver failed to send', suggestedResolution: 'Check SMTP configuration and network', docsReference: '/docs/errors/MAIL_001' },
  { code: 'MAIL_040', category: 'mail', severity: 'info', description: 'No mail driver configured', suggestedResolution: 'Register a mail driver' },
  { code: 'SEARCH_001', category: 'search', severity: 'major', description: 'Search engine unavailable', suggestedResolution: 'Check search driver configuration' },
  { code: 'SEARCH_050', category: 'search', severity: 'info', description: 'No search results found', suggestedResolution: 'No action needed' },
  { code: 'COMMAND_001', category: 'command', severity: 'major', description: 'No handler registered for command', suggestedResolution: 'Register a command handler', docsReference: '/docs/errors/COMMAND_001' },
  { code: 'COMMAND_060', category: 'command', severity: 'major', description: 'Command execution failed', suggestedResolution: 'Check command handler implementation' },
  { code: 'QUERY_001', category: 'query', severity: 'major', description: 'No handler registered for query', suggestedResolution: 'Register a query handler', docsReference: '/docs/errors/QUERY_001' },
  { code: 'QUERY_070', category: 'query', severity: 'major', description: 'Query execution failed', suggestedResolution: 'Check query handler implementation' },
  { code: 'PIPELINE_001', category: 'pipeline', severity: 'minor', description: 'Middleware execution error', suggestedResolution: 'Check middleware implementation', docsReference: '/docs/errors/PIPELINE_001' },
  { code: 'PIPELINE_080', category: 'pipeline', severity: 'info', description: 'Permission denied by middleware', suggestedResolution: 'Check user permissions' },
  { code: 'SECURITY_001', category: 'security', severity: 'critical', description: 'Security violation detected', suggestedResolution: 'Review access logs and permissions', docsReference: '/docs/errors/SECURITY_001' },
  { code: 'CONFIG_001', category: 'config', severity: 'major', description: 'Required configuration missing', suggestedResolution: 'Set the required configuration value' },
  { code: 'CONFIG_002', category: 'config', severity: 'minor', description: 'Configuration validation failed', suggestedResolution: 'Fix invalid configuration value' },
  { code: 'DRIVER_001', category: 'driver', severity: 'major', description: 'Driver not found', suggestedResolution: 'Register the driver before use', docsReference: '/docs/errors/DRIVER_001' },
  { code: 'DRIVER_002', category: 'driver', severity: 'minor', description: 'Driver already registered', suggestedResolution: 'Use replaceDriver() instead of registerDriver()' },
  { code: 'STORAGE_001', category: 'storage', severity: 'major', description: 'Storage disk not found', suggestedResolution: 'Register the storage disk before use' },
  { code: 'STORAGE_002', category: 'storage', severity: 'minor', description: 'Storage file not found', suggestedResolution: 'Check the file path' },
]
