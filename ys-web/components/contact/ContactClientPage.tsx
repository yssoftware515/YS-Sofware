"use client"

import { ContactHero } from "./ContactHero"
import { ContactForm } from "./ContactForm"
import { ContactInfo } from "./ContactInfo"
import type { PublicSettings } from "@/types"

interface ContactClientPageProps {
  locale: string
  serviceSlug?: string
  serviceName?: string
  settings?: PublicSettings | null
}

export function ContactClientPage({ locale, serviceSlug, serviceName, settings }: ContactClientPageProps) {
  const isAr = locale === "ar"
  const whatsappNumber = settings?.contacts?.whatsapp_number ?? ""

  return (
    <main style={{ backgroundColor: "var(--color-background)" }}>
      <ContactHero locale={locale} />

      <section className="container-site relative z-10 pb-16">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-3">
            <ContactForm
              locale={locale}
              serviceSlug={serviceSlug}
              serviceName={serviceName}
            />
          </div>
          <div className="lg:col-span-2 space-y-6">
            {/* WhatsApp Quick Card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(37,211,102,0.05)",
                border: "1px solid rgba(37,211,102,0.15)",
              }}
            >
              <h4 className="font-display font-semibold text-sm mb-2" style={{ color: "var(--color-foreground)" }}>
                {isAr ? "تواصل عبر واتساب" : "Chat on WhatsApp"}
              </h4>
              <p className="text-xs mb-4" style={{ color: "var(--color-foreground-muted)" }}>
                {isAr ? "رد فوري خلال ساعات العمل" : "Instant reply during business hours"}
              </p>
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(isAr ? "مرحباً YS Systems" : "Hello YS Systems")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "rgba(37,211,102,0.15)",
                  border: "1px solid rgba(37,211,102,0.25)",
                  color: "#25D366",
                }}
              >
                {isAr ? "بدء محادثة" : "Start Chat"}
              </a>
            </div>

            {/* Response Time Card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(10,79,231,0.05)",
                border: "1px solid rgba(10,79,231,0.12)",
              }}
            >
              <h4 className="font-display font-semibold text-sm mb-2" style={{ color: "var(--color-foreground)" }}>
                {isAr ? "وقت الاستجابة" : "Response Time"}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--color-foreground-muted)" }}>Email</span>
                  <span className="font-semibold" style={{ color: "var(--color-accent)" }}>
                    {isAr ? "خلال ساعات العمل" : "Business hours"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--color-foreground-muted)" }}>WhatsApp</span>
                  <span className="font-semibold" style={{ color: "#25D366" }}>
                    {isAr ? "حسب الاتفاق" : "Per agreement"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ContactInfo locale={locale} settings={settings} />

      {/* FAQ Link */}
      <section className="container-site pb-16">
        <div
          className="rounded-2xl p-6 sm:p-8 text-center"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h3 className="font-display font-semibold text-lg mb-1.5" style={{ color: "var(--color-foreground)" }}>
            {isAr ? "عندك أسئلة عن YS-SOFTWARE؟" : "Questions about YS-SOFTWARE?"}
          </h3>
          <p className="text-sm mb-5" style={{ color: "var(--color-foreground-muted)" }}>
            {isAr
              ? "كل ما تحتاج معرفته قبل البدء — في صفحة واحدة."
              : "Everything you need to know before we begin — in one place."}
          </p>
          <a
            href={`/${locale}/faq`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
            style={{
              background: "rgba(10,79,231,0.12)",
              border: "1px solid rgba(10,79,231,0.2)",
              color: "var(--color-accent)",
            }}
          >
            {isAr ? "شوف كل الأسئلة" : "View All FAQs"}
          </a>
        </div>
      </section>
    </main>
  )
}