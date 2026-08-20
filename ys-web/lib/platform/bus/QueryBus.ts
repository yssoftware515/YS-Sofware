import type { Query, QueryHandler, BusMiddleware, BusResult, DispatchOptions } from './types'
import { MiddlewarePipeline } from './MiddlewarePipeline'

export interface QueryHandlerEntry {
  handler: QueryHandler<any, any>
  moduleId?: string
  cacheTtl?: number
  authorization?: (query: Query) => boolean | Promise<boolean>
}

export interface QueryCache {
  get(key: string): Promise<unknown | null>
  set(key: string, value: unknown, ttl: number): Promise<void>
  has(key: string): Promise<boolean>
}

export class QueryBus {
  private handlers = new Map<string, QueryHandlerEntry>()
  private pipeline = new MiddlewarePipeline<{ query: Query; options?: DispatchOptions }>()
  private cache: QueryCache | null = null
  private history: Array<{ query: string; success: boolean; duration: number; cached: boolean; error?: string; timestamp: string }> = []
  private maxHistory = 200

  registerHandler<TQuery extends Query, TResult>(type: string, handler: QueryHandler<TQuery, TResult>, moduleId?: string): void {
    if (this.handlers.has(type)) throw new Error(`Query handler already registered for type: ${type}`)
    this.handlers.set(type, { handler, moduleId })
  }

  replaceHandler<TQuery extends Query, TResult>(type: string, handler: QueryHandler<TQuery, TResult>, moduleId?: string): void {
    this.handlers.set(type, { handler, moduleId })
  }

  hasHandler(type: string): boolean {
    return this.handlers.has(type)
  }

  setHandlerCache(type: string, ttl: number): void {
    const entry = this.handlers.get(type)
    if (entry) entry.cacheTtl = ttl
  }

  setHandlerAuthorization(type: string, auth: (query: Query) => boolean | Promise<boolean>): void {
    const entry = this.handlers.get(type)
    if (entry) entry.authorization = auth
  }

  setCache(cache: QueryCache): void {
    this.cache = cache
  }

  use(middleware: BusMiddleware<{ query: Query; options?: DispatchOptions }>): void {
    this.pipeline.use(middleware as any)
  }

  async execute<TQuery extends Query, TResult>(query: TQuery, options?: DispatchOptions): Promise<BusResult<TResult>> {
    const start = performance.now()
    let cached = false

    try {
      const entry = this.handlers.get(query.type)
      if (!entry) throw new Error(`No handler registered for query: ${query.type}`)

      if (entry.authorization) {
        const allowed = await entry.authorization(query)
        if (!allowed) throw new Error(`Authorization denied for query: ${query.type}`)
      }

      const cacheKey = `query:${query.type}:${JSON.stringify(query)}`

      if (entry.cacheTtl && this.cache) {
        const cachedResult = await this.cache.get(cacheKey)
        if (cachedResult !== null) {
          cached = true
          const duration = performance.now() - start
          this.history.push({ query: query.type, success: true, duration, cached: true, timestamp: new Date().toISOString() })
          return { success: true, data: cachedResult as TResult, duration }
        }
      }

      const context = { query: { ...query, metadata: { ...query.metadata, correlationId: options?.correlationId } as any }, options }

      const result = await this.pipeline.execute(context, async () => {
        return entry.handler.handle(query)
      }) as TResult

      if (entry.cacheTtl && this.cache) {
        await this.cache.set(cacheKey, result, entry.cacheTtl)
      }

      const duration = performance.now() - start
      this.history.push({ query: query.type, success: true, duration, cached: false, timestamp: new Date().toISOString() })
      if (this.history.length > this.maxHistory) this.history.shift()

      return { success: true, data: result as TResult, duration }
    } catch (e) {
      const duration = performance.now() - start
      const error = e instanceof Error ? e.message : String(e)
      this.history.push({ query: query.type, success: false, duration, cached: false, error, timestamp: new Date().toISOString() })
      if (this.history.length > this.maxHistory) this.history.shift()
      return { success: false, error, duration }
    }
  }

  getHandlerInfo(type: string): QueryHandlerEntry | undefined {
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
