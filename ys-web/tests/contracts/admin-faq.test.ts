import { describe, it, expect } from 'vitest'
import { adminFaqSchema } from '@/lib/schemas/admin'

/**
 * ARCH-001 regression — the Admin FAQ contract.
 *
 * The backend Admin FAQ endpoints return the bilingual-by-field shape
 * (question_en/question_ar/...). The old page read the PUBLIC localized
 * keys (question/answer) and crashed on item.answer.slice(undefined).
 * These tests pin the admin contract and prove the broken public-shaped
 * payload can never parse again.
 */

const realBackendFaq = {
  id: 'a13e1b1e-0000-4000-8000-000000000001',
  question_en: 'How do I get started?',
  question_ar: 'كيف أبدأ؟',
  answer_en: 'Contact us through the form.',
  answer_ar: 'تواصل معنا عبر النموذج.',
  highlight_en: 'Design • Build • Systems',
  highlight_ar: 'تصميم • بناء • أنظمة',
  category: 'general',
  status: 'published',
  sort_order: 2,
  creator: { id: 'u-1', name: 'Admin One' },
  created_at: '2026-01-15T10:00:00+00:00',
  updated_at: '2026-01-15T10:00:00+00:00',
  deleted_at: null,
}

describe('adminFaqSchema', () => {
  it('accepts the real Admin FAQ response shape', () => {
    const parsed = adminFaqSchema.parse(realBackendFaq)
    expect(parsed.question_en).toBe('How do I get started?')
    expect(parsed.answer_en.slice(0, 120)).toBe('Contact us through the form.')
    expect(parsed.creator?.name).toBe('Admin One')
  })

  it('accepts a creator-less list row (relation not loaded)', () => {
    const { creator: _creator, ...row } = realBackendFaq
    const parsed = adminFaqSchema.parse(row)
    expect(parsed.creator).toBeUndefined()
  })

  it('rejects the old public-shaped payload that crashed the admin list', () => {
    const publicShaped = {
      id: realBackendFaq.id,
      question: 'How do I get started?',
      answer: 'Contact us through the form.',
      highlight: 'Design • Build • Systems',
      category: 'general',
    }
    expect(() => adminFaqSchema.parse(publicShaped)).toThrow()
  })

  it('validates every item in an admin list response', () => {
    const items = adminFaqSchema.array().parse([realBackendFaq, realBackendFaq])
    expect(items).toHaveLength(2)
    expect(() => adminFaqSchema.array().parse([realBackendFaq, { id: 'x', question: 'wrong shape' }])).toThrow()
  })

  it('rejects a payload missing required bilingual fields', () => {
    const { answer_en: _answerEn, ...incomplete } = realBackendFaq
    expect(() => adminFaqSchema.parse(incomplete)).toThrow()
  })
})