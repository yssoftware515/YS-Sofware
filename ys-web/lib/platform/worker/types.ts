export type WorkerStatus = 'running' | 'idle' | 'paused' | 'failed' | 'stopped'

export interface WorkerDefinition {
  id: string
  name: string
  moduleId: string
  description: string
  execute: (payload?: Record<string, unknown>) => Promise<void>
  interval?: number
  cron?: string
}

export interface WorkerStats {
  id: string
  status: WorkerStatus
  uptime: number
  jobsProcessed: number
  jobsFailed: number
  lastRun?: string
  lastError?: string
  memory?: number
}
