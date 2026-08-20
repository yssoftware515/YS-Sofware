import type { SearchDriver, SearchParams, SearchResult, SearchDocument } from '../types'

export class DatabaseDriver implements SearchDriver {
  private documents: SearchDocument[] = []

  isAvailable(): boolean {
    return true
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const q = params.query.toLowerCase()
    const page = params.page ?? 1
    const perPage = params.perPage ?? 10

    let results = this.documents.filter(d => {
      const matchesQuery = !q || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
      const matchesModule = !params.filters?.moduleId || d.moduleId === params.filters.moduleId
      const matchesType = !params.filters?.type || d.type === params.filters.type
      return matchesQuery && matchesModule && matchesType
    })

    results = results.map(d => ({
      ...d,
      score: this.calculateScore(d, q),
    })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    const total = results.length
    const totalPages = Math.ceil(total / perPage)
    const paginated = results.slice((page - 1) * perPage, page * perPage)

    return {
      documents: paginated,
      total,
      page,
      perPage,
      totalPages,
      query: params.query,
      duration: 0,
    }
  }

  private calculateScore(doc: SearchDocument, query: string): number {
    if (!query) return 1
    let score = 0
    const titleLower = doc.title.toLowerCase()
    const contentLower = doc.content.toLowerCase()
    if (titleLower === query) score += 10
    else if (titleLower.startsWith(query)) score += 8
    else if (titleLower.includes(query)) score += 5
    if (contentLower.includes(query)) score += 2
    return score
  }

  async index(document: SearchDocument): Promise<void> {
    const existing = this.documents.findIndex(d => d.id === document.id)
    if (existing >= 0) {
      this.documents[existing] = document
    } else {
      this.documents.push(document)
    }
  }

  async update(document: SearchDocument): Promise<void> {
    await this.index(document)
  }

  async delete(id: string): Promise<void> {
    this.documents = this.documents.filter(d => d.id !== id)
  }

  async clear(): Promise<void> {
    this.documents = []
  }
}
