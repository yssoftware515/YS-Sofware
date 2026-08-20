export interface Metric {
  name: string
  value: number
  unit: 'ms' | 'count' | 'bytes' | 'percent' | 'items'
  moduleId?: string
  timestamp: string
  tags?: Record<string, string>
}

export interface MetricSummary {
  name: string
  count: number
  min: number
  max: number
  avg: number
  last: number
  unit: string
}

export class PerformanceMonitor {
  private metrics: Metric[] = []
  private maxMetrics = 1000
  private slowThreshold = 500

  record(name: string, value: number, unit: Metric['unit'] = 'ms', moduleId?: string, tags?: Record<string, string>): void {
    this.metrics.push({ name, value, unit, moduleId, timestamp: new Date().toISOString(), tags })
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  recordModuleLoad(moduleId: string, durationMs: number): void {
    this.record(`module.load`, durationMs, 'ms', moduleId, { moduleId })
  }

  recordRegistryCount(registryName: string, count: number): void {
    this.record(`registry.${registryName}`, count, 'count', undefined, { registry: registryName })
  }

  recordSlowOperation(name: string, durationMs: number, moduleId?: string): void {
    this.record(name, durationMs, 'ms', moduleId)
  }

  getMetrics(name?: string): Metric[] {
    if (name) return this.metrics.filter(m => m.name === name)
    return [...this.metrics]
  }

  getSummary(name: string): MetricSummary | null {
    const items = this.metrics.filter(m => m.name === name)
    if (items.length === 0) return null

    const values = items.map(m => m.value)
    return {
      name,
      count: items.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      last: values[values.length - 1],
      unit: items[0].unit,
    }
  }

  getSlowOperations(threshold?: number): Metric[] {
    const t = threshold ?? this.slowThreshold
    return this.metrics.filter(m => m.unit === 'ms' && m.value > t)
  }

  getMetricNames(): string[] {
    return [...new Set(this.metrics.map(m => m.name))]
  }

  clear(): void {
    this.metrics = []
  }
}
