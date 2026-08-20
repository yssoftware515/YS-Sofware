export interface MetricPoint {
  name: string
  value: number
  unit: string
  timestamp: string
  tags?: Record<string, string>
}

export interface MetricSeries {
  name: string
  points: MetricPoint[]
  unit: string
  current: number
  min: number
  max: number
  avg: number
}

export interface MonitoringAlert {
  id: string
  metric: string
  condition: string
  threshold: number
  current: number
  severity: 'info' | 'warning' | 'critical'
  message: string
  timestamp: string
  acknowledged: boolean
}
