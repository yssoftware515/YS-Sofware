import { afterEach, describe, it, expect, vi } from 'vitest'
import { adminGet, adminList } from '@/lib/admin/api'
import { adminFaqSchema } from '@/lib/schemas/admin'

/**
 * Client-boundary validation (ARCH-005).
 *
 * The shared schemas must be wired into the API client: a contract drift
 * fails loudly at the boundary instead of reaching the page as undefined.
 */

const validFaq = {
  id: 'a13e1b1e-0000-4000-8000-000000000001',
  question_en: 'How do I get started?',
  question_ar: 'كيف أبدأ؟',
  answer_en: 'Contact us.',
  answer_ar: 'تواصل معنا.',
  highlight_en: null,
  highlight_ar: null,
  category: 'general',
  status: 'published',
  sort_order: 0,
  creator: null,
  created_at: '2026-01-15T10:00:00+00:00',
  updated_at: null,
  deleted_at: null,
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
    stubFetch({ success: true, data: validFaq })

    const result = await adminGet('/admin/faqs/1', { schema: adminFaqSchema })

    expect(result.question_en).toBe('How do I get started?')
  })

  it('rejects an old-shaped FAQ response instead of returning it unchecked', async () => {
    stubFetch({
      success: true,
      data: { id: validFaq.id, question: 'How do I get started?', answer: 'Contact us.', category: 'general' },
    })

    await expect(adminGet('/admin/faqs/1', { schema: adminFaqSchema })).rejects.toThrow()
  })

  it('still surfaces API errors before schema validation', async () => {
    stubFetch({ success: false, message: 'Unauthorized.' }, false, 401)

    await expect(adminGet('/admin/faqs/1', { schema: adminFaqSchema })).rejects.toMatchObject({ status: 401 })
  })
})

describe('adminList with schema', () => {
  it('parses every item in a list response', async () => {
    stubFetch({
      success: true,
      data: [validFaq, { ...validFaq, id: 'a13e1b1e-0000-4000-8000-000000000002' }],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 2 },
    })

    const result = await adminList('/admin/faqs', undefined, { schema: adminFaqSchema })

    expect(result).toHaveLength(2)
  })

  it('rejects a list containing one invalid item', async () => {
    stubFetch({
      success: true,
      data: [validFaq, { id: 'x', question: 'wrong shape' }],
    })

    await expect(adminList('/admin/faqs', undefined, { schema: adminFaqSchema })).rejects.toThrow()
  })
})