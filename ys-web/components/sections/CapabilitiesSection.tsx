"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useInView } from "framer-motion"
import {
  Boxes,
  Code2,
  BrainCircuit,
  Palette,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react"
import { AnimatedBox } from "@/components/shared/AnimatedBox"
import type { HomepageSection } from "@/types"
import {
  capabilitiesContentSchema,
  type CapabilitiesItemData,
} from "@/lib/cms/schemas"
import { validateCmsContent } from "@/lib/cms/validate"

interface CapabilitiesSectionProps {
  locale: string
  cmsSection?: HomepageSection
}

interface Capability {
  icon: LucideIcon
  iconLabel: string
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
  accent: string
  accentBg: string
  href: string
}

const iconMap: Record<string, LucideIcon> = {
  Boxes,
  Code2,
  BrainCircuit,
  Palette,
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK CAPABILITIES — each with its own accent color
// ═══════════════════════════════════════════════════════════════════════════════
const fallbackCapabilities: Capability[] = [
  {
    icon: Boxes,
    iconLabel: "Products",
    title_en: "Software Products",
    title_ar: "منتجات برمجية",
    description_en:
      "Ready-built SaaS platforms and management systems that solve real operational problems out of the box.",
    description_ar:
      "منصات SaaS جاهزة وأنظمة إدارة تحل مشكلات تشغيلية حقيقية في الممارسة العملية.",
    accent: "#0A4FE7",
    accentBg: "rgba(10,79,231,0.12)",
    href: "/products",
  },
  {
    icon: Code2,
    iconLabel: "Custom",
    title_en: "Custom Technology",
    title_ar: "تقنيات مخصصة",
    description_en:
      "Tailored platforms, portals, and tools engineered around exactly how your business works.",
    description_ar:
      "منصات وبوابات وأدوات مصممة خصيصاً حول طريقة عمل أعمالك بالضبط.",
    accent: "#8B5CF6",
    accentBg: "rgba(139,92,246,0.12)",
    href: "/services",
  },
  {
    icon: BrainCircuit,
    iconLabel: "AI",
    title_en: "AI & Automation",
    title_ar: "الذكاء الاصطناعي والأتمتة",
    description_en:
      "Intelligent assistants, chatbots, and workflow automation built on your own data.",
    description_ar:
      "مساعدات ذكية وروبوتات محادثة وأتمتة لسير العمل مبنية على بياناتك الخاصة.",
    accent: "#10B981",
    accentBg: "rgba(16,185,129,0.12)",
    href: "/services",
  },
  {
    icon: Palette,
    iconLabel: "Design",
    title_en: "Product Design",
    title_ar: "تصميم المنتجات",
    description_en:
      "Modern, bilingual-first interfaces designed for clarity, speed, and conversion.",
    description_ar:
      "واجهات حديثة ثنائية اللغة مصممة للوضوح والسرعة وتحقيق التحويل.",
    accent: "#F59E0B",
    accentBg: "rgba(245,158,11,0.12)",
    href: "/services",
  },
]

function parseCmsItems(raw: CapabilitiesItemData[]): Capability[] {
  const accentPalette = [
    { accent: "#0A4FE7", accentBg: "rgba(10,79,231,0.12)" },
    { accent: "#8B5CF6", accentBg: "rgba(139,92,246,0.12)" },
    { accent: "#10B981", accentBg: "rgba(16,185,129,0.12)" },
    { accent: "#F59E0B", accentBg: "rgba(245,158,11,0.12)" },
  ]

  return raw.map((item, i) => {
    const iconName = item.icon ?? "Boxes"
    const IconComponent = iconMap[iconName] ?? Boxes
    const colors = accentPalette[i % accentPalette.length]
    return {
      icon: IconComponent,
      iconLabel: iconName,
      title_en: item.title_en ?? "",
      title_ar: item.title_ar ?? "",
      description_en: item.description_en ?? "",
      description_ar: item.description_ar ?? "",
      accent: colors.accent,
      accentBg: colors.accentBg,
      href: "/services",
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITY CARD — glassmorphism with individual accent color
// ═══════════════════════════════════════════════════════════════════════════════
function CapabilityCard({
  item,
  locale,
  index,
}: {
  item: Capability
  locale: string
  index: number
}) {
  const isAr = locale === "ar"
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const Icon = item.icon

  return (
    <AnimatedBox
      key={`${item.title_en}-${index}`}
      whileInView
      delay={index * 0.08}
      y={20}
      className="group relative h-full"
    >
      <Link
        href={`/${locale}${item.href}`}
        className="flex flex-col h-full rounded-2xl p-6 lg:p-7 transition-all duration-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        style={{
          background: "var(--surface-subtle)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--border-card)",
          boxShadow: "var(--shadow-card-md)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.borderColor = `${item.accent}50`
          el.style.boxShadow = `var(--shadow-card-md), 0 0 32px -6px ${item.accent}25`
          el.style.transform = "translateY(-3px)"
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.borderColor = "var(--border-card)"
          el.style.boxShadow = "var(--shadow-card-md)"
          el.style.transform = "translateY(0)"
        }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-105"
          style={{
            backgroundColor: item.accentBg,
            border: `1px solid ${item.accent}30`,
          }}
        >
          <Icon size={22} style={{ color: item.accent }} aria-hidden="true" />
        </div>

        {/* Title */}
        <h3
          className="font-display font-semibold text-[1.0625rem] mb-2.5"
          style={{ color: "var(--color-foreground)" }}
        >
          {isAr ? item.title_ar : item.title_en}
        </h3>

        {/* Description */}
        <p
          className="text-[0.9375rem] leading-relaxed flex-1"
          style={{ color: "var(--color-foreground-muted)" }}
        >
          {isAr ? item.description_ar : item.description_en}
        </p>

        {/* Footer — Explore link */}
        <div
          className="mt-5 pt-4 flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 group-hover:gap-2.5"
          style={{ color: item.accent, borderTop: "1px solid var(--border-faint)" }}
        >
          {isAr ? "استكشف" : "Explore"}
          <Arrow size={14} />
        </div>
      </Link>
    </AnimatedBox>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITIES SECTION — premium ecosystem capabilities showcase
// ═══════════════════════════════════════════════════════════════════════════════
export function CapabilitiesSection({
  locale,
  cmsSection,
}: CapabilitiesSectionProps) {
  const isAr = locale === "ar"
  const cmsContent = validateCmsContent(cmsSection, capabilitiesContentSchema)
  const items: Capability[] = cmsContent?.items?.length
    ? parseCmsItems(cmsContent.items)
    : fallbackCapabilities

  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: "-80px" })

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{
        backgroundColor: "var(--color-background)",
        paddingTop: "var(--space-section)",
        paddingBottom: "var(--space-section)",
      }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 30% 30%, rgba(139,92,246,0.05) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="container-site relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 lg:mb-14">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="glass-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: "rgba(139, 92, 246, 0.9)" }}
            >
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: "#8B5CF6" }}
              />
              {isAr ? "قدراتنا" : "Our Capabilities"}
            </span>
          </motion.div>

          <div className="h-3" />

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-bold tracking-tight"
            style={{
              fontSize: "clamp(30px, 2.8vw, 44px)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--color-foreground)",
            }}
          >
            {isAr ? (
              <>
                حلول تقنية{" "}
                <span className="text-gradient-blue-strong">شاملة</span>
              </>
            ) : (
              <>
                End-to-End{" "}
                <span className="text-gradient-blue-strong">Technology</span>{" "}
                Solutions
              </>
            )}
          </motion.h2>

          <div className="h-3" />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="text-[15px] leading-relaxed"
            style={{ color: "var(--color-foreground-muted)" }}
          >
            {isAr
              ? "منتجات، منصات مخصصة، ذكاء اصطناعي وتصميم — نرافقك من الفكرة إلى الإطلاق."
              : "Products, custom platforms, AI, and design — we take you from idea to launch."}
          </motion.p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {items.map((item, i) => (
            <CapabilityCard key={`${item.title_en}-${i}`} item={item} locale={locale} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
