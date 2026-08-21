"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Star } from "lucide-react"

interface ServiceTestimonialsProps {
  locale: string
}

export function ServiceTestimonials({ locale }: ServiceTestimonialsProps) {
  const isAr = locale === "ar"
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: "-80px" })

  return (
    <section ref={sectionRef} className="container-site relative z-10 py-16 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-12"
      >
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase mb-4"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            color: "#F59E0B",
          }}
        >
          <Star size={10} fill="#F59E0B" />
          {isAr ? "شريكك الرقمي" : "Your Digital Partner"}
        </span>
        <h2
          className="font-display font-bold text-2xl lg:text-3xl tracking-tight mb-3"
          style={{ color: "var(--color-foreground)" }}
        >
          {isAr ? "ثقة تُبنى بالنتائج" : "Trust Built on Results"}
        </h2>
        <p className="text-sm max-w-md mx-auto" style={{ color: "var(--color-foreground-muted)" }}>
          {isAr
            ? "شريك واحد لرحلتك الرقمية كاملة"
            : "One partner for your entire digital journey"}
        </p>
      </motion.div>

      {/* Stats strip — each stat has EN/AR values; no placeholders. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { en: "SaaS", ar: "SaaS", labelEn: "Product Ecosystem", labelAr: "منظومة منتجات" },
          { en: "AR·EN", ar: "AR·EN", labelEn: "Bilingual by Design", labelAr: "ثنائي اللغة" },
          { en: "End-to-End", ar: "متكامل", labelEn: "Design → Build → Operate", labelAr: "تصميم ← بناء ← تشغيل" },
          { en: "Long-Term", ar: "طويل الأمد", labelEn: "Technology Partnership", labelAr: "شراكة تقنية" },
        ].map((stat, i) => (
          <div
            key={i}
            className="text-center rounded-xl p-4"
            style={{
              background: "var(--surface-faint)",
              border: "1px solid var(--border-faint)",
            }}
          >
            <p
              className="font-display font-bold text-2xl lg:text-3xl mb-1"
              style={{ color: "var(--color-accent)" }}
            >
              {isAr ? stat.ar : stat.en}
            </p>
            <p className="text-xs" style={{ color: "var(--color-foreground-muted)" }}>
              {isAr ? stat.labelAr : stat.labelEn}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  )
}