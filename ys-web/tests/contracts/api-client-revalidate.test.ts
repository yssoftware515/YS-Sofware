import { afterEach, describe, it, expect, vi } from 'vitest'
import { api } from '@/lib/api/client'

/**
 * INT-007 regression: request() must respect caller-provided `next`
 * options. `next: { revalidate: 60 }` was spread AFTER `...options`,
 * silently overwriting callers (search/contact send revalidate: 0).
 */

function stubFetch(responseBody: unknown, ok = true, status = 200): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => responseBody,
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('revalidate merge behavior', () => {
  it('defaults to 60s revalidation when the caller provides no next options', async () => {
    const mock = stubFetch({ success: true, data: [] })

    await api.settings('en')

    expect(mock.mock.calls[0][1].next).toEqual({ revalidate: 60 })
  })

  it('does not overwrite a caller-provided next option (search = never cached)', async () => {
    const mock = stubFetch({ success: true, data: { results: [], grouped: {}, meta: { total: 0, query: 'x', took_ms: 1, driver: 'fts' } } })

    await api.search('laravel', 'en', [], 10)

    expect(mock.mock.calls[0][1].next).toEqual({ revalidate: 0 })
  })

  it('does not overwrite a caller-provided next option (contact = never cached)', async () => {
    const mock = stubFetch({ success: true, data: null })

    await api.contact({ name: 'Test' }, 'en')

    expect(mock.mock.calls[0][1].next).toEqual({ revalidate: 0 })
    expect(mock.mock.calls[0][1].method).toBe('POST')
  })

  it('still merges caller headers alongside the default next options', async () => {
    const mock = stubFetch({ success: true, data: [] })

    await api.settings('ar')

    expect(mock.mock.calls[0][1].next).toEqual({ revalidate: 60 })
    expect(mock.mock.calls[0][1].headers['Accept-Language']).toBe('ar')
  })
})
