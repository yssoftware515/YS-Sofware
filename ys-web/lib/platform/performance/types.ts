export interface CacheRule {
  pattern: string
  ttl: number
  tags: string[]
}

export interface CachedFragment {
  key: string
  content: string
  tags: string[]
  expiresAt: string
  createdAt: string
}
