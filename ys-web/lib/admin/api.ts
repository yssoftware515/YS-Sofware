import type { ZodType } from 'zod'
import { ensureXsrfToken, readXsrfToken } from '@/lib/csrf'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface FetchOptions<T> {
  method?: string
  body?: unknown
  params?: Record<string, string>
  /**
   * Optional zod schema for the response `data` payload. When present,
   * the response is validated at this client boundary — a backend
   * contract drift fails loudly instead of surfacing as undefined
   * renders. See lib/schemas/admin.ts for the admin contracts.
   */
  schema?: ZodType<T>
}

async function adminFetch<T>(endpoint: string, options: FetchOptions<T> = {}): Promise<T> {
  const url = new URL(`${API}${endpoint}`)
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const method = options.method ?? 'GET'

  // G-01: stateful browser requests are CSRF-gated by the API. Prime the
  // XSRF-TOKEN cookie and echo it on every non-GET (see lib/csrf.ts).
  if (method !== 'GET') {
    await ensureXsrfToken(API)
  }
  const xsrf = method !== 'GET' ? readXsrfToken() : null

  const res = await fetch(url.toString(), {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const body = await res.json()
  if (!res.ok || !body.success) {
    throw { status: res.status, message: body.message ?? 'API error', errors: body.errors }
  }
  const data = body.data as T
  return options.schema ? options.schema.parse(data) : data
}

export async function adminList<T>(endpoint: string, params?: Record<string, string>, options?: { schema?: ZodType<T> }) {
  const data = await adminFetch<T[]>(endpoint, { params })
  return options?.schema ? data.map(item => options.schema!.parse(item)) : data
}

export function adminGet<T>(endpoint: string, options?: FetchOptions<T>) {
  return adminFetch<T>(endpoint, options)
}

export function adminCreate<T>(endpoint: string, data: unknown, options?: { schema?: ZodType<T> }) {
  return adminFetch<T>(endpoint, { method: 'POST', body: data, schema: options?.schema })
}

export function adminUpdate<T>(endpoint: string, data: unknown, options?: { schema?: ZodType<T> }) {
  return adminFetch<T>(endpoint, { method: 'PUT', body: data, schema: options?.schema })
}

export function adminPatch<T>(endpoint: string, data: unknown, options?: { schema?: ZodType<T> }) {
  return adminFetch<T>(endpoint, { method: 'PATCH', body: data, schema: options?.schema })
}

export function adminDelete(endpoint: string) {
  return adminFetch<void>(endpoint, { method: 'DELETE' })
}

export { API }