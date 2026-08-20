"use client"

import { useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useInView } from "framer-motion"
import { ArrowRight, ArrowLeft, Zap, Layers, Box, Code2, Palette, Globe, BrainCircuit } from "lucide-react"
import type { Service } from "@/types"
import { formatPrice, type CurrencyCode } from "@/lib/utils/services-utils"
import { cn } from "@/lib/utils/cn"

const ICONS = [Zap, Layers, Code2, Palette, Globe, BrainCircuit, Box]

const ACCENT_COLORS = [
  { accent: "#0A4FE7", bg: "rgba(10,79,231,0.12)", glow: "rgba(10,79,231,0.25)" },
  { accent: "#8B5CF6", bg: "rgba(139,92,246,0.12)", glow: "rgba(139,92,246,0.25)" },
  { accent: "#10B981", bg: "rgba(16,185,129,0.12)", glow: "rgba(16,185,129,0.25)" },
  { accent: "#F59E0B", bg: "rgba(245,158,11,0.12)", glow: "rgba(245,158,11,0.25)" },
]

interface ServiceCardProps {
  service: Service
  locale: string
  index: number
  featured?: boolean
  budgetCurrency?: CurrencyCode
}

export function ServiceCard({ service, locale, index, featured = false, budgetCurrency = "USD" }: ServiceCardProps) {
  const isAr = locale === "ar"
  const cardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(cardRef, { once: true, margin: "-60px" })
  const Arrow = isAr ? ArrowLeft : ArrowRight

  const colorSet = ACCENT_COLORS[index % ACCENT_COLORS.length]
  // The API exposes no per-service icon key — derive a stable icon from
  // the card's position so the grid stays visually varied without
  // depending on data the backend does not send.
  const Icon = ICONS[index % ICONS.length]

  const isCustomQuote = service.pricing_type === "custom_quote" ||
    service.pricing_type === "hourly" ||
    !service.starting_price
  const priceDisplay = isCustomQuote
    ? isAr ? "سعر مخصص" : "Custom Quote"
    : formatPrice(service.starting_price, service.currency || budgetCurrency)

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn("group h-full", featured && "md:col-span-2 lg:col-span-2")}
    >
      <Link
        href={`/${locale}/services/${service.slug}`}
        className="flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
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
          el.style.borderColor = `${colorSet.accent}40`
          el.style.boxShadow = `var(--shadow-card-lg), 0 0 40px -8px ${colorSet.glow}`
          el.style.transform = "translateY(-4px)"
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.borderColor = "var(--border-card)"
          el.style.boxShadow = "var(--shadow-card-lg)"
          el.style.transform = "translateY(0)"
        }}
      >
        {/* Top Bar: Icon + Category + Price */}
        <div className="relative h-48 overflow-hidden">
          {/* Cover Image or Gradient */}
          {service.cover_image ? (
            <Image
              src={service.cover_image.url}
              alt={service.cover_image.alt || service.name}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${colorSet.bg} 0%, transparent 60%)`,
              }}
            />
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(1,5,15,0.95) 0%, rgba(1,5,15,0.4) 50%, rgba(1,5,15,0.1) 100%)",
            }}
          />

          {/* Top content */}
          <div className="absolute top-3.5 inset-x-3.5 flex items-start justify-between">
            {/* Icon */}
            <div
              className="flex items-center justify-center rounded-lg"
              style={{
                width: 40,
                height: 40,
                backgroundColor: colorSet.bg,
                border: `1px solid ${colorSet.accent}30`,
              }}
            >
              <Icon size={20} style={{ color: colorSet.accent }} />
            </div>

            {/* Price badge */}
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: isCustomQuote ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)",
                border: isCustomQuote ? "1px solid rgba(245,158,11,0.25)" : "1px solid rgba(16,185,129,0.25)",
                color: isCustomQuote ? "#F59E0B" : "#34D399",
              }}
            >
              {priceDisplay}
            </div>
          </div>

          {/* Category + Name at bottom */}
          <div className="absolute bottom-0 inset-x-0 px-4 pb-3.5">
            {service.category && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block"
                style={{ color: colorSet.accent }}
              >
                {service.category}
              </span>
            )}
            <h3
              className="font-display font-bold text-lg tracking-tight"
              style={{ color: "#FFFFFF" }}
            >
              {service.name}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-4 lg:p-5 gap-3">
          <p
            className="text-[13px] leading-relaxed line-clamp-3 flex-1"
            style={{ color: "var(--text-soft)" }}
          >
            {service.short_desc}
          </p>

          {/* Footer */}
          <div
            className="pt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid var(--border-faint)" }}
          >
            <span
              className="inline-flex items-center gap-1 text-sm font-semibold transition-all duration-300 group-hover:gap-2"
              style={{ color: colorSet.accent }}
            >
              {isAr ? "التفاصيل" : "Details"}
              <Arrow size={14} />
            </span>

            {service.is_featured && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(10,79,231,0.1)",
                  color: "var(--chip-blue-text)",
                  border: "1px solid rgba(10,79,231,0.15)",
                }}
              >
                {isAr ? "مميز" : "Featured"}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
