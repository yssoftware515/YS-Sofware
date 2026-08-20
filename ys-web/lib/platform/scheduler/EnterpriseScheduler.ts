import { SchedulerRegistry } from '../registries/SchedulerRegistry'
import type { ScheduledTask, TaskExecution } from '../registries/SchedulerRegistry'

export interface CronExpression {
  second?: string
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
}

export interface EnhancedTask extends ScheduledTask {
  cronExpression?: CronExpression
  timeout?: number
  retries?: number
  dependencies?: string[]
  averageDuration?: number
  failureCount?: number
  executionLogs: TaskExecution[]
}

export class EnterpriseScheduler {
  private registry: SchedulerRegistry
  private executionLogs = new Map<string, TaskExecution[]>()
  private maxLogs = 100

  constructor(registry: SchedulerRegistry) {
    this.registry = registry
  }

  getRegistry(): SchedulerRegistry {
    return this.registry
  }

  register(task: ScheduledTask & { cronExpression?: CronExpression; timeout?: number; retries?: number; dependencies?: string[] }): void {
    this.registry.register(task)
  }

  unregister(id: string): void {
    this.registry.unregister(id)
  }

  getTask(id: string): (ScheduledTask & { averageDuration?: number; failureCount?: number; executionLogs: TaskExecution[] }) | undefined {
    const task = this.registry.getTask(id)
    if (!task) return undefined
    const logs = this.executionLogs.get(id) ?? []
    return {
      ...task,
      averageDuration: logs.length > 0 ? logs.reduce((s, l) => s + (l.duration ?? 0), 0) / logs.length : undefined,
      failureCount: logs.filter(l => !l.success).length,
      executionLogs: logs,
    }
  }

  getAllTasks() {
    return this.registry.getAllTasks().map(t => this.getTask(t.id)).filter(Boolean)
  }

  getTasksByModule(moduleId: string) {
    return this.registry.getTasksByModule(moduleId).map(t => this.getTask(t.id)).filter(Boolean)
  }

  async runTask(id: string): Promise<TaskExecution> {
    const result = await this.registry.runTask(id)
    const logs = this.executionLogs.get(id) ?? []
    logs.push(result)
    if (logs.length > this.maxLogs) logs.shift()
    this.executionLogs.set(id, logs)
    return result
  }

  async runAll(): Promise<TaskExecution[]> {
    const results: TaskExecution[] = []
    for (const task of this.registry.getAllTasks()) {
      if (task.enabled) {
        results.push(await this.runTask(task.id))
      }
    }
    return results
  }

  getExecutionLogs(taskId: string): TaskExecution[] {
    return this.executionLogs.get(taskId) ?? []
  }

  getAllExecutionLogs(): TaskExecution[] {
    const all: TaskExecution[] = []
    for (const logs of this.executionLogs.values()) {
      all.push(...logs)
    }
    return all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  }

  getAverageDuration(taskId: string): number {
    const logs = this.executionLogs.get(taskId) ?? []
    if (logs.length === 0) return 0
    return logs.reduce((s, l) => s + (l.duration ?? 0), 0) / logs.length
  }

  setEnabled(id: string, enabled: boolean): void {
    this.registry.setEnabled(id, enabled)
  }

  clear(): void {
    this.registry.clear()
    this.executionLogs.clear()
  }
}
