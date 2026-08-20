import type { CacheDriver, CacheStats, CacheEntry } from '../types'

export class MemoryDriver implements CacheDriver {
  private store = new Map<string, CacheEntry<unknown>>()
  private tagIndex = new Map<string, Set<string>>()
  private hits = 0
  private misses = 0
  private maxSize = 5000

  setMaxSize(max: number): void {
    this.maxSize = max
  }

  private evictIfNeeded(): void {
    if (this.store.size < this.maxSize) return
    const oldest = this.store.keys().next().value
    if (oldest !== undefined) {
      const entry = this.store.get(oldest)
      if (entry?.tags) {
        for (const tag of entry.tags) {
          const keys = this.tagIndex.get(tag)
          if (keys) {
            keys.delete(oldest)
            if (keys.size === 0) this.tagIndex.delete(tag)
          }
        }
      }
      this.store.delete(oldest)
    }
  }

  async get(key: string): Promise<unknown | null> {
    const entry = this.store.get(key)
    if (!entry) {
      this.misses++
      return null
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      this.misses++
      return null
    }
    this.hits++
    return entry.value
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    this.evictIfNeeded()
    this.store.set(key, { value, expiresAt: Date.now() + ttl })
  }

  async setWithTags(key: string, value: unknown, ttl: number, tags: string[]): Promise<void> {
    this.evictIfNeeded()
    this.store.set(key, { value, expiresAt: Date.now() + ttl, tags })
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set())
      this.tagIndex.get(tag)!.add(key)
    }
  }

  async forget(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
    this.tagIndex.clear()
    this.hits = 0
    this.misses = 0
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }
    return true
  }

  async forgetByTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag)
    if (keys) {
      for (const key of keys) {
        this.store.delete(key)
      }
      this.tagIndex.delete(tag)
    }
  }

  async clearExpired(): Promise<number> {
    const now = Date.now()
    let removed = 0
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        if (entry.tags) {
          for (const tag of entry.tags) {
            const keys = this.tagIndex.get(tag)
            if (keys) {
              keys.delete(key)
              if (keys.size === 0) this.tagIndex.delete(tag)
            }
          }
        }
        this.store.delete(key)
        removed++
      }
    }
    return removed
  }

  statistics(): CacheStats {
    return { hits: this.hits, misses: this.misses, keys: this.store.size }
  }
}
