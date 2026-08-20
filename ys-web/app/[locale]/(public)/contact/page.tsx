import { notFound } from "next/navigation"
import { Metadata } from "next"
import { ContactClientPage } from "@/components/contact/ContactClientPage"
import { api } from "@/lib/api/client"
import type { PublicSettings } from "@/types"

const locales = ["en", "ar"] as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === "ar"
  return {
    title: isAr ? "تواصل معنا | YS Systems" : "Contact Us | YS Systems",
    description: isAr
      ? "استفسارات، دعم فني، شراكات، أو فكرة مشروع — فريقنا جاهز للاستماع والرد في أقل من 24 ساعة."
      : "Inquiries, technical support, partnerships, or a project idea — our team is ready to listen and respond within 24 hours.",
  }
}

export default async function ContactPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale } = await params
  const query = await searchParams

  if (!locales.includes(locale as (typeof locales)[number])) notFound()

  const serviceSlug = typeof query.service === "string" ? query.service : undefined

  let serviceName: string | undefined
  if (serviceSlug) {
    try {
      const service = await api.service(serviceSlug, locale)
      serviceName = service.name
    } catch { /* ignore */ }
  }

  let settings: PublicSettings | null = null
  try {
    settings = await api.settings(locale)
  } catch { /* ignore */ }

  return <ContactClientPage locale={locale} serviceSlug={serviceSlug} serviceName={serviceName} settings={settings} />
}