export type ErrorSeverity = 'critical' | 'major' | 'minor' | 'info'

export interface ErrorCodeEntry {
  code: string
  category: string
  severity: ErrorSeverity
  description: string
  suggestedResolution: string
  docsReference?: string
}

export interface CodedError {
  code: string
  message: string
  severity: ErrorSeverity
  category: string
  details?: Record<string, unknown>
  timestamp: string
}
