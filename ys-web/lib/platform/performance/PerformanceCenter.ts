import type { CacheRule, CachedFragment } from './types'

export class PerformanceCenter {
  private rules: CacheRule[] = []
  private fragments: Map<string, CachedFragment> = new Map()
  private warmupCache: Set<string> = new Set()
  private cdnEndpoints: Array<{ name: string; url: string; enabled: boolean }> = []

  addCacheRule(rule: CacheRule): void {
    const existing = this.rules.findIndex(r => r.pattern === rule.pattern)
    if (existing >= 0) this.rules[existing] = rule
    else this.rules.push(rule)
  }

  removeCacheRule(pattern: string): void {
    this.rules = this.rules.filter(r => r.pattern !== pattern)
  }

  getCacheRules(): CacheRule[] {
    return [...this.rules]
  }

  getCacheRuleForUrl(url: string): CacheRule | undefined {
    return this.rules.find(r => url.includes(r.pattern))
  }

  setFragment(key: string, content: string, tags?: string[], ttl?: number): void {
    this.fragments.set(key, {
      key, content,
      tags: tags ?? [],
      expiresAt: new Date(Date.now() + (ttl ?? 3600) * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    })
  }

  getFragment(key: string): string | null {
    const f = this.fragments.get(key)
    if (!f) return null
    if (new Date() > new Date(f.expiresAt)) {
      this.fragments.delete(key)
      return null
    }
    return f.content
  }

  invalidateFragment(key: string): void {
    this.fragments.delete(key)
  }

  invalidateByTag(tag: string): void {
    for (const [key, f] of this.fragments) {
      if (f.tags.includes(tag)) this.fragments.delete(key)
    }
  }

  clearCache(): void {
    this.fragments.clear()
  }

  markWarmup(path: string): void {
    this.warmupCache.add(path)
  }

  isWarmedUp(path: string): boolean {
    return this.warmupCache.has(path)
  }

  getWarmupPaths(): string[] {
    return [...this.warmupCache]
  }

  registerCdnEndpoint(name: string, url: string): void {
    this.cdnEndpoints.push({ name, url, enabled: true })
  }

  removeCdnEndpoint(name: string): void {
    this.cdnEndpoints = this.cdnEndpoints.filter(e => e.name !== name)
  }

  getCdnEndpoints(): Array<{ name: string; url: string; enabled: boolean }> {
    return [...this.cdnEndpoints]
  }

  getStats() {
    return {
      cacheRules: this.rules.length,
      cachedFragments: this.fragments.size,
      warmedPaths: this.warmupCache.size,
      cdnEndpoints: this.cdnEndpoints.length,
    }
  }

  clear(): void {
    this.rules = []
    this.fragments.clear()
    this.warmupCache.clear()
    this.cdnEndpoints = []
  }
}
