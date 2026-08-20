'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { ArrowRight, ArrowLeft, Box, Heart, Globe, Layers, Zap } from 'lucide-react'
import type { PublicSettings, HomepageSection, Product } from '@/types'
import { cn } from '@/lib/utils/cn'
import { buttonVariants } from '@/components/ui/Button'
import { getProductIcon } from '@/lib/utils/productIcons'
import { heroContentSchema } from '@/lib/cms/schemas'
import { validateCmsContent, validateUrl } from '@/lib/cms/validate'

/* Any icon component we can render in cards/bar (Lucide or custom SVG). */
type IconComponentType = React.ComponentType<{
  size?: number
  style?: React.CSSProperties
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}>

/* Custom runner glyph — matches the reference design (no Lucide runner). */
function RunnerIcon({ size = 16, style, className, 'aria-hidden': ariaHidden }: {
  size?: number; style?: React.CSSProperties; className?: string; 'aria-hidden'?: boolean | 'true' | 'false'
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} aria-hidden={ariaHidden ?? true}>
      <circle cx="13.5" cy="4" r="2" fill="currentColor" stroke="none" />
      <path d="M13.5 7.5 L11 12 L14.5 15 L15.5 20" />
      <path d="M11 12 L8 14.5 L5.5 17" />
      <path d="M13 8.5 L17 10 L19.5 9" />
      <path d="M13 8.5 L9.5 9.5 L7 8" />
    </svg>
  )
}

/* Shield with the vertical notch — matches the reference Security glyph. */
function ShieldLineIcon({ size = 16, style, className, 'aria-hidden': ariaHidden }: {
  size?: number; style?: React.CSSProperties; className?: string; 'aria-hidden'?: boolean | 'true' | 'false'
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} aria-hidden={ariaHidden ?? true}>
      <path d="M12 2 L20 5.5 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V5.5 L12 2 Z" />
      <path d="M12 8 V12" />
    </svg>
  )
}

interface HeroSectionProps {
  locale: string
  settings?: PublicSettings
  cmsSection?: HomepageSection
  whyChooseSection?: HomepageSection
  products?: Product[]
}

const fallback = {
  en: {
    badge: 'SOFTWARE PRODUCTS COMPANY',
    headline_l1: 'Building the Next',
    headline_l2: 'Generation of',
    headline_hl: 'Business Software',
    subline: 'Scalable SaaS platforms and digital ecosystems designed to power modern businesses worldwide.',
    cta_primary: 'Explore Ecosystem',
    cta_secondary: 'View Products',
    trust_prefix: 'Products',
    trust_suffix: 'One Ecosystem',
  },
  ar: {
    badge: 'شركة منتجات برمجية',
    headline_l1: 'نبني الجيل',
    headline_l2: 'القادم من',
    headline_hl: 'برمجيات الأعمال',
    subline: 'منصات SaaS قابلة للتوسع وأنظمة بيئية رقمية مصممة لتشغيل الأعمال الحديثة في جميع أنحاء العالم.',
    cta_primary: 'استكشف النظام البيئي',
    cta_secondary: 'عرض المنتجات',
    trust_prefix: 'منتجات',
    trust_suffix: 'نظام بيئي واحد',
  },
} as const

const fallbackHeroProducts = [
  {
    slug: 'ys-matrix',
    title: 'YS-Matrix',
    desc_en: 'ERP & Business Management Platform',
    desc_ar: 'منصة ERP وإدارة الأعمال',
    icon: Box as IconComponentType,
    color: '#0A4FE7',
    cardBg: 'rgba(10,79,231,0.08)',
    borderColor: 'rgba(10,79,231,0.35)',
  },
  {
    slug: 'ys-sports',
    title: 'YS-Sports',
    desc_en: 'Sports Coaching Marketplace & Management',
    desc_ar: 'سوق تدريب رياضي وإدارة',
    icon: RunnerIcon,
    color: '#8B5CF6',
    cardBg: 'rgba(139,92,246,0.10)',
    borderColor: 'rgba(139,92,246,0.45)',
  },
  {
    slug: 'ys-care',
    title: 'YS-Care',
    desc_en: 'Healthcare Management & Service Platform',
    desc_ar: 'إدارة وخدمات الرعاية الصحية',
    icon: Heart as IconComponentType,
    color: '#10B981',
    cardBg: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
] as const

type HeroCardData = {
  slug: string
  title: string
  desc_en: string
  desc_ar: string
  icon: IconComponentType
  color: string
  cardBg: string
  borderColor: string
}

function buildHeroCards(
  liveProducts: Product[] | undefined,
  fallbackCards: readonly HeroCardData[],
): HeroCardData[] {
  const featured = (liveProducts ?? []).filter(p => p.is_featured).slice(0, 3)
  return fallbackCards.map((fallbackCard, i) => {
    const real = featured[i]
    if (!real) return fallbackCard
    const Icon = (getProductIcon(real.icon_key) ?? fallbackCard.icon) as IconComponentType
    const color = real.brand_color ?? fallbackCard.color
    return {
      slug: real.slug,
      title: real.name,
      desc_en: real.short_desc,
      desc_ar: real.short_desc,
      icon: Icon,
      color,
      cardBg: real.brand_color ? `${real.brand_color}14` : fallbackCard.cardBg,
      borderColor: real.brand_color ? `${real.brand_color}59` : fallbackCard.borderColor,
    }
  })
}

const sizeMap = {
  xs: { width: 140, padding: 5, iconBox: 26, iconSize: 14, titleSize: 11, descSize: 9, gap: 2, arrowBox: 18, arrowSize: 9 },
  sm: { width: 150, padding: 5, iconBox: 28, iconSize: 14, titleSize: 12, descSize: 9, gap: 2, arrowBox: 20, arrowSize: 10},
  /* mds — "medium-small": one degree below md, the right weight for Sports/Care */
  mds: { width: 190, padding: 12, iconBox: 34, iconSize: 16, titleSize: 12.5, descSize: 10, gap: 2.5, arrowBox: 24, arrowSize: 11 },
  md: { width: 220, padding: 16, iconBox: 40, iconSize: 18, titleSize: 14, descSize: 11, gap: 3, arrowBox: 28, arrowSize: 13 },
  lg: { width: 260, padding: 20, iconBox: 48, iconSize: 20, titleSize: 15, descSize: 12, gap: 3, arrowBox: 30, arrowSize: 14 },
} as const

function ProductCard({
  product,
  isAr,
  locale,
  index,
  size = 'md',
  className,
  style,
}: {
  product: HeroCardData
  isAr: boolean
  locale: string
  index: number
  size?: keyof typeof sizeMap
  className?: string
  style?: React.CSSProperties
}) {
  const desc = isAr ? product.desc_ar : product.desc_en
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const Icon = product.icon
  const s = sizeMap[size]
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.5, delay: 0.5 + index * 0.12, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 5 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 },
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn('absolute', className)}
      style={style}
    >
      <Link
        href={`/${locale}/products/${product.slug}`}
        className="group block cursor-pointer rounded-2xl transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={{
          padding: s.padding,
          width: s.width,
          background: product.cardBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${product.borderColor}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = product.color
          e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.35), 0 0 24px -4px ${product.color}`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = product.borderColor
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)'
        }}
      >
        <div className="flex items-start" style={{ gap: s.gap * 4 }}>
          {/* Solid brand-color tile + white glyph (like the reference) */}
          <div
            className="shrink-0 flex items-center justify-center rounded-xl"
            style={{
              width: s.iconBox,
              height: s.iconBox,
              backgroundColor: product.color,
              boxShadow: `0 0 16px -2px ${product.color}80`,
            }}
          >
            <Icon size={s.iconSize} style={{ color: '#FFFFFF' }} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className="font-display font-semibold tracking-tight truncate block"
              style={{ fontSize: s.titleSize, color: 'rgba(255,255,255,0.95)' }}
            >
              {product.title}
            </span>
            <p className="mt-1 leading-relaxed line-clamp-2" style={{ fontSize: s.descSize, color: 'rgba(255,255,255,0.6)' }}>
              {desc}
            </p>
            {/* Circular arrow button, bottom-right (like the reference) */}
            <div className="flex justify-end mt-1.5">
              <span
                className="rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-white/10"
                style={{
                  width: s.arrowBox,
                  height: s.arrowBox,
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.06)',
                }}
              >
                <Arrow size={s.arrowSize} style={{ color: 'rgba(255,255,255,0.8)' }} aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTOR LINES — like the reference: lines run FROM the Matrix card out to
// Sports/Care tops and a blue trunk drops between the Y and S letters.
// NO tails below the cards (removed per design review).
// preserveAspectRatio="none" + non-scaling-stroke keep anchors glued to the
// %-positioned cards at any stage size.
// Anchors (viewBox 1440×580):
//   Matrix sm @71.5%: spans 948–1112, centerY 48, bottom ~100
//   Sports mds @47%: centerX 772, top 220
//   Care   mds @82%: centerX 1276, top 220
// ═══════════════════════════════════════════════════════════════════════════════
function ConnectorLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 4 }}
      viewBox="0 0 1440 580"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="neonGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="blueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(74,158,255,0.9)" />
          <stop offset="100%" stopColor="rgba(10,79,231,0.25)" />
        </linearGradient>
        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.9)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0.35)" />
        </linearGradient>
        <linearGradient id="tealGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(16,185,129,0.9)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0.35)" />
        </linearGradient>
      </defs>

      {/* Blue trunk: Matrix bottom → down BETWEEN the Y and S letters */}
      <path d="M 1030 88 V 200" stroke="url(#blueGrad)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter="url(#neonGlow)" />
      {/* Purple: Matrix left edge → across → down into Sports top (stops there) */}
      <path d="M 1000 44 H 800 V 220" stroke="url(#purpleGrad)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter="url(#neonGlow)" />
      {/* Teal: Matrix right edge → across → down into Care top (stops there) */}
      <path d="M 1104 44 H 1320 V 220" stroke="url(#tealGrad)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter="url(#neonGlow)" />

      {/* Glow nodes */}
      <circle cx="1030" cy="200" r="3.5" fill="rgba(74,158,255,0.9)" filter="url(#neonGlow)" />
      <circle cx="956" cy="44" r="3" fill="rgba(139,92,246,0.9)" filter="url(#neonGlow)" />
      <circle cx="801" cy="44" r="3" fill="rgba(139,92,246,0.9)" filter="url(#neonGlow)" />
      <circle cx="1104" cy="44" r="3" fill="rgba(16,185,129,0.9)" filter="url(#neonGlow)" />
      <circle cx="1319" cy="44" r="3" fill="rgba(16,185,129,0.9)" filter="url(#neonGlow)" />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHY CHOOSE BAR — reference scale: p-6 cells, 44px tinted tiles, larger type.
// Stage (flex-1) absorbs the height so the no-scroll guarantee holds.
// ═══════════════════════════════════════════════════════════════════════════════
interface WhyChooseItem {
  icon: IconComponentType
  iconLabel: string
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
}

const whyChooseFallbackItems: WhyChooseItem[] = [
  {
    icon: ShieldLineIcon, iconLabel: 'Security',
    title_en: 'Security First', title_ar: 'الأمان أولاً',
    description_en: 'Enterprise-grade security built into every layer, from authentication to data storage.',
    description_ar: 'أمان بمستوى المؤسسات مدمج في كل طبقة، من المصادقة إلى تخزين البيانات.',
  },
  {
    icon: Globe as IconComponentType, iconLabel: 'Global',
    title_en: 'Bilingual by Design', title_ar: 'ثنائي اللغة بالتصميم',
    description_en: 'Full Arabic and English support with proper RTL layouts across every product.',
    description_ar: 'دعم كامل للعربية والإنجليزية مع تخطيطات RTL صحيحة عبر كل منتج.',
  },
  {
    icon: Layers as IconComponentType, iconLabel: 'Scale',
    title_en: 'Built to Scale', title_ar: 'مبني للتوسع',
    description_en: 'Architecture designed to grow with your business, from startup to enterprise.',
    description_ar: 'معمارية مصممة للنمو مع أعمالك، من الشركات الناشئة إلى المؤسسات الكبرى.',
  },
  {
    icon: Zap as IconComponentType, iconLabel: 'Speed',
    title_en: 'Modern & Fast', title_ar: 'حديث وسريع',
    description_en: 'Optimized performance and modern tech stack for the best experience at any scale.',
    description_ar: 'أداء محسّن وتقنيات حديثة لأفضل تجربة ممكنة على أي نطاق.',
  },
]

function WhyChooseBar({ locale }: { locale: string }) {
  const isAr = locale === 'ar'
  const items = whyChooseFallbackItems
  return (
    <div data-why-bar className="relative w-full max-w-[1280px] mx-auto px-6 lg:px-10 pt-2 pb-1">
      {/* Desktop / tablet */}
      <div
        className="hidden sm:grid grid-cols-2 lg:grid-cols-4 rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {items.map((item, i) => (
          <motion.div
            key={item.title_en + i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'p-6',
              i % 2 === 0 && 'border-e',
              i < items.length - 2 && 'border-b',
              'lg:border-b-0 lg:border-e-0',
              i % 4 !== 0 && 'lg:border-s',
            )}
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-3.5">
              <div
                className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
                style={{
                  background: 'var(--color-accent-subtle)',
                  border: '1px solid var(--color-accent)',
                }}
              >
                <item.icon size={20} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-[1.0625rem] mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  {isAr ? item.title_ar : item.title_en}
                </h3>
                <p className="text-[0.9375rem] leading-relaxed" style={{ color: 'var(--color-foreground-muted)' }}>
                  {isAr ? item.description_ar : item.description_en}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Mobile — bottom tab bar */}
      <div
        className="sm:hidden -mx-6 grid grid-cols-4 rounded-t-2xl overflow-hidden"
        style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {items.map((item, i) => (
          <motion.div
            key={item.title_en + i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className={cn('flex flex-col items-center gap-1 py-3 px-1', i !== 0 && 'border-s')}
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{
                background: 'var(--color-accent-subtle)',
                border: '1px solid var(--color-accent)',
              }}
            >
              <item.icon size={14} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
            </div>
            <span
              className="text-center leading-tight"
              style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--color-foreground-muted)' }}
            >
              {isAr ? item.title_ar : item.title_en}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERO SECTION — reference-matched layout:
// • Matrix sm centered on the Y/S gap (71.5%), top 0% → zero letter cover,
//   blue trunk drops between the letters
// • Sports/Care mds (one degree smaller) hugging the logo sides
// • Connector loops stop at card tops — no tails below
// • Section locked to the viewport → hero + bar above the fold, no scroll
// ═══════════════════════════════════════════════════════════════════════════════
export function HeroSection({ locale, settings, cmsSection, whyChooseSection, products: liveProducts }: HeroSectionProps) {
  const isAr = locale === 'ar'
  const f = fallback[locale as keyof typeof fallback] ?? fallback.en
  const products = buildHeroCards(liveProducts, fallbackHeroProducts)
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.4])
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const springX = useSpring(mouseX, { stiffness: 120, damping: 25 })
  const springY = useSpring(mouseY, { stiffness: 120, damping: 25 })
  const parallaxX = useTransform(springX, [0, 1], [6, -6])
  const parallaxY = useTransform(springY, [0, 1], [6, -6])
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }
  const cmsContent = validateCmsContent(cmsSection, heroContentSchema)
  const badge = isAr
    ? (cmsContent?.badge_ar || f.badge)
    : (cmsContent?.badge_en || f.badge)
  const headline_en = settings?.content?.hero_headline_en
  const headline_ar = settings?.content?.hero_headline_ar
  const subline = isAr
    ? (settings?.content?.hero_subline_ar || f.subline)
    : (settings?.content?.hero_subline_en || f.subline)
  const ctaPrimaryText = isAr
    ? (cmsContent?.cta_primary_ar || f.cta_primary)
    : (cmsContent?.cta_primary_en || f.cta_primary)
  const ctaSecondaryText = isAr
    ? (cmsContent?.cta_secondary_ar || f.cta_secondary)
    : (cmsContent?.cta_secondary_en || f.cta_secondary)
  const ctaPrimaryUrl = validateUrl(cmsContent?.cta_primary_url, `/${locale}/products`)
  const ctaSecondaryUrl = validateUrl(cmsContent?.cta_secondary_url, `/${locale}/products`)
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight

  return (
    <section
      ref={sectionRef}
      className="relative flex flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div
        data-hero-stage
        className="relative flex flex-col min-h-[calc(100dvh-4rem)] lg:min-h-0 lg:flex-1"
      >
        {/* Background Layers — 58% keeps the letters low enough to clear Matrix */}
        <div className="hidden lg:block absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <Image
            src="/branding/hero/hero.webp"
            alt={isAr ? 'منظومة YS Systems' : 'YS Systems ecosystem platform'}
            fill
            className="object-cover"
            style={{ objectPosition: '62% 58%' }}
            sizes="100vw"
            priority
          />
        </div>
        <div
          className="hidden lg:block absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(1,5,15,0.92) 0%, rgba(1,5,15,0.72) 30%, rgba(1,5,15,0.25) 50%, transparent 65%)' }}
          aria-hidden="true"
        />
        <div className="lg:hidden absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <Image
            src="/branding/hero/hero-mobile.webp"
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: '50% 100%' }}
            sizes="100vw"
            priority
          />
        </div>
        <div
          className="lg:hidden absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(1,5,15,0.85) 0%, rgba(1,5,15,0.6) 45%, rgba(1,5,15,0.35) 100%)' }}
          aria-hidden="true"
        />
        <div className="hidden lg:block absolute inset-0 z-[1] pointer-events-none" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 55% 50% at 68% 48%, rgba(99,165,255,0.22) 0%, transparent 65%)' }}
          />
          <div
            className="absolute"
            style={{
              left: '55%',
              top: '30%',
              width: '35%',
              height: '50%',
              background: 'radial-gradient(ellipse 50% 45% at 50% 60%, rgba(10,79,231,0.15) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Main Content */}
        <motion.div className="relative z-10 flex-1 flex lg:items-center" style={{ opacity }}>
          <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-10 pt-7 pb-6 sm:pt-8 lg:py-0">
            <div className="relative">
              <div
                dir="ltr"
                className={cn(
                  'flex flex-col items-center text-center lg:items-start lg:mr-auto lg:max-w-[400px]',
                  isAr ? 'lg:text-right' : 'lg:text-left'
                )}
              >
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span
                    className="glass-badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase"
                    style={{ color: 'rgba(10, 79, 231, 0.9)' }}
                  >
                    <span className="w-1 h-1 rounded-full" style={{ background: '#0A4FE7' }} />
                    {badge}
                  </span>
                </motion.div>
                <div className="h-2.5 lg:h-3.5" />
                <motion.h1
                  dir={isAr ? 'rtl' : 'ltr'}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="font-display font-bold tracking-tight"
                  style={{
                    fontSize: 'clamp(36px, 3.4vw, 52px)',
                    lineHeight: 1.15,
                    letterSpacing: '-0.02em',
                    color: '#FFFFFF',
                  }}
                >
                  {headline_en || headline_ar ? (
                    <>{isAr ? headline_ar : headline_en}</>
                  ) : (
                    <>
                      {f.headline_l1}
                      <br />
                      {f.headline_l2}
                      <br />
                      <span className="text-gradient-blue-strong">{f.headline_hl}</span>
                    </>
                  )}
                </motion.h1>
                <div className="h-2.5 lg:h-3.5" />
                <motion.p
                  dir={isAr ? 'rtl' : 'ltr'}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="text-base leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.72)', maxWidth: 400, lineHeight: 1.7 }}
                >
                  {subline}
                </motion.p>
                <div className="h-4 lg:h-6" />
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto"
                >
                  <Link
                    href={ctaPrimaryUrl}
                    className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'btn-hero-primary shrink-0 whitespace-nowrap w-full sm:w-auto')}
                  >
                    {ctaPrimaryText}
                    <ArrowIcon size={18} />
                  </Link>
                  <Link
                    href={ctaSecondaryUrl}
                    className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'btn-hero-secondary text-white shrink-0 whitespace-nowrap w-full sm:w-auto')}
                  >
                    {ctaSecondaryText}
                  </Link>
                </motion.div>
                <div className="h-4 lg:h-6" />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2.5 text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <Box size={16} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                  <span style={{ color: '#FFFFFF' }}>{f.trust_prefix}</span>
                  <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--color-accent)' }} />
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #3B82F6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontWeight: 600,
                    }}
                  >
                    {f.trust_suffix}
                  </span>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Desktop Product Card Stage */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{ x: parallaxX, y: parallaxY }}
          className="hidden lg:block absolute inset-0 z-[5]"
          onMouseMove={handleMouseMove}
        >
          <ConnectorLines />
          <ProductCard
            product={products[0]}
            isAr={isAr}
            locale={locale}
            index={0}
            size="xs"
            style={{ top: '0%', left: 'calc(71.5% - 70px)' }}
          />
          <ProductCard
            product={products[1]}
            isAr={isAr}
            locale={locale}
            index={1}
            size="mds"
            style={{ top: '38%', left: 'min(60%, calc(65% - 200px))' }}
          />
          <ProductCard
            product={products[2]}
            isAr={isAr}
            locale={locale}
            index={2}
            size="mds"
            style={{ top: '38%', left: 'min(85%, calc(100% - 210px))' }}
          />
        </motion.div>

        {/* Bottom blend */}
        <div
          className="hidden lg:block absolute bottom-0 inset-x-0 pointer-events-none z-[2]"
          style={{
            height: 90,
            background: 'linear-gradient(to top, rgba(1,5,15,0.92) 0%, rgba(1,5,15,0.55) 40%, rgba(1,5,15,0.22) 70%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        {/* Mobile Product Card Stage */}
        <div className="lg:hidden relative z-10 px-6 pt-3 pb-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto"
            style={{ maxWidth: 340, height: 320 }}
          >
            <ProductCard
              product={products[0]}
              isAr={isAr}
              locale={locale}
              index={0}
              size="sm"
              style={{ top: '28%', left: '50%', marginLeft: -75 }}
            />
            <ProductCard
              product={products[1]}
              isAr={isAr}
              locale={locale}
              index={1}
              size="xs"
              style={{ top: '62%', left: '0%' }}
            />
            <ProductCard
              product={products[2]}
              isAr={isAr}
              locale={locale}
              index={2}
              size="xs"
              style={{ top: '62%', right: '0%' }}
            />
          </motion.div>
        </div>
      </div>

      <WhyChooseBar locale={locale} />
    </section>
  )
}