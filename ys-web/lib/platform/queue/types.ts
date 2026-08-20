export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'delayed' | 'cancelled'

export interface JobPayload {
  [key: string]: unknown
}

export interface Job {
  id: string
  name: string
  moduleId: string
  payload: JobPayload
  attempts: number
  maxAttempts: number
  priority: number
  status: JobStatus
  delay: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  failedAt?: string
  error?: string
  queue: string
}

export interface QueueDriver {
  push(job: Omit<Job, 'id' | 'createdAt' | 'status'>): Promise<string>
  pop(queue: string): Promise<Job | null>
  acknowledge(id: string): Promise<void>
  fail(id: string, error: string): Promise<void>
  retry(id: string): Promise<void>
  cancel(id: string): Promise<void>
  length(queue: string): Promise<number>
  peek(queue: string, limit?: number): Promise<Job[]>
  clear(queue?: string): Promise<void>
}
