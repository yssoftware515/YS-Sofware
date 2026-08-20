export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'

export interface LogEntry {
  level: LogLevel
  tag: string
  message: string
  timestamp: string
  moduleId?: string
  correlationId?: string
  context?: Record<string, unknown>
}

export type LogTransport = (entry: LogEntry) => void

export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
  critical: 4,
}

export class Logger {
  private minLevel: LogLevel = 'debug'
  private transports: LogTransport[] = []
  private history: LogEntry[] = []
  private maxHistory = 500

  setMinLevel(level: LogLevel): void {
    this.minLevel = level
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport)
  }

  private log(level: LogLevel, tag: string, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return

    const entry: LogEntry = {
      level,
      tag,
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    this.history.push(entry)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    for (const transport of this.transports) {
      try {
        transport(entry)
      } catch {
        // Transport failure must never crash the logger
      }
    }
  }

  debug(tag: string, message: string, context?: Record<string, unknown>): void {
    this.log('debug', tag, message, context)
  }

  info(tag: string, message: string, context?: Record<string, unknown>): void {
    this.log('info', tag, message, context)
  }

  warning(tag: string, message: string, context?: Record<string, unknown>): void {
    this.log('warning', tag, message, context)
  }

  error(tag: string, message: string, context?: Record<string, unknown>): void {
    this.log('error', tag, message, context)
  }

  critical(tag: string, message: string, context?: Record<string, unknown>): void {
    this.log('critical', tag, message, context)
  }

  getHistory(): LogEntry[] {
    return [...this.history]
  }

  getHistoryByLevel(level: LogLevel): LogEntry[] {
    return this.history.filter(e => e.level === level)
  }

  getHistoryByTag(tag: string): LogEntry[] {
    return this.history.filter(e => e.tag === tag)
  }

  clearHistory(): void {
    this.history = []
  }
}

export function createConsoleTransport(): LogTransport {
  return (entry: LogEntry) => {
    const prefix = `[${entry.level.toUpperCase()}] [${entry.tag}]`
    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, entry.context ?? '')
        break
      case 'info':
        console.info(prefix, entry.message, entry.context ?? '')
        break
      case 'warning':
        console.warn(prefix, entry.message, entry.context ?? '')
        break
      case 'error':
      case 'critical':
        console.error(prefix, entry.message, entry.context ?? '')
        break
    }
  }
}
