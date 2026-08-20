import type { CacheDriver, CacheStats } from '../types'

export class NullDriver implements CacheDriver {
  async get(): Promise<null> { return null }
  async set(): Promise<void> {}
  async forget(): Promise<void> {}
  async clear(): Promise<void> {}
  async has(): Promise<boolean> { return false }

  statistics(): CacheStats {
    return { hits: 0, misses: 0, keys: 0 }
  }
}
