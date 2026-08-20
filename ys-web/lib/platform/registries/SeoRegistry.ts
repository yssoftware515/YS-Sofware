export interface SeoContribution {
  moduleId: string
  routePattern: string
  titleEn?: string
  titleAr?: string
  descriptionEn?: string
  descriptionAr?: string
}

export class SeoRegistry {
  private contributions: SeoContribution[] = []

  registerContribution(contribution: SeoContribution): void {
    this.contributions.push(contribution)
  }

  getContributions(): SeoContribution[] {
    return [...this.contributions]
  }

  findByRoute(route: string): SeoContribution | undefined {
    return this.contributions.find(c => c.routePattern === route)
  }

  clear(): void {
    this.contributions = []
  }
}
