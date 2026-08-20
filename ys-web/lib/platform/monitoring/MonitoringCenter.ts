import type { MetricPoint, MetricSeries, MonitoringAlert } from './types'

export class MonitoringCenter {
  private points: MetricPoint[] = []
  private maxPoints = 5000
  private alerts: MonitoringAlert[] = []
  private maxAlerts = 100

  record(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.points.push({ name, value, unit, timestamp: new Date().toISOString(), tags })
    if (this.points.length > this.maxPoints) this.points.shift()
  }

  recordHttp(method: string, path: string, status: number, duration: number): void {
    this.record('http.request', 1, 'count', { method, path, status: String(status) })
    this.record('http.duration', duration, 'ms', { method, path })
  }

  recordQueueSize(queue: string, size: number): void {
    this.record('queue.size', size, 'count', { queue })
  }

  recordMemory(used: number, total: number): void {
    this.record('memory.used', used, 'mb')
    this.record('memory.total', total, 'mb')
    this.record('memory.percent', Math.round((used / total) * 100), 'percent')
  }

  recordCpu(percent: number): void {
    this.record('cpu.usage', percent, 'percent')
  }

  getSeries(name: string, limit = 100): MetricSeries | null {
    const filtered = this.points.filter(p => p.name === name).slice(-limit)
    if (filtered.length === 0) return null
    const values = filtered.map(p => p.value)
    return {
      name,
      points: filtered,
      unit: filtered[0].unit,
      current: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((s, v) => s + v, 0) / values.length,
    }
  }

  getMetricNames(): string[] {
    return [...new Set(this.points.map(p => p.name))]
  }

  getRecent(limit = 100): MetricPoint[] {
    return this.points.slice(-limit).reverse()
  }

  getSummary(): Record<string, { current: number; unit: string }> {
    const summary: Record<string, { current: number; unit: string }> = {}
    for (const name of this.getMetricNames()) {
      const series = this.getSeries(name, 1)
      if (series) summary[name] = { current: series.current, unit: series.unit }
    }
    return summary
  }

  addAlert(alert: Omit<MonitoringAlert, 'id' | 'timestamp' | 'acknowledged'>): MonitoringAlert {
    const full: MonitoringAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    }
    this.alerts.push(full)
    if (this.alerts.length > this.maxAlerts) this.alerts.shift()
    return full
  }

  acknowledgeAlert(id: string): void {
    const alert = this.alerts.find(a => a.id === id)
    if (alert) alert.acknowledged = true
  }

  getAlerts(acknowledged?: boolean): MonitoringAlert[] {
    if (acknowledged !== undefined) return this.alerts.filter(a => a.acknowledged === acknowledged)
    return [...this.alerts]
  }

  getUnacknowledgedAlerts(): MonitoringAlert[] {
    return this.alerts.filter(a => !a.acknowledged)
  }

  getStats() {
    return {
      totalMetrics: this.getMetricNames().length,
      totalPoints: this.points.length,
      totalAlerts: this.alerts.length,
      unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length,
    }
  }

  clear(): void {
    this.points = []
    this.alerts = []
  }
}
