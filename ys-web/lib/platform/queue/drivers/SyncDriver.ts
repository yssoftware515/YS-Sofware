import type { QueueDriver, Job, JobStatus } from '../types'

interface QueueStore {
  jobs: Job[]
  deadLetter: Job[]
}

export class SyncDriver implements QueueDriver {
  private stores = new Map<string, QueueStore>()

  private getStore(queue: string): QueueStore {
    if (!this.stores.has(queue)) {
      this.stores.set(queue, { jobs: [], deadLetter: [] })
    }
    return this.stores.get(queue)!
  }

  async push(jobData: Omit<Job, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const job: Job = {
      ...jobData,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    const store = this.getStore(jobData.queue)
    store.jobs.push(job)
    store.jobs.sort((a, b) => b.priority - a.priority)
    return id
  }

  async pop(queue: string): Promise<Job | null> {
    const store = this.getStore(queue)
    const idx = store.jobs.findIndex(j => j.status === 'pending' && (!j.delay || new Date(j.createdAt).getTime() + j.delay <= Date.now()))
    if (idx === -1) return null
    const job = store.jobs[idx]
    job.status = 'running'
    job.startedAt = new Date().toISOString()
    return job
  }

  async acknowledge(id: string): Promise<void> {
    for (const [, store] of this.stores) {
      const job = store.jobs.find(j => j.id === id)
      if (job) {
        job.status = 'completed'
        job.completedAt = new Date().toISOString()
        return
      }
    }
  }

  async fail(id: string, error: string): Promise<void> {
    for (const [, store] of this.stores) {
      const job = store.jobs.find(j => j.id === id)
      if (job) {
        job.error = error
        job.failedAt = new Date().toISOString()
        if (job.attempts < job.maxAttempts) {
          job.status = 'retrying'
          job.attempts++
        } else {
          job.status = 'failed'
          store.deadLetter.push({ ...job })
        }
        return
      }
    }
  }

  async retry(id: string): Promise<void> {
    for (const [, store] of this.stores) {
      const idx = store.deadLetter.findIndex(j => j.id === id)
      if (idx >= 0) {
        const job = store.deadLetter[idx]
        job.status = 'pending'
        job.attempts = 0
        job.error = undefined
        store.deadLetter.splice(idx, 1)
        store.jobs.push(job)
        return
      }
    }
  }

  async cancel(id: string): Promise<void> {
    for (const [, store] of this.stores) {
      const job = store.jobs.find(j => j.id === id)
      if (job && (job.status === 'pending' || job.status === 'retrying' || job.status === 'delayed')) {
        job.status = 'cancelled'
        return
      }
    }
  }

  async length(queue: string): Promise<number> {
    const store = this.getStore(queue)
    return store.jobs.filter(j => j.status === 'pending' || j.status === 'retrying').length
  }

  async peek(queue: string, limit = 10): Promise<Job[]> {
    const store = this.getStore(queue)
    return store.jobs.slice(0, limit)
  }

  async clear(queue?: string): Promise<void> {
    if (queue) {
      this.stores.delete(queue)
    } else {
      this.stores.clear()
    }
  }
}
