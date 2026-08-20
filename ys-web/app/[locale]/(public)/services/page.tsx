import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import { ServicesClientPage } from "@/components/services/ServicesClientPage"
import { ServiceTestimonials } from "@/components/services/ServiceTestimonials"
import { api } from "@/lib/api/client"
import type { Service } from "@/types"

interface Props {
  params: Promise<{ locale: string }>
}

const locales = ["en", "ar"] as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isAr = locale === "ar"
  return {
    title: isAr ? "خدماتنا | YS Systems" : "Our Services | YS Systems",
    description: isAr
      ? "حلول تقنية متكاملة — من الاستشارة إلى التنفيذ"
      : "End-to-end technology solutions — from consulting to execution",
  }
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params
  if (!locales.includes(locale as (typeof locales)[number])) notFound()

  let services: Service[] = []
  try {
    services = await api.services(locale)
  } catch {
    // API unreachable — render the empty state instead of crashing the page
  }

  return (
    <main style={{ backgroundColor: "var(--color-background)" }}>
      <Suspense fallback={<ServicesSkeleton />}>
        <ServicesClientPage locale={locale} services={services} />
      </Suspense>
      <ServiceTestimonials locale={locale} />
    </main>
  )
}

function ServicesSkeleton() {
  return (
    <div className="container-site pt-32 pb-20">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <div className="h-4 w-24 mx-auto rounded-full mb-6 skeleton" />
        <div className="h-10 w-3/4 mx-auto rounded-lg mb-4 skeleton" />
        <div className="h-5 w-1/2 mx-auto rounded-lg skeleton" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 rounded-2xl skeleton" />
        ))}
      </div>
    </div>
  )
}
