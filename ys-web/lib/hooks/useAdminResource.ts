import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/admin/Toast'
import type { ZodType } from 'zod'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/**
 * useAdminList — the single place list pages fetch admin resources from.
 *
 * Replaces the copy-pasted `useState + useEffect + fetch + try/catch`
 * block that existed independently in 15 admin pages — one of which had an
 * empty `catch {}` that silently hid every network failure from the admin.
 * A shared hook means that class of bug can only exist in one place, not
 * fifteen, and gets caught (and fixed) once instead of once per page.
 *
 * @param resource   API path, e.g. 'products' or '/admin/products'.
 * @param searchParams  optional query string params (search, filters, page).
 */
// Accepts both legacy bare segments ('products') and fully-qualified
// paths ('/admin/products'); callers control the prefix, never the hook.
function adminPath(resource: string): string {
  return resource.startsWith('/') ? resource : `/admin/${resource}`
}

export interface PageMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface PaginatedList<T> {
  items: T[]
  meta: PageMeta
}

/**
 * useAdminList — paginated list queries. `{ withMeta: true }` returns
 * `{ items, meta }` so pages can render pager controls; the default
 * shape stays a plain array for all existing callers. `schema` validates
 * every item at the client boundary (see lib/schemas/admin.ts).
 */
export function useAdminList<T>(resource: string, searchParams: Record<string, string> | undefined, opts: { withMeta: true; schema?: ZodType<T> }): ReturnType<typeof useQuery<PaginatedList<T>>>
export function useAdminList<T>(resource: string, searchParams?: Record<string, string>, opts?: { withMeta?: false; schema?: ZodType<T> }): ReturnType<typeof useQuery<T[]>>
export function useAdminList<T>(resource: string, searchParams?: Record<string, string>, opts: { withMeta?: boolean; schema?: ZodType<T> } = {}) {
  const path = adminPath(resource)
  const qs = searchParams && Object.keys(searchParams).length
    ? `?${new URLSearchParams(searchParams).toString()}`
    : ''

  const queryKey = [path, searchParams ?? {}]

  const queryFn = async () => {
    const res = await fetch(`${API}${path}${qs}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Failed to load ${resource} (${res.status})`)
    }
    const body = await res.json()
    if (!body.success) {
      throw new Error(body.message ?? `Failed to load ${resource}`)
    }
    const items = opts.schema
      ? (body.data as T[]).map(item => opts.schema!.parse(item))
      : (body.data as T[])
    if (opts.withMeta) {
      return { items, meta: body.meta as PageMeta }
    }
    return items
  }

  return useQuery({ queryKey, queryFn })
}

/**
 * useAdminDelete — delete-by-id mutation for any admin resource.
 * On success, invalidates that resource's list queries so every list view
 * currently on screen refetches automatically — the "update after mutation
 * with zero manual refetch code" behavior TanStack Query exists for.
 */
export function useAdminDelete(resource: string) {
  const queryClient = useQueryClient()
  const { show } = useToast()
  const path = adminPath(resource)

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}${path}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Delete failed.')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [path] })
      show('success', 'Deleted successfully.')
    },
    onError: (err: Error) => {
      show('error', err.message || 'Delete failed.')
    },
  })
}
