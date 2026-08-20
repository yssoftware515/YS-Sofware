import type { SearchDriver, SearchParams, SearchResult, SearchDocument } from './types'

export class SearchEngine implements SearchDriver {
  private driver: SearchDriver
  private moduleProviders = new Map<string, SearchDriver>()

  constructor(driver: SearchDriver) {
    this.driver = driver
  }

  setDriver(driver: SearchDriver): void {
    this.driver = driver
  }

  registerModuleProvider(moduleId: string, driver: SearchDriver): void {
    if (this.moduleProviders.has(moduleId)) throw new Error(`Search provider already registered for module: ${moduleId}`)
    this.moduleProviders.set(moduleId, driver)
  }

  replaceModuleProvider(moduleId: string, driver: SearchDriver): void {
    this.moduleProviders.set(moduleId, driver)
  }

  removeModuleProvider(moduleId: string): void {
    this.moduleProviders.delete(moduleId)
  }

  async search(params: SearchParams): Promise<SearchResult> {
    if (params.filters?.moduleId && this.moduleProviders.has(params.filters.moduleId as string)) {
      const provider = this.moduleProviders.get(params.filters.moduleId as string)!
      return provider.search(params)
    }
    return this.driver.search(params)
  }

  async searchGlobal(query: string): Promise<SearchDocument[]> {
    const results: SearchDocument[] = []
    for (const [, provider] of this.moduleProviders) {
      try {
        const result = await provider.search({ query, perPage: 5 })
        results.push(...result.documents)
      } catch {
        // Provider failure should not block global search
      }
    }
    const mainResult = await this.driver.search({ query, perPage: 10 })
    results.push(...mainResult.documents)
    return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  async index(document: SearchDocument): Promise<void> {
    if (document.moduleId && this.moduleProviders.has(document.moduleId)) {
      return this.moduleProviders.get(document.moduleId)!.index(document)
    }
    return this.driver.index(document)
  }

  async update(document: SearchDocument): Promise<void> {
    if (document.moduleId && this.moduleProviders.has(document.moduleId)) {
      return this.moduleProviders.get(document.moduleId)!.update(document)
    }
    return this.driver.update(document)
  }

  async delete(id: string): Promise<void> {
    await this.driver.delete(id)
  }

  async clear(): Promise<void> {
    await this.driver.clear()
    for (const [, provider] of this.moduleProviders) {
      await provider.clear()
    }
  }

  isAvailable(): boolean {
    return this.driver.isAvailable()
  }

  getModuleProviders(): string[] {
    return Array.from(this.moduleProviders.keys())
  }
}
