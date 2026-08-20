export interface ExecutionMetric {
  operation: string
  type: 'command' | 'query' | 'middleware' | 'module_boot' | 'health_check' | 'event' | 'custom'
  duration: number
  memoryDelta?: number
  success: boolean
  moduleId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export class ObservabilityManager {
  private metrics: ExecutionMetric[] = []
  private maxMetrics = 2000
  private slowThreshold = 1000

  record(metric: Omit<ExecutionMetric, 'timestamp'>): void {
    this.metrics.push({ ...metric, timestamp: new Date().toISOString() })
    if (this.metrics.length > this.maxMetrics) this.metrics.shift()
  }

  recordExecution(type: ExecutionMetric['type'], operation: string, duration: number, success: boolean, moduleId?: string): void {
    this.record({ type, operation, duration, success, moduleId })
  }

  getSlowOperations(threshold?: number): ExecutionMetric[] {
    const t = threshold ?? this.slowThreshold
    return this.metrics.filter(m => m.duration > t)
  }

  getByType(type: ExecutionMetric['type']): ExecutionMetric[] {
    return this.metrics.filter(m => m.type === type)
  }

  getByModule(moduleId: string): ExecutionMetric[] {
    return this.metrics.filter(m => m.moduleId === moduleId)
  }

  getAverageDuration(type?: ExecutionMetric['type']): number {
    const items = type ? this.getByType(type) : this.metrics
    if (items.length === 0) return 0
    return items.reduce((s, m) => s + m.duration, 0) / items.length
  }

  getErrorRate(type?: ExecutionMetric['type']): number {
    const items = type ? this.getByType(type) : this.metrics
    if (items.length === 0) return 0
    return items.filter(m => !m.success).length / items.length
  }

  getSummary(): Record<string, { count: number; avgDuration: number; errorRate: number }> {
    const summary: Record<string, { count: number; avgDuration: number; errorRate: number }> = {}
    for (const metric of this.metrics) {
      const key = `${metric.type}:${metric.operation}`
      if (!summary[key]) summary[key] = { count: 0, avgDuration: 0, errorRate: 0 }
      const s = summary[key]
      s.count++
      s.avgDuration = (s.avgDuration * (s.count - 1) + metric.duration) / s.count
      s.errorRate = s.errorRate * (s.count - 1) / s.count + (metric.success ? 0 : 1 / s.count)
    }
    return summary
  }

  getAllMetrics(): ExecutionMetric[] {
    return [...this.metrics]
  }

  count(): number {
    return this.metrics.length
  }

  clear(): void {
    this.metrics = []
  }
}
