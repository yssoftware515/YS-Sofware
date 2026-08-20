import { describe, it, expect } from 'vitest'
import { FAQ_STATUSES, DEFAULT_FAQ_STATUS } from '@/lib/admin/faq'

/**
 * INT-003 regression — the FAQ publishing lifecycle contract.
 *
 * The public FAQ endpoint only returns status=published rows. The form
 * must always send an explicit status (default published) — otherwise the
 * backend create action stores a draft and the FAQ is silently invisible
 * on the public page.
 */
describe('FAQ publishing contract', () => {
  it('defaults to published so new FAQs are visible publicly', () => {
    expect(DEFAULT_FAQ_STATUS).toBe('published')
  })

  it('supports the exact status set the backend Rule::in accepts', () => {
    expect([...FAQ_STATUSES].sort()).toEqual(['archived', 'draft', 'published'])
  })
})