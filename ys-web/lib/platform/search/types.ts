export interface SearchDocument {
  id: string
  title: string
  content: string
  url?: string
  moduleId?: string
  type?: string
  metadata?: Record<string, unknown>
  score?: number
}

export interface SearchFilters {
  moduleId?: string
  type?: string
  [key: string]: unknown
}

export interface SearchParams {
  query: string
  filters?: SearchFilters
  page?: number
  perPage?: number
  highlight?: boolean
}

export interface SearchResult {
  documents: SearchDocument[]
  total: number
  page: number
  perPage: number
  totalPages: number
  query: string
  duration: number
}

export interface SearchDriver {
  search(params: SearchParams): Promise<SearchResult>
  index(document: SearchDocument): Promise<void>
  update(document: SearchDocument): Promise<void>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  isAvailable(): boolean
}
