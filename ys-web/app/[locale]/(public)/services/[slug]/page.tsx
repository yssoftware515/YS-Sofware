import { notFound } from "next/navigation"
import { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowLeft, CheckCircle2, Wallet, MessageCircle } from "lucide-react"
import { formatPrice, type CurrencyCode } from "@/lib/utils/services-utils"
import { ServiceRequestForm } from "@/components/services/ServiceRequestForm"
import { PricingCalculator } from "@/components/services/PricingCalculator"
import { ServiceTestimonials } from "@/components/services/ServiceTestimonials"
import { api } from "@/lib/api/client"
import type { Service, PublicSettings } from "@/types"

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

const locales = ["en", "ar"] as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const service = await getService(slug, locale)
  if (!service) return { title: "Not Found" }

  const isAr = locale === "ar"
  return {
    title: `${service.name} | ${isAr ? "خدمات" : "Services"} | YS Systems`,
    description: service.short_desc,
  }
}

async function getService(slug: string, locale: string): Promise<Service | null> {
  try {
    return await api.service(slug, locale)
  } catch {
    return null
  }
}

export default async function ServiceDetailPage({ params }: Props) {
  const { locale, slug } = await params
  if (!locales.includes(locale as (typeof locales)[number])) notFound()

  const service = await getService(slug, locale)
  if (!service) notFound()

  const isAr = locale === "ar"
  const Arrow = isAr ? ArrowLeft : ArrowRight

  // hourly rates (and services without a price) never have a project
  // total — they require a custom quote, same as custom_quote services.
  const isCustomQuote = service.pricing_type === "custom_quote" ||
    service.pricing_type === "hourly" ||
    service.starting_price == null

  const priceLabel = isCustomQuote
    ? isAr ? "سعر مخصص" : "Custom Quote"
    : formatPrice(service.starting_price, service.currency || "USD")

  const basePrice = service.starting_price ? parseFloat(String(service.starting_price)) : 0
  const baseCurrency = (service.currency || "USD") as CurrencyCode

  let settings: PublicSettings | null = null
  try {
    settings = await api.settings(locale)
  } catch {
    // Non-critical — WhatsApp links fall back to number-less wa.me
  }

  const whatsappNumber = settings?.contacts?.whatsapp_number ?? ""
  const waText = encodeURIComponent(
    isAr ? "مرحباً، أود الاستفسار عن خدمة " + service.name : "Hi, I'd like to inquire about " + service.name
  )

  return (
    <main style={{ backgroundColor: "var(--color-background)" }}>
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-20">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(10,79,231,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="container-site relative z-10">
          <Link
            href={`/${locale}/services`}
            className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:opacity-80"
            style={{ color: "var(--color-foreground-muted)" }}
          >
            <Arrow size={14} />
            {isAr ? "العودة للخدمات" : "Back to Services"}
          </Link>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left: Content */}
            <div>
              {service.category && (
                <span
                  className="text-xs font-semibold uppercase tracking-wider mb-4 block"
                  style={{ color: "var(--color-accent)" }}
                >
                  {service.category}
                </span>
              )}
              <h1
                className="font-display font-bold tracking-tight mb-5"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  color: "var(--color-foreground)",
                }}
              >
                {service.name}
              </h1>
              <p
                className="text-base lg:text-lg leading-relaxed mb-8"
                style={{ color: "var(--color-foreground-muted)", maxWidth: 520 }}
              >
                {service.short_desc}
              </p>

              {/* Pricing Card */}
              <div
                className="rounded-2xl p-6 mb-8"
                style={{
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border-card)",
                  boxShadow: "var(--shadow-search)",
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(10,79,231,0.12)", border: "1px solid rgba(10,79,231,0.2)" }}
                  >
                    <Wallet size={18} style={{ color: "var(--color-accent)" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--color-foreground-muted)" }}>
                      {isAr ? "يبدأ من" : "Starting at"}
                    </p>
                    <p className="font-display font-bold text-xl" style={{ color: "var(--color-foreground)" }}>
                      {priceLabel}
                    </p>
                  </div>
                </div>

                {/* Pricing Calculator */}
                <div className="pt-4" style={{ borderTop: "1px solid var(--border-faint)" }}>
                  <PricingCalculator
                    locale={locale}
                    basePrice={basePrice}
                    baseCurrency={baseCurrency}
                    pricingType={isCustomQuote ? "custom_quote" : "fixed"}
                  />
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`#request-form`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 btn-hero-primary"
                >
                  {isAr ? "اطلب عرض سعر" : "Request a Quote"}
                  <Arrow size={16} />
                </a>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
                  style={{
                    background: "rgba(37,211,102,0.1)",
                    border: "1px solid rgba(37,211,102,0.2)",
                    color: "#25D366",
                  }}
                >
                  <MessageCircle size={16} />
                  {isAr ? "تواصل عبر واتساب" : "Chat on WhatsApp"}
                </a>
              </div>
            </div>

            {/* Right: Visual + Request Form */}
            <div className="space-y-6">
              {service.cover_image ? (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <Image
                    src={service.cover_image.url}
                    alt={service.cover_image.alt || service.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(1,5,15,0.6) 0%, transparent 50%)",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="aspect-[4/3] rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(10,79,231,0.08) 0%, rgba(139,92,246,0.05) 100%)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(10,79,231,0.1)", border: "1px solid rgba(10,79,231,0.15)" }}
                  >
                    <CheckCircle2 size={40} style={{ color: "var(--color-accent)" }} />
                  </div>
                </div>
              )}

              {/* Inline Request Form */}
              <div id="request-form">
                <ServiceRequestForm
                  locale={locale}
                  serviceSlug={service.slug}
                  serviceName={service.name}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <ServiceTestimonials locale={locale} />
    </main>
  )
}
