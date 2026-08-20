import type { Command, CommandHandler, BusMiddleware, BusResult, DispatchOptions } from './types'
import { MiddlewarePipeline } from './MiddlewarePipeline'

export interface CommandHandlerEntry {
  handler: CommandHandler<any, any>
  moduleId?: string
}

export class CommandBus {
  private handlers = new Map<string, CommandHandlerEntry>()
  private pipeline = new MiddlewarePipeline<{ command: Command; options?: DispatchOptions }>()
  private history: Array<{ command: string; success: boolean; duration: number; error?: string; timestamp: string }> = []
  private maxHistory = 200

  registerHandler<TCommand extends Command, TResult>(type: string, handler: CommandHandler<TCommand, TResult>, moduleId?: string): void {
    if (this.handlers.has(type)) throw new Error(`Command handler already registered for type: ${type}`)
    this.handlers.set(type, { handler, moduleId })
  }

  replaceHandler<TCommand extends Command, TResult>(type: string, handler: CommandHandler<TCommand, TResult>, moduleId?: string): void {
    this.handlers.set(type, { handler, moduleId })
  }

  hasHandler(type: string): boolean {
    return this.handlers.has(type)
  }

  use(middleware: BusMiddleware<{ command: Command; options?: DispatchOptions }>): void {
    this.pipeline.use(middleware as any)
  }

  async dispatch<TCommand extends Command, TResult = void>(command: TCommand, options?: DispatchOptions): Promise<BusResult<TResult>> {
    const start = performance.now()
    const correlationId = options?.correlationId ?? `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    try {
      const entry = this.handlers.get(command.type)
      if (!entry) throw new Error(`No handler registered for command: ${command.type}`)

      const context = { command: { ...command, metadata: { ...command.metadata, correlationId, ...options } as any }, options }

      const result = await this.pipeline.execute(context, async () => {
        return entry.handler.handle(command)
      }) as TResult

      const duration = performance.now() - start
      this.history.push({ command: command.type, success: true, duration, timestamp: new Date().toISOString() })
      if (this.history.length > this.maxHistory) this.history.shift()

      return { success: true, data: result as TResult, duration }
    } catch (e) {
      const duration = performance.now() - start
      const error = e instanceof Error ? e.message : String(e)
      this.history.push({ command: command.type, success: false, duration, error, timestamp: new Date().toISOString() })
      if (this.history.length > this.maxHistory) this.history.shift()
      return { success: false, error, duration }
    }
  }

  getHandlerInfo(type: string): CommandHandlerEntry | undefined {
    return this.handlers.get(type)
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  getHistory() {
    return [...this.history]
  }

  getMiddlewareCount(): number {
    return this.pipeline.count()
  }

  clear(): void {
    this.handlers.clear()
    this.pipeline.clear()
    this.history = []
  }
}
