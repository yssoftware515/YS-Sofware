import { z } from 'zod'

/**
 * Admin API contracts — the shared, validated shapes for admin endpoints.
 *
 * One file, one pattern: every schema mirrors the corresponding backend
 * Admin Resource (the wire contract) and pages import the inferred type
 * instead of inventing page-local shapes. Schemas are validated at the
 * client boundary (see lib/admin/api.ts and lib/hooks/useAdminResource.ts),
 * so a backend contract change fails loudly in the admin UI instead of
 * silently rendering undefined.
 */

/** Creator block — the canonical "who created this record" shape across all Admin resources. */
export const adminCreatorSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const adminCreatorFieldSchema = adminCreatorSchema.nullable().optional()

// ── FAQ (mirrors App\Http\Resources\Admin\FaqResource) ────────────────────
export const adminFaqSchema = z.object({
  id: z.string(),
  question_en: z.string(),
  question_ar: z.string(),
  answer_en: z.string(),
  answer_ar: z.string(),
  highlight_en: z.string().nullable(),
  highlight_ar: z.string().nullable(),
  category: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  sort_order: z.number(),
  creator: adminCreatorFieldSchema,
  created_at: z.string(),
  updated_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
})

export type AdminFaq = z.infer<typeof adminFaqSchema>

// ── Customer detail (mirrors CustomerResource + CustomerController::show extras) ──
export const adminCustomerDetailSchema = z.object({
  id: z.string(),
  type: z.enum(['individual', 'company']),
  name: z.string(),
  email: z.string(),
  company: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.enum(['active', 'archived']),
  subscriptions_count: z.number().optional(),
  projects_count: z.number().optional(),
  // Permission-gated extras (view_projects / view_financials /
  // manage_contact_requests) — absent when the viewer lacks the gate.
  active_projects_count: z.number().optional(),
  on_hold_projects_count: z.number().optional(),
  completed_projects_count: z.number().optional(),
  overdue_projects_count: z.number().optional(),
  value_by_currency: z.array(z.object({
    currency: z.string(),
    total: z.string(),
  })).optional(),
  latest_contact_requests: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    request_type: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
  })).optional(),
  creator: adminCreatorFieldSchema,
  created_at: z.string(),
  updated_at: z.string().nullable(),
})

export type AdminCustomerDetail = z.infer<typeof adminCustomerDetailSchema>

// ── Project list row (subset of the ProjectController::payload contract) ──
export const adminProjectListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled']),
  quoted_value: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  is_overdue: z.boolean(),
  expected_completion_date: z.string().nullable(),
})

export type AdminProjectListItem = z.infer<typeof adminProjectListItemSchema>

// ── Project detail (mirrors ProjectController::payload + delivery block) ──
export const adminProjectDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  customer_id: z.string().nullable(),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    company: z.string().nullable(),
  }).nullable(),
  contact_request_id: z.string().nullable(),
  contact_request: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    request_type: z.string().nullable(),
    status: z.string(),
  }).nullable(),
  project_type: z.enum([
    'website', 'web_platform', 'mobile_app', 'custom_software', 'ai_solution',
    'ai_automation', 'ui_ux', 'branding', 'integration', 'other',
  ]).nullable(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'active', 'on_hold', 'completed', 'cancelled']),
  start_date: z.string().nullable(),
  expected_completion_date: z.string().nullable(),
  completed_at: z.string().nullable(),
  quoted_value: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  internal_notes: z.string().nullable(),
  services: z.array(z.object({
    id: z.string(),
    name_en: z.string(),
    name_ar: z.string(),
  })),
  creator: adminCreatorFieldSchema,
  created_at: z.string(),
  updated_at: z.string().nullable(),
  is_overdue: z.boolean(),
  days_overdue: z.number().nullable(),
  delivery: z.object({
    total_tasks: z.number(),
    completed_tasks: z.number(),
    remaining_tasks: z.number(),
    blocked_tasks: z.number(),
    overdue_tasks: z.number(),
    total_milestones: z.number(),
    completed_milestones: z.number(),
    overdue_milestones: z.number(),
    next_milestone: z.object({
      id: z.string(),
      title: z.string(),
      target_date: z.string(),
    }).nullable(),
    next_due_task: z.object({
      id: z.string(),
      title: z.string(),
      due_date: z.string(),
    }).nullable(),
  }),
})

export type AdminProjectDetail = z.infer<typeof adminProjectDetailSchema>