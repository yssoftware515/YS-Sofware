"use client"

import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ServicesHero } from "./ServicesHero"
import { ServiceFilter } from "./ServiceFilter"
import { BudgetInput } from "./BudgetInput"
import { ServiceCard } from "./ServiceCard"
import { filterServices, getCategories, type CurrencyCode } from "@/lib/utils/services-utils"
import type { Service } from "@/types"
import { Package } from "lucide-react"

interface ServicesClientPageProps {
  locale: string
  services: Service[]
}

export function ServicesClientPage({ locale, services }: ServicesClientPageProps) {
  const isAr = locale === "ar"
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [budget, setBudget] = useState<number | null>(null)
  const [budgetCurrency, setBudgetCurrency] = useState<CurrencyCode>("USD")

  const categories = useMemo(() => getCategories(services), [services])

  const filtered = useMemo(() => {
    return filterServices(services, search, activeCategory, budget, budgetCurrency)
  }, [services, search, activeCategory, budget, budgetCurrency])

  const featured = useMemo(() => filtered.filter((s) => s.is_featured), [filtered])
  const regular = useMemo(() => filtered.filter((s) => !s.is_featured), [filtered])

  const handleBudgetChange = useCallback((value: number | null, currency: CurrencyCode) => {
    setBudget(value)
    setBudgetCurrency(currency)
  }, [])

  return (
    <>
      <ServicesHero locale={locale} searchValue={search} onSearchChange={setSearch} />
      <BudgetInput locale={locale} value={budget} currency={budgetCurrency} onChange={handleBudgetChange} />
      <ServiceFilter locale={locale} categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} count={filtered.length} />

      <section className="container-site relative z-10 pb-20">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--surface-subtle)", border: "1px solid var(--border-card)" }}>
              <Package size={28} style={{ color: "var(--color-foreground-muted)" }} />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2" style={{ color: "var(--color-foreground)" }}>
              {isAr ? "لا توجد نتائج" : "No services found"}
            </h3>
            <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
              {isAr ? "جرب تعديل البحث أو الميزانية" : "Try adjusting your search or budget"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            <AnimatePresence mode="popLayout">
              {featured.map((service, i) => (
                <ServiceCard key={service.id} service={service} locale={locale} index={i} featured budgetCurrency={budgetCurrency} />
              ))}
              {regular.map((service, i) => (
                <ServiceCard key={service.id} service={service} locale={locale} index={i + featured.length} budgetCurrency={budgetCurrency} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="container-site relative z-10 pb-24" style={{ paddingTop: "var(--space-section-sm)" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="max-w-2xl mx-auto text-center rounded-3xl p-8 lg:p-12" style={{ background: "linear-gradient(135deg, rgba(10,79,231,0.08) 0%, rgba(139,92,246,0.05) 100%)", border: "1px solid var(--border-card)" }}>
          <h2 className="font-display font-bold text-2xl lg:text-3xl tracking-tight mb-4" style={{ color: "var(--color-foreground)" }}>
            {isAr ? "محتاج حل مخصص؟" : "Need a custom solution?"}
          </h2>
          <p className="text-sm lg:text-base mb-8 leading-relaxed" style={{ color: "var(--color-foreground-muted)" }}>
            {isAr ? "نحن نبني حلولاً مخصصة تناسب ميزانيتك وأهدافك. تواصل معنا لمناقشة مشروعك." : "We build tailored solutions that fit your budget and goals. Reach out to discuss your project."}
          </p>
          <a href={`/${locale}/contact`} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 btn-hero-primary">
            {isAr ? "ابدأ مشروعك" : "Start Your Project"}
          </a>
        </motion.div>
      </section>
    </>
  )
}