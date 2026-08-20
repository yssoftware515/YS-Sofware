/**
 * FAQ publishing lifecycle (INT-003).
 *
 * The backend accepts draft/published/archived (`Rule::in`) and the
 * migration + seeder default to `published`. The form MUST send a status
 * on every save: omitting it falls back to `draft` in the create action,
 * silently hiding new FAQs from the public page. These constants are the
 * single source of truth for the form and are pinned by contract tests.
 */
export const FAQ_STATUSES = ['draft', 'published', 'archived'] as const

export type FaqStatus = (typeof FAQ_STATUSES)[number]

export const DEFAULT_FAQ_STATUS: FaqStatus = 'published'