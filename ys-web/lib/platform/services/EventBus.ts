export type EventHandler<T = any> = (payload: T) => void | Promise<void>

interface Listener {
  handler: EventHandler
  priority: number
  moduleId?: string
}

export class EventBus {
  private listeners = new Map<string, Listener[]>()
  private history: Array<{ event: string; timestamp: string; duration: number; success: boolean; error?: string }> = []
  private maxHistory = 200

  on(event: string, handler: EventHandler, priority = 0, moduleId?: string): void {
    const listeners = this.listeners.get(event) || []
    const idx = listeners.findIndex(l => l.priority <= priority)
    if (idx < 0) {
      listeners.push({ handler, priority, moduleId })
    } else {
      listeners.splice(idx, 0, { handler, priority, moduleId })
    }
    this.listeners.set(event, listeners)
  }

  once(event: string, handler: EventHandler, priority = 0, moduleId?: string): void {
    const wrapper: EventHandler = async (payload) => {
      this.off(event, wrapper)
      await handler(payload)
    }
    this.on(event, wrapper, priority, moduleId)
  }

  off(event: string, handler: EventHandler): void {
    const listeners = this.listeners.get(event)
    if (!listeners) return
    const filtered = listeners.filter(l => l.handler !== handler)
    if (filtered.length === 0) {
      this.listeners.delete(event)
    } else {
      this.listeners.set(event, filtered)
    }
  }

  offModule(event: string, moduleId: string): void {
    const listeners = this.listeners.get(event)
    if (!listeners) return
    const filtered = listeners.filter(l => l.moduleId !== moduleId)
    if (filtered.length === 0) {
      this.listeners.delete(event)
    } else {
      this.listeners.set(event, filtered)
    }
  }

  offModuleAll(moduleId: string): void {
    for (const [event, listeners] of this.listeners) {
      const filtered = listeners.filter(l => l.moduleId !== moduleId)
      if (filtered.length === 0) {
        this.listeners.delete(event)
      } else {
        this.listeners.set(event, filtered)
      }
    }
  }

  async emit(event: string, payload?: any): Promise<void> {
    const matchingListeners = this.matchListeners(event)
    const start = performance.now()
    let success = true
    let error: string | undefined

    try {
      for (const listener of matchingListeners) {
        try {
          await listener.handler(payload)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          error = msg
          success = false
        }
      }
    } finally {
      const duration = performance.now() - start
      this.history.push({ event, timestamp: new Date().toISOString(), duration, success, error })
      if (this.history.length > this.maxHistory) this.history.shift()
    }
  }

  private matchListeners(event: string): Listener[] {
    const exact = this.listeners.get(event) || []
    const wildcard = this.listeners.get('*') || []

    const parts = event.split('.')
    const partial: Listener[] = []
    for (let i = parts.length - 1; i > 0; i--) {
      const pattern = parts.slice(0, i).join('.') + '.*'
      const matched = this.listeners.get(pattern)
      if (matched) partial.push(...matched)
    }

    const merged = [...exact, ...partial, ...wildcard]
    if (merged.length <= 1) return merged
    return merged.sort((a, b) => b.priority - a.priority)
  }

  listenerCount(event: string): number {
    return (this.listeners.get(event) || []).length
  }

  getHistory() {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }

  getListenerEvents(): string[] {
    return Array.from(this.listeners.keys())
  }
}
