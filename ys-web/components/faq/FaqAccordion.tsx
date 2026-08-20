"use client"
import { useState, useRef } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { ChevronDown, MessageSquare } from "lucide-react"
import type { FaqItem } from "@/types"

interface FaqAccordionProps {
  items: FaqItem[]
  locale: string
}

export function FaqAccordion({ items, locale }: FaqAccordionProps) {
  const isAr = locale === "ar"
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="relative overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Ambient background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div className="container-site relative z-10 py-16 lg:py-24">
        {/* FAQ Grid */}
        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <motion.div
                key={faq.id ?? i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="rounded-2xl overflow-hidden transition-all duration-500"
                  style={{
                    background: isOpen
                      ? "var(--surface-card-open)"
                      : "var(--surface-card)",
                    border: isOpen
                      ? "1px solid var(--border-card-open)"
                      : "1px solid var(--border-card)",
                    boxShadow: isOpen
                      ? "var(--shadow-card-open)"
                      : "var(--shadow-card)",
                  }}
                >
                  {/* Question Bar */}
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center gap-4 p-5 lg:p-6 text-left group"
                  >
                    {/* Number */}
                    <span
                      className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-xs font-bold shrink-0 transition-all duration-300"
                      style={{
                        background: isOpen ? "rgba(139,92,246,0.15)" : "var(--surface-subtle)",
                        border: isOpen ? "1px solid rgba(139,92,246,0.25)" : "1px solid var(--border-card)",
                        color: isOpen ? "var(--accent-purple)" : "var(--color-foreground-muted)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-sm lg:text-[15px] font-semibold leading-snug transition-colors duration-300"
                        style={{ color: isOpen ? "var(--color-foreground)" : "var(--text-strong)" }}
                      >
                        {faq.question}
                      </h3>
                      {/* Highlight pills */}
                      {faq.highlight && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: isOpen ? 1 : 0, height: isOpen ? "auto" : 0 }}
                          className="flex flex-wrap gap-1.5 mt-2 overflow-hidden"
                        >
                          {faq.highlight.split(" • ").map((tag, ti) => (
                            <span
                              key={ti}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                              style={{
                                background: "var(--chip-purple-bg)",
                                border: "1px solid var(--chip-purple-border)",
                                color: "var(--accent-purple)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    {/* Chevron with glow on open */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-400"
                      style={{
                        background: isOpen ? "rgba(139,92,246,0.12)" : "var(--surface-subtle)",
                        border: isOpen ? "1px solid rgba(139,92,246,0.2)" : "1px solid var(--border-card)",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        boxShadow: isOpen ? "0 0 20px rgba(139,92,246,0.15)" : "none",
                      }}
                    >
                      <ChevronDown size={14} style={{ color: isOpen ? "var(--accent-purple)" : "var(--color-foreground-muted)" }} />
                    </div>
                  </button>
                  {/* Answer */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-5 lg:px-6 pb-5 lg:pb-6"
                          style={{
                            borderTop: "1px solid var(--divider)",
                            marginLeft: "3.5rem",
                            marginRight: "1rem",
                            paddingTop: "1.25rem",
                          }}
                        >
                          <div
                            className="text-[13px] leading-[1.85] whitespace-pre-line"
                            style={{ color: "var(--text-body)" }}
                          >
                            {faq.answer}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-16 text-center"
        >
          <div
            className="inline-flex flex-col sm:flex-row items-center gap-4 rounded-2xl px-8 py-5"
            style={{
              background: "rgba(10,79,231,0.04)",
              border: "1px solid rgba(10,79,231,0.1)",
            }}
          >
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                {isAr ? "لم تجد إجابتك؟" : "Still have questions?"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
                {isAr
                  ? "أخبرنا أين تقف أعمالك اليوم — وسنساعدك على تحديد نقطة البداية المناسبة"
                  : "Tell us where your business is today — we'll help you decide the right starting point"}
              </p>
            </div>
            <a
              href={`/${locale}/contact`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 shrink-0"
              style={{
                background: "rgba(10,79,231,0.12)",
                border: "1px solid rgba(10,79,231,0.2)",
                color: "var(--color-accent)",
              }}
            >
              <MessageSquare size={14} />
              {isAr ? "ابدأ المحادثة" : "Start a Conversation"}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}