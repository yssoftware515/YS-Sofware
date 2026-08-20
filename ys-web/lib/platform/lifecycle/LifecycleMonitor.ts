import type { LifecycleStage, LifecycleTransition, LifecycleError } from './types'

export class LifecycleMonitor {
  private stages: LifecycleStage[] = [
    'booting', 'initializing', 'loading_config', 'loading_drivers',
    'loading_services', 'loading_modules', 'loading_sdk',
    'ready', 'running', 'maintenance', 'shutting_down', 'shutdown',
  ]

  private current: LifecycleStage | null = null
  private transitions: LifecycleTransition[] = []
  private errors: LifecycleError[] = []
  private listeners = new Map<string, Array<(data: unknown) => void>>()
  private stageStartTimes = new Map<LifecycleStage, number>()
  private stageDurations = new Map<LifecycleStage, number>()

  on(event: string, callback: (data: unknown) => void): void {
    const list = this.listeners.get(event) ?? []
    list.push(callback)
    this.listeners.set(event, list)
  }

  private emit(event: string, data: unknown): void {
    const list = this.listeners.get(event)
    if (list) {
      for (const cb of list) {
        try { cb(data) } catch { /* listener isolation */ }
      }
    }
  }

  enter(stage: LifecycleStage): void {
    const from = this.current
    this.current = stage
    this.stageStartTimes.set(stage, Date.now())

    const transition: LifecycleTransition = {
      from,
      to: stage,
      timestamp: new Date().toISOString(),
      duration: 0,
    }

    this.transitions.push(transition)
    this.emit('lifecycle.stage.entered', { stage, from })
  }

  complete(stage: LifecycleStage): void {
    const startTime = this.stageStartTimes.get(stage)
    if (startTime) {
      const duration = Date.now() - startTime
      this.stageDurations.set(stage, duration)
      this.emit('lifecycle.stage.completed', { stage, duration })
    }

    const lastTransition = this.transitions[this.transitions.length - 1]
    if (lastTransition && lastTransition.to === stage) {
      lastTransition.duration = this.stageDurations.get(stage) ?? 0
    }
  }

  error(stage: LifecycleStage, error: string): void {
    const err: LifecycleError = { stage, error, timestamp: new Date().toISOString() }
    this.errors.push(err)
    this.emit('lifecycle.error', err)
  }

  isIn(stage: LifecycleStage): boolean {
    return this.current === stage
  }

  isAfter(stage: LifecycleStage): boolean {
    if (!this.current) return false
    return this.stages.indexOf(this.current) > this.stages.indexOf(stage)
  }

  isBefore(stage: LifecycleStage): boolean {
    if (!this.current) return false
    return this.stages.indexOf(this.current) < this.stages.indexOf(stage)
  }

  getCurrent(): LifecycleStage | null {
    return this.current
  }

  getTransitions(): LifecycleTransition[] {
    return [...this.transitions]
  }

  getErrors(): LifecycleError[] {
    return [...this.errors]
  }

  getStageDuration(stage: LifecycleStage): number {
    return this.stageDurations.get(stage) ?? 0
  }

  getTotalDuration(): number {
    let total = 0
    for (const duration of this.stageDurations.values()) {
      total += duration
    }
    return total
  }

  getProgress(): number {
    if (!this.current) return 0
    const idx = this.stages.indexOf(this.current)
    return Math.round((idx / (this.stages.length - 1)) * 100)
  }

  canTransitionTo(stage: LifecycleStage): boolean {
    if (!this.current) return stage === 'booting'
    const currentIdx = this.stages.indexOf(this.current)
    const targetIdx = this.stages.indexOf(stage)
    return targetIdx > currentIdx
  }

  reset(): void {
    this.current = null
    this.transitions = []
    this.errors = []
    this.stageStartTimes.clear()
    this.stageDurations.clear()
  }
}
