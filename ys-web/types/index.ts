// ── API Response ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: PaginationMeta
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// ── Service ───────────────────────────────────────────────────────────
export type ServiceStatus = 'active' | 'inactive' | 'archived'
export type ServicePricingType = 'custom_quote' | 'starting_at' | 'fixed' | 'hourly'
export type ServiceBillingCycle = 'per_project' | 'per_month' | 'per_hour' | 'custom'

export interface Service {
  id: string
  slug: string
  name: string
  short_desc: string
  category: string | null
  pricing_type: ServicePricingType
  starting_price: string | null
  currency: string | null
  billing_cycle: ServiceBillingCycle | null
  is_featured: boolean
  cover_image: { url: string; alt: string } | null
}

export interface ServiceDetail extends Service {
  description: string | null
  seo: { title: string; description: string }
}

// ── Contact ───────────────────────────────────────────────────────────
// The customer-facing "What do you need?" picker — mirrored 1:1 with
// ContactRequest::REQUEST_TYPES in the backend.
export const REQUEST_TYPES = [
  'website',
  'web_platform',
  'mobile_app',
  'saas',
  'ai_solution',
  'ai_agent',
  'automation',
  'crm',
  'ui_ux',
  'branding',
  'custom_software',
  'integration',
  'other',
] as const

export type RequestType = (typeof REQUEST_TYPES)[number]

/** Mirrored with ContactRequest::CONTACT_PREFERENCES. */
export const CONTACT_PREFERENCES = ['email', 'whatsapp'] as const
export type ContactPreference = (typeof CONTACT_PREFERENCES)[number]

/** Mirrored with ContactRequest::BUDGET_RANGES. */
export const BUDGET_RANGES = ['under_10k', '10k_30k', '30k_100k', 'over_100k', 'flexible'] as const
export type BudgetRange = (typeof BUDGET_RANGES)[number]

/** Mirrored with ContactRequest::TIMELINES. */
export const TIMELINES = ['asap', 'one_three_months', 'three_six_months', 'flexible'] as const
export type Timeline = (typeof TIMELINES)[number]

export interface ContactFormData {
  name: string
  email: string
  company_name?: string
  contact_preference?: ContactPreference
  phone?: string
  budget_range?: BudgetRange
  timeline?: Timeline
  subject?: string
  message: string
  type: 'general' | 'sales' | 'support' | 'partnership'
  request_type?: RequestType
  details?: Record<string, string>
}

// ── Settings ──────────────────────────────────────────────────────────
export interface PublicSettings {
  brand: {
    company_name: string
    company_tagline_en: string
    company_tagline_ar: string
    company_description_en: string
    company_description_ar: string
    contact_email: string
  }
  social: {
    github_url: string | null
    tiktok_url: string | null
    instagram_url: string | null
    x_url: string | null
    linkedin_url: string | null
  }
  seo: {
    default_og_title_en: string
    default_og_title_ar: string
  }
  contacts?: {
    support_email?: string | null
    sales_email?: string | null
    security_email?: string | null
    privacy_email?: string | null
    press_email?: string | null
    whatsapp_number?: string | null
    whatsapp_display?: string | null
  }
  content?: {
    hero_headline_en: string
    hero_headline_ar: string
    hero_subline_en: string
    hero_subline_ar: string
    homepage_stats: Array<{ label_en: string; label_ar: string; value: string }>
    why_choose_items: Array<{
      icon: string
      title_en: string; title_ar: string
      description_en: string; description_ar: string
    }>
  }
}

// ── FAQ ────────────────────────────────────────────────────────────────
export interface FaqItem {
  id: string
  question: string
  answer: string
  highlight: string | null
  category: string | null
}

// ── Search ────────────────────────────────────────────────────────────
export interface SearchResult {
  type: string
  id: string
  title: string
  excerpt: string | null
  url: string
  rank: number
  meta: Record<string, unknown>
}

// ── Admin Auth ────────────────────────────────────────────────────────
export interface AdminUser {
  id: string
  name: string
  email: string
  is_active: boolean
  last_login_at: string | null
  role: {
    id: string
    name: string
    slug: string
    permissions: string[]
  }
}
