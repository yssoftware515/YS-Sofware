import { describe, it, expect } from 'vitest'
import { adminProjectDetailSchema } from '@/lib/schemas/admin'

/**
 * ARCH-002 regression — the Project detail contract.
 *
 * The project detail response carries `creator` ({ id, name }) and a
 * delivery block; the old page read `created_by` (never present) and
 * silently dropped the creator line.
 */

const realProjectDetail = {
  id: 'p-1',
  name: 'Acme Portal',
  customer_id: 'c-1',
  customer: { id: 'c-1', name: 'Acme Ltd', company: 'Acme Ltd' },
  contact_request_id: 'r-1',
  contact_request: {
    id: 'r-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    request_type: 'web_platform',
    status: 'new',
  },
  project_type: 'web_platform',
  description: 'Full platform build.',
  status: 'active',
  start_date: '2026-02-01',
  expected_completion_date: '2026-06-01',
  completed_at: null,
  quoted_value: '45000.00',
  currency: 'USD',
  internal_notes: null,
  services: [{ id: 's-1', name_en: 'Web Platform', name_ar: 'منصة ويب' }],
  creator: { id: 'u-1', name: 'Admin One' },
  created_at: '2026-01-15T10:00:00+00:00',
  updated_at: '2026-01-15T10:00:00+00:00',
  is_overdue: false,
  days_overdue: null,
  delivery: {
    total_tasks: 4,
    completed_tasks: 1,
    remaining_tasks: 3,
    blocked_tasks: 0,
    overdue_tasks: 1,
    total_milestones: 2,
    completed_milestones: 0,
    overdue_milestones: 0,
    next_milestone: { id: 'm-1', title: 'Launch', target_date: '2026-05-01' },
    next_due_task: null,
  },
}

describe('adminProjectDetailSchema', () => {
  it('accepts the real project detail response with creator', () => {
    const parsed = adminProjectDetailSchema.parse(realProjectDetail)
    expect(parsed.creator?.name).toBe('Admin One')
    expect(parsed.delivery.next_milestone?.title).toBe('Launch')
    expect(parsed.services[0].name_en).toBe('Web Platform')
  })

  it('never exposes the legacy created_by key after validation', () => {
    // creator is optional on the wire (relation not always loaded), so a
    // payload without it is still valid — but the validated boundary
    // output must not carry the legacy created_by field: pages typed as
    // AdminProjectDetail cannot read created_by (compile error).
    const legacy = { ...realProjectDetail, created_by: 'Admin One' }
    delete legacy.creator
    const parsed = adminProjectDetailSchema.parse(legacy)
    expect('created_by' in parsed).toBe(false)
  })

  it('accepts a project without a linked customer or request', () => {
    const unlinked = {
      ...realProjectDetail,
      customer_id: null,
      customer: null,
      contact_request_id: null,
      contact_request: null,
    }
    const parsed = adminProjectDetailSchema.parse(unlinked)
    expect(parsed.customer).toBeNull()
    expect(parsed.contact_request).toBeNull()
  })

  it('rejects a detail payload missing the delivery block', () => {
    const { delivery: _delivery, ...incomplete } = realProjectDetail
    expect(() => adminProjectDetailSchema.parse(incomplete)).toThrow()
  })
})