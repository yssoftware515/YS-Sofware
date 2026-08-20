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

// ── Product ───────────────────────────────────────────────────────────
export type ProductStatus = 'active' | 'beta' | 'planned' | 'archived'

export interface Product {
  id: string
  slug: string
  name: string
  short_desc: string
  status: ProductStatus
  current_version: string | null
  is_featured: boolean
  icon_key: string | null
  brand_color: string | null
  cover_image: { url: string; alt: string } | null
}

// PublicFeature — one feature shown on a product page (localized).
export interface PublicFeature {
  title: string
  description: string | null
  sort_order: number
}

// PublicPricingPlan — one price presented on a product page. price is a
// decimal string (or null for custom-quote plans); never float math.
export interface PublicPricingPlan {
  name: string
  pricing_type: 'fixed' | 'starting_at' | 'custom_quote' | 'free'
  price: string | null
  currency: string | null
  billing_cycle: string | null
  is_featured: boolean
  sort_order: number
}

export interface PublicMediaItem {
  url: string | null
  alt: string | null
  kind: 'hero' | 'gallery' | 'screenshot'
  sort_order: number
}

export interface ProductDetail extends Product {
  long_desc: string
  value_proposition: string | null
  target_audience: string | null
  logo_image: { url: string; alt: string } | null
  product_url: string | null
  documentation_url: string | null
  support_url: string | null
  features: PublicFeature[]
  pricing_plans: PublicPricingPlan[]
  media: PublicMediaItem[]
  latest_release: {
    version: string
    release_date: string
    notes: string | null
  } | null
  seo: { title: string; description: string }
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

// ── CMS — Static Page ─────────────────────────────────────────────────
export type PageStatus = 'draft' | 'published' | 'archived'

export interface StaticPage {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string | null
  published_at: string | null
  cover_image: { url: string; alt: string } | null
}

// ── CMS — FAQ ──────────────────────────────────────────────────────────
export interface FaqItem {
  id: string
  question: string
  answer: string
  highlight: string | null
  category: string | null
}

// ── CMS — Menu ─────────────────────────────────────────────────────────
export interface MenuItem {
  id: string
  title: string
  url: string
  icon: string | null
  target: string
  children: MenuItem[]
}

export interface Menu {
  id: string
  location: string
  items: MenuItem[]
}

// ── CMS — Homepage Section ────────────────────────────────────────────
export interface HomepageSection {
  id: string
  type: string
  title: string | null
  subtitle: string | null
  content: Record<string, unknown> | null
  sort_order: number
}

// ── Roadmap ───────────────────────────────────────────────────────────
export type RoadmapStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'
export type RoadmapPriority = 'low' | 'medium' | 'high' | 'critical'

export interface RoadmapItem {
  id: string
  title: string
  description: string | null
  status: RoadmapStatus
  priority: RoadmapPriority
  target_version: string | null
  target_quarter: string | null
  product: { slug: string; name: string } | null
}

// ── Update ────────────────────────────────────────────────────────────
export interface Update {
  id: string
  title: string
  content: string
  type: 'announcement' | 'blog' | 'news' | 'release'
  is_featured: boolean
  published_at: string
  product: { slug: string; name: string } | null
}

// ── Career ────────────────────────────────────────────────────────────
export interface Career {
  id: string
  title: string
  department: string
  location: string
  type: 'full_time' | 'part_time' | 'contract' | 'internship'
  description: string | null
  requirements?: string[]
  responsibilities?: string[]
  is_featured: boolean
}

// ── Timeline ──────────────────────────────────────────────────────────
export interface TimelineEntry {
  id: string
  title: string
  description: string | null
  event_date: string
  type: string
  product: { slug: string; name: string } | null
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
