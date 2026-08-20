import type { WorkerDefinition, WorkerStats, WorkerStatus } from './types'

export class WorkerManager {
  private workers = new Map<string, { definition: WorkerDefinition; status: WorkerStatus; startTime: number; jobsProcessed: number; jobsFailed: number; lastRun?: string; lastError?: string }>()

  register(worker: WorkerDefinition): void {
    if (this.workers.has(worker.id)) throw new Error(`Worker already registered: ${worker.id}`)
    this.workers.set(worker.id, {
      definition: worker,
      status: 'idle',
      startTime: Date.now(),
      jobsProcessed: 0,
      jobsFailed: 0,
    })
  }

  async run(id: string, payload?: Record<string, unknown>): Promise<void> {
    const entry = this.workers.get(id)
    if (!entry) throw new Error(`Worker not found: ${id}`)

    entry.status = 'running'
    try {
      await entry.definition.execute(payload)
      entry.jobsProcessed++
      entry.lastRun = new Date().toISOString()
      entry.status = 'idle'
    } catch (e) {
      entry.jobsFailed++
      entry.lastError = e instanceof Error ? e.message : String(e)
      entry.status = 'failed'
    }
  }

  async runAll(): Promise<void> {
    for (const [id] of this.workers) {
      await this.run(id)
    }
  }

  pause(id: string): void {
    const entry = this.workers.get(id)
    if (entry) entry.status = 'paused'
  }

  resume(id: string): void {
    const entry = this.workers.get(id)
    if (entry && entry.status === 'paused') entry.status = 'idle'
  }

  async restart(id: string): Promise<void> {
    const entry = this.workers.get(id)
    if (entry) {
      entry.status = 'idle'
      entry.startTime = Date.now()
      entry.jobsProcessed = 0
      entry.jobsFailed = 0
      entry.lastError = undefined
    }
  }

  stop(id: string): void {
    const entry = this.workers.get(id)
    if (entry) entry.status = 'stopped'
  }

  getWorker(id: string): WorkerDefinition | undefined {
    return this.workers.get(id)?.definition
  }

  getStats(id: string): WorkerStats | undefined {
    const entry = this.workers.get(id)
    if (!entry) return undefined
    return {
      id: entry.definition.id,
      status: entry.status,
      uptime: Date.now() - entry.startTime,
      jobsProcessed: entry.jobsProcessed,
      jobsFailed: entry.jobsFailed,
      lastRun: entry.lastRun,
      lastError: entry.lastError,
      memory: typeof process !== 'undefined' && process.memoryUsage ? Math.round(process.memoryUsage().heapUsed / 1024 / 1024) : undefined,
    }
  }

  getAllStats(): WorkerStats[] {
    return Array.from(this.workers.keys()).map(id => this.getStats(id)!)
  }

  getWorkers(): WorkerDefinition[] {
    return Array.from(this.workers.values()).map(e => e.definition)
  }

  getByModule(moduleId: string): WorkerDefinition[] {
    return this.getWorkers().filter(w => w.moduleId === moduleId)
  }

  count(): number {
    return this.workers.size
  }

  clear(): void {
    this.workers.clear()
  }
}
