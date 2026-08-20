export interface CacheDriver {
  get(key: string): Promise<unknown | null>
  set(key: string, value: unknown, ttl: number): Promise<void>
  forget(key: string): Promise<void>
  clear(): Promise<void>
  has(key: string): Promise<boolean>
  statistics(): CacheStats
}

export interface CacheStats {
  hits: number
  misses: number
  keys: number
  memory?: number
}

export interface TaggedCache {
  tags: string[]
  remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T>
}

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  tags?: string[]
}
