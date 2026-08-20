export interface Middleware<T> {
  execute(context: T, next: () => Promise<unknown>): Promise<unknown>
}

export class MiddlewarePipeline<T> {
  private middlewares: Array<Middleware<T>> = []

  use(middleware: Middleware<T>): void {
    this.middlewares.push(middleware)
  }

  prepend(middleware: Middleware<T>): void {
    this.middlewares.unshift(middleware)
  }

  remove(predicate: (m: Middleware<T>) => boolean): void {
    this.middlewares = this.middlewares.filter(m => !predicate(m))
  }

  async execute(context: T, final: () => Promise<unknown>): Promise<unknown> {
    let index = -1

    const runner = async (i: number): Promise<unknown> => {
      if (i <= index) throw new Error('next() called multiple times')
      index = i
      if (i >= this.middlewares.length) return final()
      return this.middlewares[i].execute(context, () => runner(i + 1))
    }

    return runner(0)
  }

  clear(): void {
    this.middlewares = []
  }

  getMiddlewares(): Array<Middleware<T>> {
    return [...this.middlewares]
  }

  count(): number {
    return this.middlewares.length
  }
}

export function createLoggingMiddleware<T>(label: string, logger?: { info: (msg: string, ctx?: unknown) => void }): Middleware<T> {
  return {
    execute: async (context: T, next: () => Promise<unknown>) => {
      const start = performance.now()
      try {
        const result = await next()
        const duration = performance.now() - start
        logger?.info(`${label} completed in ${duration.toFixed(2)}ms`, context)
        return result
      } catch (e) {
        const duration = performance.now() - start
        logger?.info(`${label} failed after ${duration.toFixed(2)}ms`, context)
        throw e
      }
    },
  }
}

export function createMetricsMiddleware<T>(label: string, monitor?: { record: (name: string, value: number, unit: string) => void }): Middleware<T> {
  return {
    execute: async (context: T, next: () => Promise<unknown>) => {
      const start = performance.now()
      try {
        const result = await next()
        const duration = performance.now() - start
        monitor?.record(`middleware.${label}`, duration, 'ms')
        return result
      } catch (e) {
        const duration = performance.now() - start
        monitor?.record(`middleware.${label}.error`, duration, 'ms')
        throw e
      }
    },
  }
}

export function createPermissionMiddleware<T extends { metadata?: Record<string, unknown> }>(
  permissionCheck: (ctx: T) => boolean | Promise<boolean>,
): Middleware<T> {
  return {
    execute: async (context: T, next: () => Promise<unknown>) => {
      const allowed = await permissionCheck(context)
      if (!allowed) throw new Error(`Permission denied for ${context.metadata?.type ?? 'unknown'}`)
      return next()
    },
  }
}

export function createValidationMiddleware<T>(validator: (ctx: T) => string | null): Middleware<T> {
  return {
    execute: async (context: T, next: () => Promise<unknown>) => {
      const error = validator(context)
      if (error) throw new Error(`Validation failed: ${error}`)
      return next()
    },
  }
}

export function createFeatureFlagMiddleware<T>(flagEngine: { isEnabled: (key: string) => boolean }, flagKey: string): Middleware<T> {
  return {
    execute: async (context: T, next: () => Promise<unknown>) => {
      if (!flagEngine.isEnabled(flagKey)) throw new Error(`Feature flag "${flagKey}" is disabled`)
      return next()
    },
  }
}

export function createRateLimitMiddleware<T>(maxPerSecond: number, keyFn?: (ctx: T) => string): Middleware<T> {
  const windowMs = 1000
  const maxBuckets = 1000
  const buckets = new Map<string, { count: number; resetAt: number }>()

  const getKey = (ctx: T): string => {
    if (keyFn) return keyFn(ctx)
    if (typeof ctx === 'object' && ctx !== null) {
      const obj = ctx as Record<string, unknown>
      const id = obj.id ?? obj.name ?? obj.metadata ?? Object.keys(obj).slice(0, 3).join(',')
      return String(id)
    }
    return String(ctx)
  }

  return {
    execute: async (context: T, next: () => Promise<unknown>) => {
      const key = getKey(context)
      const now = Date.now()
      const bucket = buckets.get(key) ?? { count: 0, resetAt: now + windowMs }

      if (now > bucket.resetAt) {
        bucket.count = 0
        bucket.resetAt = now + windowMs
      }

      bucket.count++
      buckets.set(key, bucket)

      if (buckets.size > maxBuckets) {
        const oldest = buckets.keys().next().value
        if (oldest !== undefined) buckets.delete(oldest)
      }

      if (bucket.count > maxPerSecond) throw new Error('Rate limit exceeded')
      return next()
    },
  }
}
