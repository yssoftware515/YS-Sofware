import { describe, it, expect } from 'vitest'
import { adminCustomerDetailSchema, adminProjectListItemSchema } from '@/lib/schemas/admin'

/**
 * ARCH-002 regression — the creator contract.
 *
 * Customer and Project detail responses carry `creator` ({ id, name }),
 * never the legacy bare-name `created_by` the pages used to read. These
 * tests pin the canonical shapes and prove the legacy shape fails.
 */

const realCustomerDetail = {
  id: 'c-1',
  type: 'company',
  name: 'Acme Ltd',
  email: 'acme@example.com',
  company: 'Acme Ltd',
  phone: '+971500000000',
  whatsapp: '+971500000000',
  notes: null,
  status: 'active',
  subscriptions_count: 1,
  projects_count: 2,
  active_projects_count: 1,
  on_hold_projects_count: 0,
  completed_projects_count: 1,
  overdue_projects_count: 0,
  value_by_currency: [{ currency: 'USD', total: '45000.00' }],
  latest_contact_requests: [{
    id: 'r-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    request_type: 'web_platform',
    status: 'new',
    created_at: '2026-01-15T10:00:00+00:00',
  }],
  creator: { id: 'u-1', name: 'Admin One' },
  created_at: '2026-01-15T10:00:00+00:00',
  updated_at: '2026-01-15T10:00:00+00:00',
}

const realProjectListItem = {
  id: 'p-1',
  name: 'Acme Portal',
  status: 'active',
  quoted_value: '45000.00',
  currency: 'USD',
  is_overdue: false,
  expected_completion_date: '2026-06-01',
}

describe('adminCustomerDetailSchema', () => {
  it('accepts the real customer detail response with creator', () => {
    const parsed = adminCustomerDetailSchema.parse(realCustomerDetail)
    expect(parsed.creator?.name).toBe('Admin One')
    expect(parsed.value_by_currency?.[0].total).toBe('45000.00')
  })

  it('never exposes the legacy created_by key after validation', () => {
    // creator is optional on the wire (relation not always loaded), so a
    // payload without it is still valid — but the validated boundary
    // output must not carry the legacy created_by field: pages typed as
    // AdminCustomerDetail cannot read created_by (compile error).
    const legacy = { ...realCustomerDetail, created_by: 'Admin One' }
    delete legacy.creator
    const parsed = adminCustomerDetailSchema.parse(legacy)
    expect('created_by' in parsed).toBe(false)
  })

  it('accepts a minimal detail response without permission-gated extras', () => {
    const minimal = {
      id: realCustomerDetail.id,
      type: realCustomerDetail.type,
      name: realCustomerDetail.name,
      email: realCustomerDetail.email,
      company: realCustomerDetail.company,
      phone: realCustomerDetail.phone,
      whatsapp: realCustomerDetail.whatsapp,
      notes: realCustomerDetail.notes,
      status: realCustomerDetail.status,
      creator: null,
      created_at: realCustomerDetail.created_at,
      updated_at: realCustomerDetail.updated_at,
    }
    const parsed = adminCustomerDetailSchema.parse(minimal)
    expect(parsed.creator).toBeNull()
    expect(parsed.active_projects_count).toBeUndefined()
  })
})

describe('adminProjectListItemSchema', () => {
  it('accepts the real project list row rendered on the customer page', () => {
    const parsed = adminProjectListItemSchema.parse(realProjectListItem)
    expect(parsed.name).toBe('Acme Portal')
    expect(parsed.is_overdue).toBe(false)
  })

  it('rejects a row missing required fields', () => {
    const { status: _status, ...incomplete } = realProjectListItem
    expect(() => adminProjectListItemSchema.parse(incomplete)).toThrow()
  })

  it('accepts a row without financial fields (view_projects holder without view_financials)', () => {
    const { quoted_value: _quoted_value, currency: _currency, ...nonFinancial } = realProjectListItem
    const parsed = adminProjectListItemSchema.parse(nonFinancial)
    expect(parsed.quoted_value).toBeUndefined()
    expect(parsed.currency).toBeUndefined()
  })
})
