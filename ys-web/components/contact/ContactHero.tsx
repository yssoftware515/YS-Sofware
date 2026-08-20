"use client"

import { motion } from "framer-motion"
import { MessageCircle } from "lucide-react"

interface ContactHeroProps {
  locale: string
}

export function ContactHero({ locale }: ContactHeroProps) {
  const isAr = locale === "ar"

  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(10,79,231,0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="container-site relative z-10 pt-24 pb-12 lg:pt-32 lg:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <span
            className="glass-badge inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase mb-6"
            style={{ color: "rgba(10, 79, 231, 0.9)" }}
          >
            <MessageCircle size={12} />
            {isAr ? "نحن هنا لمساعدتك" : "We are here to help"}
          </span>

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
                دعنا <span className="text-gradient-blue-strong">نبدأ الحوار</span>
              </>
            ) : (
              <>
                Let&apos;s <span className="text-gradient-blue-strong">Start a Conversation</span>
              </>
            )}
          </h1>

          <p
            className="text-base lg:text-lg leading-relaxed"
            style={{ color: "var(--color-foreground-muted)", maxWidth: 560, margin: "0 auto" }}
          >
            {isAr
              ? "استفسارات، دعم فني، شراكات، أو فكرة مشروع — فريقنا جاهز للاستماع ونعاود التواصل معك في أقرب وقت."
              : "Inquiries, technical support, partnerships, or a project idea — our team is ready to listen and get back to you promptly."}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
