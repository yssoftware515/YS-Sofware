import type { LogCategory, LogEntry, LogFilter } from './types'

export class LogCenter {
  private entries: LogEntry[] = []
  private maxEntries = 2000

  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    const full: LogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
    }
    this.entries.push(full)
    if (this.entries.length > this.maxEntries) this.entries.shift()
    return full
  }

  info(category: LogCategory, message: string, options?: { moduleId?: string; correlationId?: string; metadata?: Record<string, unknown> }): LogEntry {
    return this.log({ category, level: 'info', message, ...options })
  }

  warning(category: LogCategory, message: string, options?: { moduleId?: string; correlationId?: string; metadata?: Record<string, unknown> }): LogEntry {
    return this.log({ category, level: 'warning', message, ...options })
  }

  error(category: LogCategory, message: string, options?: { moduleId?: string; correlationId?: string; metadata?: Record<string, unknown> }): LogEntry {
    return this.log({ category, level: 'error', message, ...options })
  }

  query(filter: LogFilter): { entries: LogEntry[]; total: number; page: number; perPage: number; totalPages: number } {
    const page = filter.page ?? 1
    const perPage = filter.perPage ?? 50
    let results = [...this.entries]

    if (filter.category) results = results.filter(e => e.category === filter.category)
    if (filter.level) results = results.filter(e => e.level === filter.level)
    if (filter.moduleId) results = results.filter(e => e.moduleId === filter.moduleId)
    if (filter.search) {
      const q = filter.search.toLowerCase()
      results = results.filter(e => e.message.toLowerCase().includes(q) || e.id.includes(q))
    }
    if (filter.startDate) results = results.filter(e => e.timestamp >= filter.startDate!)
    if (filter.endDate) results = results.filter(e => e.timestamp <= filter.endDate!)

    results.reverse()
    const total = results.length
    const totalPages = Math.ceil(total / perPage)
    const paginated = results.slice((page - 1) * perPage, page * perPage)

    return { entries: paginated, total, page, perPage, totalPages }
  }

  getByCategory(category: LogCategory): LogEntry[] {
    return this.entries.filter(e => e.category === category)
  }

  getByModule(moduleId: string): LogEntry[] {
    return this.entries.filter(e => e.moduleId === moduleId)
  }

  getByCorrelationId(correlationId: string): LogEntry[] {
    return this.entries.filter(e => e.correlationId === correlationId)
  }

  getStats() {
    const categoryCounts: Record<string, number> = {}
    for (const e of this.entries) {
      categoryCounts[e.category] = (categoryCounts[e.category] ?? 0) + 1
    }
    return {
      total: this.entries.length,
      categories: categoryCounts,
      lastEntry: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : null,
    }
  }

  exportJson(filter?: LogFilter): string {
    const data = filter ? this.query(filter).entries : this.entries
    return JSON.stringify(data, null, 2)
  }

  clear(): void {
    this.entries = []
  }
}
