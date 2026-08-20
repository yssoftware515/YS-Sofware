"use client"

import { useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useInView } from "framer-motion"
import {
  ArrowRight,
  ArrowLeft,
  Box,
  Activity,
  HeartPulse,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils/cn"
import type { Product, HomepageSection } from "@/types"

interface ProductsSectionProps {
  locale: string
  products: Product[]
  cmsSection?: HomepageSection
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT — bilingual
// ═══════════════════════════════════════════════════════════════════════════════
const content = {
  en: {
    badge: "SOFTWARE PRODUCTS",
    title: "Built for Scale",
    subtitle:
      "A unified ecosystem of SaaS platforms — each designed to solve real business problems with enterprise-grade reliability.",
    view_all: "Explore All Products",
    cta: "Get Started",
    learn_more: "Learn More",
    active: "Active",
  },
  ar: {
    badge: "منتجات برمجية",
    title: "مبنية للتوسع",
    subtitle:
      "نظام بيئي موحد من منصات SaaS — كل منها مصمم لحل مشاكل الأعمال الحقيقية بموثوقية بمستوى المؤسسات.",
    view_all: "استكشف كل المنتجات",
    cta: "ابدأ الآن",
    learn_more: "اعرف المزيد",
    active: "نشط",
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK PRODUCTS — with cover image paths and metadata
// ═══════════════════════════════════════════════════════════════════════════════
interface ProductMeta {
  slug: string
  name: string
  short_desc: string
  icon: LucideIcon
  accent: string
  bg: string
  cover_path: string
}

const fallbackMeta: ProductMeta[] = [
  {
    slug: "ys-matrix",
    name: "YS-Matrix",
    short_desc:
      "ERP & Business Management Platform — unify your operations, finance, and team workflows in one intelligent system.",
    icon: Box,
    accent: "#0A4FE7",
    bg: "rgba(10,79,231,0.12)",
    cover_path: "/branding/products/ys-matrix/ys-matrix-cover.webp",
  },
  {
    slug: "ys-sports",
    name: "YS-Sports",
    short_desc:
      "Sports Coaching Marketplace & Management — connect coaches, athletes, and venues in a seamless digital ecosystem.",
    icon: Activity,
    accent: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    cover_path: "/branding/products/ys-sports/ys-sports-cover.webp",
  },
  {
    slug: "ys-care",
    name: "YS-Care",
    short_desc:
      "Healthcare Management & Service Platform — streamline patient care, appointments, and medical records securely.",
    icon: HeartPulse,
    accent: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    cover_path: "/branding/products/ys-care/ys-care-cover.webp",
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT CARD — uniform glassmorphism cards, all same size
// ═══════════════════════════════════════════════════════════════════════════════
function ProductCard({
  product,
  meta,
  locale,
  index,
}: {
  product: Product
  meta: ProductMeta
  locale: string
  index: number
}) {
  const isAr = locale === "ar"
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const Icon = meta.icon

  const cardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(cardRef, { once: true, margin: "-60px" })

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        href={`/${locale}/products/${product.slug}`}
        className="group flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        style={{
          background: "var(--surface-subtle)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border-card)",
          boxShadow: "var(--shadow-card-lg)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.borderColor = `${meta.accent}50`
          el.style.boxShadow = `var(--shadow-card-lg), 0 0 32px -6px ${meta.accent}30`
          el.style.transform = "translateY(-4px)"
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.borderColor = "var(--border-card)"
          el.style.boxShadow = "var(--shadow-card-lg)"
          el.style.transform = "translateY(0)"
        }}
      >
        {/* Cover Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={meta.cover_path}
            alt={product.name || meta.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, rgba(1,5,15,0.92) 0%, rgba(1,5,15,0.3) 50%, rgba(1,5,15,0.1) 100%)`,
            }}
          />

          {/* Top bar: Icon + Status */}
          <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
            {/* Brand icon */}
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 36,
                height: 36,
                backgroundColor: `${meta.accent}18`,
                border: `1px solid ${meta.accent}35`,
              }}
            >
              <Icon size={18} style={{ color: meta.accent }} />
            </div>

            {/* Status */}
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#34D399",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {content[isAr ? "ar" : "en"].active}
            </div>
          </div>

          {/* Product name at bottom of image */}
          <div className="absolute bottom-0 inset-x-0 px-4 pb-3.5">
            <h3 className="font-display font-bold text-lg tracking-tight" style={{ color: "#FFFFFF" }}>
              {product.name || meta.name}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-4 lg:p-5 gap-3">
          <p className="text-[13px] leading-relaxed line-clamp-3" style={{ color: "var(--text-soft)" }}>
            {product.short_desc || meta.short_desc}
          </p>

          {/* Footer */}
          <div
            className="mt-auto pt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border-faint)" }}
          >
            {/* Version — only if product has one */}
            {product.current_version ? (
              <span className="text-[11px] font-mono" style={{ color: "var(--text-faint)" }}>
                v{product.current_version}
              </span>
            ) : (
              <span />
            )}

            {/* Learn More */}
            <span
              className="inline-flex items-center gap-1 text-[13px] font-semibold transition-all duration-300 group-hover:gap-1.5"
              style={{ color: meta.accent }}
            >
              {content[isAr ? "ar" : "en"].learn_more}
              <Arrow size={13} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS SECTION — uniform grid, all cards same size
// ═══════════════════════════════════════════════════════════════════════════════
export function ProductsSection({
  locale,
  products: liveProducts,
  cmsSection,
}: ProductsSectionProps) {
  const isAr = locale === "ar"
  const t = content[isAr ? "ar" : "en"]

  // Merge live products with fallback metadata
  const items = fallbackMeta.map((meta) => {
    const live = liveProducts.find((p) => p.slug === meta.slug)
    return { product: live || ({ slug: meta.slug } as Product), meta }
  })

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
            "radial-gradient(ellipse 55% 45% at 50% 30%, rgba(10,79,231,0.05) 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      <div className="container-site relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-10 lg:mb-14">
          <div className="max-w-xl">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="glass-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ color: "rgba(10, 79, 231, 0.9)" }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: "#0A4FE7" }} />
                {cmsSection?.title ?? t.badge}
              </span>
            </motion.div>

            <div className="h-2.5" />

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
                  منتجاتنا{" "}
                  <span className="text-gradient-blue-strong">المتكاملة</span>
                </>
              ) : (
                <>
                  Our{" "}
                  <span className="text-gradient-blue-strong">Integrated</span>{" "}
                  Products
                </>
              )}
            </motion.h2>

            <div className="h-2.5" />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="text-[15px] leading-relaxed"
              style={{ color: "var(--color-foreground-muted)", maxWidth: 520 }}
            >
              {cmsSection?.subtitle ?? t.subtitle}
            </motion.p>
          </div>

          {/* View All */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={`/${locale}/products`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 btn-hero-secondary"
            >
              {t.view_all}
              {isAr ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
            </Link>
          </motion.div>
        </div>

        {/* Grid — uniform 3 columns on desktop, all cards same size */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {items.map(({ product, meta }, i) => (
            <ProductCard
              key={meta.slug}
              product={product}
              meta={meta}
              locale={locale}
              index={i}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 lg:mt-14 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
            {isAr
              ? "هل تبحث عن حل مخصص لعملك؟"
              : "Looking for a custom solution for your business?"}
          </p>
          <Link
            href={`/${locale}/contact`}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 btn-hero-primary"
          >
            {t.cta}
            {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
