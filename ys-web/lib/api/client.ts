import { ensureXsrfToken, readXsrfToken } from '@/lib/csrf'
import { API_BASE } from '@/lib/api/config'
import type {
  ApiResponse, Service, ServiceDetail,
  PublicSettings, SearchResult,
} from '@/types'

export interface SearchResponse {
  results: SearchResult[]
  grouped: Record<string, SearchResult[]>
  meta: {
    total: number
    query: string
    took_ms: number
    driver: string
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, locale = 'en'): Promise<T> {
  // G-01: stateful browser POSTs (contact form, admin mutations) are
  // CSRF-gated by the API. Prime the XSRF-TOKEN cookie and echo it on
  // non-GET; server-side fetches are never gated (no Origin/cookies).
  if ((options.method ?? 'GET').toUpperCase() !== 'GET') {
    await ensureXsrfToken(API_BASE)
  }
  const xsrf = (options.method ?? 'GET').toUpperCase() !== 'GET' ? readXsrfToken() : null

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type':   'application/json',
      'Accept':         'application/json',
      'Accept-Language': locale,
      ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
      ...options.headers,
    },
    // Caller-provided next options win (Phase 4A, INT-007); the 60s
    // revalidation is only the default when the caller says nothing.
    next: options.next ?? { revalidate: 60 },
  })

  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? 'API error')
  }
  return body.data as T
}

export const api = {
  settings: (locale = 'en') =>
    request<PublicSettings>('/public/settings', {}, locale),

  services: (locale = 'en') =>
    request<Service[]>('/public/services', {}, locale),

  service: (slug: string, locale = 'en') =>
    request<ServiceDetail>(`/public/services/${slug}`, {}, locale),

  // Search — never cached, results must reflect current DB state
  search: (query: string, locale = 'en', types: string[] = [], limit = 10) => {
    const params = new URLSearchParams({ q: query, locale, limit: String(limit) })
    types.forEach(t => params.append('types[]', t))
    return request<SearchResponse>(`/public/search?${params.toString()}`, { next: { revalidate: 0 } }, locale)
  },

  contact: (data: unknown, locale = 'en') =>
    request('/public/contact', { method: 'POST', body: JSON.stringify(data), next: { revalidate: 0 } }, locale),
}

export function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    credentials: 'include',
    headers: { ...options.headers },
    next: options.next ?? { revalidate: 0 },
  })
}
