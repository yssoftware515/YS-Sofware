import { afterEach, describe, it, expect, vi } from 'vitest'
import { adminGet, adminList } from '@/lib/admin/api'
import { adminProjectListItemSchema } from '@/lib/schemas/admin'

/**
 * Client-boundary validation (ARCH-005).
 *
 * The shared schemas must be wired into the API client: a contract drift
 * fails loudly at the boundary instead of reaching the page as undefined.
 */

const validProject = {
  id: 'a13e1b1e-0000-4000-8000-000000000001',
  name: 'Website Redesign',
  status: 'active',
  quoted_value: '5000.00',
  currency: 'USD',
  is_overdue: false,
  expected_completion_date: '2026-03-01',
}

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

describe('adminGet with schema', () => {
  it('parses a valid response at the boundary', async () => {
    stubFetch({ success: true, data: validProject })

    const result = await adminGet('/admin/projects/1', { schema: adminProjectListItemSchema })

    expect(result.name).toBe('Website Redesign')
  })

  it('rejects an old-shaped project response instead of returning it unchecked', async () => {
    stubFetch({
      success: true,
      data: { id: validProject.id, name: 'Website Redesign' },
    })

    await expect(adminGet('/admin/projects/1', { schema: adminProjectListItemSchema })).rejects.toThrow()
  })

  it('still surfaces API errors before schema validation', async () => {
    stubFetch({ success: false, message: 'Unauthorized.' }, false, 401)

    await expect(adminGet('/admin/projects/1', { schema: adminProjectListItemSchema })).rejects.toMatchObject({ status: 401 })
  })
})

describe('adminList with schema', () => {
  it('parses every item in a list response', async () => {
    stubFetch({
      success: true,
      data: [validProject, { ...validProject, id: 'a13e1b1e-0000-4000-8000-000000000002' }],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 2 },
    })

    const result = await adminList('/admin/projects', undefined, { schema: adminProjectListItemSchema })

    expect(result).toHaveLength(2)
  })

  it('rejects a list containing one invalid item', async () => {
    stubFetch({
      success: true,
      data: [validProject, { id: 'x', name: 'wrong shape' }],
    })

    await expect(adminList('/admin/projects', undefined, { schema: adminProjectListItemSchema })).rejects.toThrow()
  })
})
