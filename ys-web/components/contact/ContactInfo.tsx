"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Mail, Phone, MapPin, Clock, ArrowUpRight } from "lucide-react"
import type { PublicSettings } from "@/types"

interface ContactInfoProps {
  locale: string
  settings?: PublicSettings | null
}

interface InfoCard {
  icon: React.ElementType
  title: string
  titleAr: string
  lines: { text: string; href?: string }[]
  accent: string
  bg: string
}

export function ContactInfo({ locale, settings }: ContactInfoProps) {
  const isAr = locale === "ar"
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })

  // Contact details come from CMS settings when configured; static values
  // only as a last-resort fallback so the section never renders empty.
  const brandEmail = settings?.brand?.contact_email
  const salesEmail = settings?.contacts?.sales_email
  const whatsapp = settings?.contacts?.whatsapp_number
  const whatsappDisplay = settings?.contacts?.whatsapp_display ?? whatsapp

  const cards: InfoCard[] = [
    {
      icon: Mail,
      title: "Email",
      titleAr: "البريد الإلكتروني",
      lines: [
        ...(brandEmail ? [{ text: brandEmail, href: `mailto:${brandEmail}` }] : []),
        ...(salesEmail ? [{ text: salesEmail, href: `mailto:${salesEmail}` }] : []),
      ],
      accent: "#0A4FE7",
      bg: "rgba(10,79,231,0.1)",
    },
    {
      icon: Phone,
      title: "Phone",
      titleAr: "الهاتف",
      lines: whatsapp
        ? [{ text: whatsappDisplay ?? whatsapp, href: `https://wa.me/${whatsapp}` }]
        : [],
      accent: "#10B981",
      bg: "rgba(16,185,129,0.1)",
    },
    {
      icon: MapPin,
      title: "Location",
      titleAr: "الموقع",
      lines: [
        { text: "Cairo, Egypt" },
        { text: "Riyadh, Saudi Arabia" },
      ],
      accent: "#8B5CF6",
      bg: "rgba(139,92,246,0.1)",
    },
    {
      icon: Clock,
      title: "Working Hours",
      titleAr: "ساعات العمل",
      lines: [
        { text: isAr ? "الأحد - الخميس: 9ص - 6م" : "Sun - Thu: 9AM - 6PM" },
        { text: isAr ? "الجمعة - السبت: مغلق" : "Fri - Sat: Closed" },
      ],
      accent: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
    },
  ].filter((card) => card.lines.length > 0)

  return (
    <section ref={ref} className="container-site relative z-10 pb-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-5 lg:p-6 group"
              style={{
                background: "var(--surface-faint)",
                border: "1px solid var(--border-card)",
                boxShadow: "var(--shadow-card-md)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: card.bg, border: `1px solid ${card.accent}25` }}
                >
                  <Icon size={18} style={{ color: card.accent }} />
                </div>
                {card.lines[0]?.href && (
                  <ArrowUpRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--color-foreground-muted)" }}
                  />
                )}
              </div>

              <h4
                className="font-display font-semibold text-sm mb-3"
                style={{ color: "var(--color-foreground)" }}
              >
                {isAr ? card.titleAr : card.title}
              </h4>

              <div className="space-y-1.5">
                {card.lines.map((line, li) =>
                  line.href ? (
                    <a
                      key={li}
                      href={line.href}
                      className="block text-sm transition-colors hover:opacity-80"
                      style={{ color: "var(--color-foreground-muted)" }}
                    >
                      {line.text}
                    </a>
                  ) : (
                    <p key={li} className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
                      {line.text}
                    </p>
                  )
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
