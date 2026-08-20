import type { QueueDriver, Job, JobPayload, JobStatus } from './types'
import { SyncDriver } from './drivers/SyncDriver'

export interface QueueStats {
  queue: string
  pending: number
  running: number
  completed: number
  failed: number
  retrying: number
  delayed: number
  deadLetter: number
  total: number
}

export class QueueManager {
  private driver: QueueDriver
  private queues = new Set<string>()
  private completed: Job[] = []
  private deadLetters: Job[] = []
  private maxCompleted = 200
  private maxDeadLetter = 100

  constructor(driver?: QueueDriver) {
    this.driver = driver ?? new SyncDriver()
  }

  setDriver(driver: QueueDriver): void {
    this.driver = driver
  }

  async dispatch(name: string, payload: JobPayload = {}, options?: {
    queue?: string
    moduleId?: string
    delay?: number
    priority?: number
    maxAttempts?: number
  }): Promise<string> {
    const queue = options?.queue ?? 'default'
    this.queues.add(queue)

    return this.driver.push({
      name,
      moduleId: options?.moduleId ?? 'core',
      payload,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      priority: options?.priority ?? 0,
      delay: options?.delay ?? 0,
      startedAt: undefined,
      completedAt: undefined,
      failedAt: undefined,
      error: undefined,
      queue,
    })
  }

  async dispatchBatch(jobs: Array<{
    name: string
    payload: JobPayload
    queue?: string
    moduleId?: string
    priority?: number
  }>): Promise<string[]> {
    return Promise.all(jobs.map(j => this.dispatch(j.name, j.payload, {
      queue: j.queue, moduleId: j.moduleId, priority: j.priority,
    })))
  }

  async process(queue = 'default'): Promise<Job | null> {
    const job = await this.driver.pop(queue)
    if (!job) return null
    return job
  }

  async complete(job: Job): Promise<void> {
    await this.driver.acknowledge(job.id)
    job.status = 'completed'
    job.completedAt = new Date().toISOString()
    this.completed.push(job)
    if (this.completed.length > this.maxCompleted) this.completed.shift()
  }

  async fail(job: Job, error: string): Promise<void> {
    await this.driver.fail(job.id, error)
    job.failedAt = new Date().toISOString()
    job.error = error

    if (job.attempts >= job.maxAttempts) {
      const dlq: Job = { ...job, status: 'failed' }
      this.deadLetters.push(dlq)
      if (this.deadLetters.length > this.maxDeadLetter) this.deadLetters.shift()
    }
  }

  async retry(jobId: string): Promise<void> {
    await this.driver.retry(jobId)
  }

  async cancel(jobId: string): Promise<void> {
    await this.driver.cancel(jobId)
  }

  async length(queue = 'default'): Promise<number> {
    return this.driver.length(queue)
  }

  async peek(queue = 'default', limit = 10): Promise<Job[]> {
    return this.driver.peek(queue, limit)
  }

  getQueues(): string[] {
    return Array.from(this.queues)
  }

  getCompleted(): Job[] {
    return [...this.completed]
  }

  getDeadLetters(): Job[] {
    return [...this.deadLetters]
  }

  getStats(): QueueStats[] {
    const stats: QueueStats[] = []
    for (const queue of this.queues) {
      const allJobs = [...this.completed.filter(j => j.queue === queue)]
      stats.push({
        queue,
        pending: 0,
        running: 0,
        completed: allJobs.filter(j => j.status === 'completed').length,
        failed: allJobs.filter(j => j.status === 'failed').length,
        retrying: 0,
        delayed: 0,
        deadLetter: this.deadLetters.filter(j => j.queue === queue).length,
        total: allJobs.length,
      })
    }
    return stats
  }

  async clear(queue?: string): Promise<void> {
    await this.driver.clear(queue)
    if (queue) {
      this.completed = this.completed.filter(j => j.queue !== queue)
      this.deadLetters = this.deadLetters.filter(j => j.queue !== queue)
    } else {
      this.completed = []
      this.deadLetters = []
      this.queues.clear()
    }
  }
}
