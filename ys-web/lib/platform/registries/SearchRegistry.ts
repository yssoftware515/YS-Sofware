export interface SearchProvider {
  id: string
  moduleId: string
  labelEn: string
  labelAr: string
  endpoint: string
}

export class SearchRegistry {
  private providers: SearchProvider[] = []

  registerProvider(provider: SearchProvider): void {
    const existing = this.providers.findIndex(p => p.id === provider.id)
    if (existing >= 0) {
      this.providers[existing] = provider
      return
    }
    this.providers.push(provider)
  }

  getProviders(): SearchProvider[] {
    return [...this.providers]
  }

  clear(): void {
    this.providers = []
  }
}
