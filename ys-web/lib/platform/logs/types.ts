export type LogCategory = 'application' | 'platform' | 'security' | 'audit' | 'queue' | 'worker' | 'mail' | 'storage' | 'search' | 'api'

export interface LogEntry {
  id: string
  category: LogCategory
  level: string
  message: string
  moduleId?: string
  correlationId?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export interface LogFilter {
  category?: LogCategory
  level?: string
  moduleId?: string
  search?: string
  startDate?: string
  endDate?: string
  page?: number
  perPage?: number
}
