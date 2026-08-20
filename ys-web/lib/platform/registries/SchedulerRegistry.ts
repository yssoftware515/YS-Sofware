export interface ScheduledTask {
  id: string
  label: string
  moduleId: string
  cron: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  status?: 'idle' | 'running' | 'failed'
  description?: string
  execute: () => Promise<void>
}

export interface TaskExecution {
  taskId: string
  startedAt: string
  finishedAt?: string
  success: boolean
  error?: string
  duration?: number
}

export class SchedulerRegistry {
  private tasks = new Map<string, ScheduledTask>()
  private history: TaskExecution[] = []
  private maxHistory = 200
  private running = new Set<string>()

  register(task: ScheduledTask): void {
    this.tasks.set(task.id, task)
  }

  unregister(id: string): void {
    this.tasks.delete(id)
  }

  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id)
  }

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values())
  }

  getTasksByModule(moduleId: string): ScheduledTask[] {
    return this.getAllTasks().filter(t => t.moduleId === moduleId)
  }

  async runTask(id: string): Promise<TaskExecution> {
    const task = this.tasks.get(id)
    if (!task) {
      return { taskId: id, startedAt: new Date().toISOString(), success: false, error: 'Task not found' }
    }

    if (this.running.has(id)) {
      return { taskId: id, startedAt: new Date().toISOString(), success: false, error: 'Task already running' }
    }

    this.running.add(id)
    task.status = 'running'
    const startedAt = new Date().toISOString()

    try {
      await task.execute()
      const finishedAt = new Date().toISOString()
      const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      task.lastRun = finishedAt
      task.status = 'idle'

      const exec: TaskExecution = { taskId: id, startedAt, finishedAt, success: true, duration }
      this.history.push(exec)
      if (this.history.length > this.maxHistory) this.history.shift()
      return exec
    } catch (e) {
      const finishedAt = new Date().toISOString()
      const duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
      task.status = 'failed'

      const exec: TaskExecution = {
        taskId: id, startedAt, finishedAt, success: false,
        error: e instanceof Error ? e.message : String(e), duration,
      }
      this.history.push(exec)
      if (this.history.length > this.maxHistory) this.history.shift()
      return exec
    } finally {
      this.running.delete(id)
    }
  }

  async runAll(): Promise<TaskExecution[]> {
    const results: TaskExecution[] = []
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        results.push(await this.runTask(task.id))
      }
    }
    return results
  }

  setEnabled(id: string, enabled: boolean): void {
    const task = this.tasks.get(id)
    if (task) task.enabled = enabled
  }

  getHistory(): TaskExecution[] {
    return [...this.history]
  }

  getTaskHistory(id: string): TaskExecution[] {
    return this.history.filter(h => h.taskId === id)
  }

  clearHistory(): void {
    this.history = []
  }

  clear(): void {
    this.tasks.clear()
    this.history = []
  }
}
