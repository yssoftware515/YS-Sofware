import { afterEach, describe, it, expect, vi } from 'vitest'
import { loadAuditLogs } from '@/app/admin/audit-logs/page'
import { loadSettings } from '@/app/admin/settings/page'

/**
 * Phase 4A (P6): the admin load paths must FAIL LOUDLY so the pages can
 * render a visible error state. A silent `.then(body => ...)` swallowing
 * network/API failures (blank settings list, empty audit table) is the
 * regression this guards.
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

function stubNetworkFailure(): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('settings load path', () => {
  it('resolves settings on a successful response', async () => {
    stubFetch({ success: true, data: [{ id: '1', group: 'brand', key: 'site_name', value: 'YS', description: null, is_public: true }] })

    await expect(loadSettings()).resolves.toHaveLength(1)
  })

  it('rejects on network failure (page shows the error state)', async () => {
    stubNetworkFailure()

    await expect(loadSettings()).rejects.toThrow()
  })

  it('rejects on an API error (page shows the error state)', async () => {
    stubFetch({ success: false, message: 'Unauthorized.' }, false, 401)

    await expect(loadSettings()).rejects.toMatchObject({ status: 401 })
  })
})

describe('audit-logs load path', () => {
  it('resolves logs on a successful response', async () => {
    stubFetch({
      success: true,
      data: [{ id: '1', action: 'product.created', resource_type: 'Product', resource_id: null, user: null, ip_address: null, created_at: '2026-08-01T10:00:00+00:00' }],
    })

    await expect(loadAuditLogs()).resolves.toHaveLength(1)
  })

  it('rejects on network failure (page shows the error state, not a silent empty table)', async () => {
    stubNetworkFailure()

    await expect(loadAuditLogs()).rejects.toThrow()
  })

  it('rejects on an API error (page shows the error state)', async () => {
    stubFetch({ success: false, message: 'Forbidden.' }, false, 403)

    await expect(loadAuditLogs()).rejects.toMatchObject({ status: 403 })
  })
})
