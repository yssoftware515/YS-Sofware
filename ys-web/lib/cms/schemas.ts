import { z } from 'zod'

export const whyChooseItemSchema = z.object({
  icon: z.string().optional(),
  title_en: z.string().optional(),
  title_ar: z.string().optional(),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
})

export type WhyChooseItemData = z.infer<typeof whyChooseItemSchema>

export const whyChooseContentSchema = z.object({
  items: z.array(whyChooseItemSchema).optional(),
})

export type WhyChooseContent = z.infer<typeof whyChooseContentSchema>

export const heroContentSchema = z.object({
  badge_en: z.string().optional(),
  badge_ar: z.string().optional(),
  cta_primary_en: z.string().optional(),
  cta_primary_ar: z.string().optional(),
  cta_secondary_en: z.string().optional(),
  cta_secondary_ar: z.string().optional(),
  cta_primary_url: z.string().optional(),
  cta_secondary_url: z.string().optional(),
})

export type HeroContent = z.infer<typeof heroContentSchema>

export const ctaContentSchema = z.object({
  primary_text_en: z.string().optional(),
  primary_text_ar: z.string().optional(),
  primary_url: z.string().optional(),
  secondary_text_en: z.string().optional(),
  secondary_text_ar: z.string().optional(),
  secondary_url: z.string().optional(),
})

export type CtaContent = z.infer<typeof ctaContentSchema>

export const capabilitiesItemSchema = z.object({
  icon: z.string().optional(),
  title_en: z.string().optional(),
  title_ar: z.string().optional(),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
})

export type CapabilitiesItemData = z.infer<typeof capabilitiesItemSchema>

export const capabilitiesContentSchema = z.object({
  items: z.array(capabilitiesItemSchema).optional(),
})

export type CapabilitiesContent = z.infer<typeof capabilitiesContentSchema>

export const processItemSchema = z.object({
  title_en: z.string().optional(),
  title_ar: z.string().optional(),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
})

export type ProcessItemData = z.infer<typeof processItemSchema>

export const processContentSchema = z.object({
  items: z.array(processItemSchema).optional(),
})

export type ProcessContent = z.infer<typeof processContentSchema>
