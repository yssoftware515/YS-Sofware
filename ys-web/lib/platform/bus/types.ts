export interface Command {
  readonly type: string
  readonly metadata?: Record<string, unknown>
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>
}

export interface Query {
  readonly type: string
  readonly metadata?: Record<string, unknown>
}

export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<TResult>
}

export interface BusMiddleware<T> {
  execute(context: T, next: () => Promise<unknown>): Promise<unknown>
}

export interface BusResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  duration: number
}

export interface DispatchOptions {
  correlationId?: string
  retries?: number
  timeout?: number
  priority?: number
}
