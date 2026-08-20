"use client"

import { motion } from "framer-motion"
import { Search, Sparkles } from "lucide-react"

interface ServicesHeroProps {
  locale: string
  searchValue: string
  onSearchChange: (value: string) => void
}

export function ServicesHero({ locale, searchValue, onSearchChange }: ServicesHeroProps) {
  const isAr = locale === "ar"

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(10,79,231,0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="container-site relative z-10 pt-24 pb-16 lg:pt-32 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Badge */}
          <span
            className="glass-badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase mb-6"
            style={{ color: "rgba(10, 79, 231, 0.9)" }}
          >
            <Sparkles size={12} />
            {isAr ? "حلول متكاملة" : "End-to-End Solutions"}
          </span>

          {/* Title */}
          <h1
            className="font-display font-bold tracking-tight mb-5"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--color-foreground)",
            }}
          >
            {isAr ? (
              <>
                خدماتنا{" "}
                <span className="text-gradient-blue-strong">التقنية المتخصصة</span>
              </>
            ) : (
              <>
                Our{" "}
                <span className="text-gradient-blue-strong">Specialized Services</span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p
            className="text-base lg:text-lg leading-relaxed mb-10"
            style={{ color: "var(--color-foreground-muted)", maxWidth: 560, margin: "0 auto 2.5rem" }}
          >
            {isAr
              ? "من الاستشارة إلى التنفيذ — نبني لك الحلول التي تنمو مع أعمالك. أخبرنا بميزانيتك وسنقترح الأنسب."
              : "From consulting to execution — we build solutions that grow with your business. Tell us your budget and we'll suggest the best fit."}
          </p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-xl mx-auto"
          >
            <div
              className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
              style={{
                background: "var(--surface-subtle)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid var(--border-input)",
                boxShadow: "var(--shadow-search)",
              }}
            >
              <Search size={18} style={{ color: "var(--color-foreground-muted)", flexShrink: 0 }} />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={isAr ? "ابحث في الخدمات..." : "Search services..."}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--color-foreground)", minWidth: 0 }}
                aria-label={isAr ? "بحث الخدمات" : "Search services"}
              />
              {searchValue && (
                <button
                  onClick={() => onSearchChange("")}
                  className="text-xs font-medium px-2 py-1 rounded-lg transition-colors"
                  style={{ color: "var(--color-foreground-muted)", background: "var(--surface-hover)" }}
                >
                  {isAr ? "مسح" : "Clear"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
