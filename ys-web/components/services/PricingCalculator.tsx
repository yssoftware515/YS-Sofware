"use client"

import { useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calculator, Users, Layers, Headphones, Clock, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { CURRENCIES, type CurrencyCode, getCurrencySymbol, convertBudget } from "@/lib/utils/services-utils"

interface PricingCalculatorProps {
  locale: string
  basePrice: number
  baseCurrency: CurrencyCode
  pricingType: "custom_quote" | "fixed"
}

interface CalculatorOption {
  id: string
  label: string
  labelAr: string
  icon: React.ElementType
  options: { value: string; label: string; labelAr: string; multiplier: number }[]
}

const CALCULATOR_CONFIG: CalculatorOption[] = [
  {
    id: "users",
    label: "Number of Users",
    labelAr: "عدد المستخدمين",
    icon: Users,
    options: [
      { value: "1-10", label: "1-10 users", labelAr: "1-10 مستخدم", multiplier: 1.0 },
      { value: "11-50", label: "11-50 users", labelAr: "11-50 مستخدم", multiplier: 1.4 },
      { value: "51-200", label: "51-200 users", labelAr: "51-200 مستخدم", multiplier: 2.0 },
      { value: "201-1000", label: "201-1000 users", labelAr: "201-1000 مستخدم", multiplier: 3.2 },
      { value: "1000+", label: "1000+ users", labelAr: "1000+ مستخدم", multiplier: 5.0 },
    ],
  },
  {
    id: "features",
    label: "Feature Complexity",
    labelAr: "تعقيد الميزات",
    icon: Layers,
    options: [
      { value: "basic", label: "Basic", labelAr: "أساسي", multiplier: 1.0 },
      { value: "standard", label: "Standard", labelAr: "قياسي", multiplier: 1.5 },
      { value: "advanced", label: "Advanced", labelAr: "متقدم", multiplier: 2.5 },
      { value: "enterprise", label: "Enterprise", labelAr: "مؤسسي", multiplier: 4.0 },
    ],
  },
  {
    id: "support",
    label: "Support Level",
    labelAr: "مستوى الدعم",
    icon: Headphones,
    options: [
      { value: "basic", label: "Basic (Email)", labelAr: "أساسي (بريد)", multiplier: 1.0 },
      { value: "standard", label: "Standard (Business Hours)", labelAr: "قياسي (ساعات العمل)", multiplier: 1.3 },
      { value: "premium", label: "Premium (24/7)", labelAr: "مميز (24/7)", multiplier: 2.0 },
    ],
  },
  {
    id: "timeline",
    label: "Timeline",
    labelAr: "الجدول الزمني",
    icon: Clock,
    options: [
      { value: "relaxed", label: "Relaxed (3+ months)", labelAr: "مرن (3+ أشهر)", multiplier: 0.9 },
      { value: "standard", label: "Standard (1-3 months)", labelAr: "قياسي (1-3 أشهر)", multiplier: 1.0 },
      { value: "urgent", label: "Urgent (< 1 month)", labelAr: "عاجل (< شهر)", multiplier: 1.5 },
    ],
  },
]

export function PricingCalculator({ locale, basePrice, baseCurrency, pricingType }: PricingCalculatorProps) {
  const isAr = locale === "ar"
  const [isOpen, setIsOpen] = useState(false)
  const [selections, setSelections] = useState<Record<string, string>>({
    users: "1-10",
    features: "basic",
    support: "basic",
    timeline: "standard",
  })
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(baseCurrency)

  const totalMultiplier = useMemo(() => {
    return CALCULATOR_CONFIG.reduce((acc, config) => {
      const selected = config.options.find((o) => o.value === selections[config.id])
      return acc * (selected?.multiplier || 1)
    }, 1)
  }, [selections])

  const estimatedPrice = useMemo(() => {
    if (pricingType === "custom_quote") return null
    const raw = basePrice * totalMultiplier
    // Round to nearest 100
    return Math.ceil(raw / 100) * 100
  }, [basePrice, totalMultiplier, pricingType])

  // The estimate is computed in the service's own currency; the selected
  // display currency is only presentation, so convert before showing it.
  const displayedPrice = useMemo(() => {
    if (estimatedPrice === null) return null
    const converted = convertBudget(estimatedPrice, baseCurrency, displayCurrency)
    return Math.ceil(converted / 100) * 100
  }, [estimatedPrice, baseCurrency, displayCurrency])

  const handleSelect = useCallback((configId: string, value: string) => {
    setSelections((prev) => ({ ...prev, [configId]: value }))
  }, [])

  const symbol = getCurrencySymbol(displayCurrency)

  if (pricingType === "custom_quote") {
    return (
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--surface-faint)",
          border: "1px solid var(--border-card)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <Calculator size={18} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: "var(--color-foreground)" }}>
              {isAr ? "حاسبة التسعير" : "Pricing Calculator"}
            </h3>
            <p className="text-xs" style={{ color: "var(--color-foreground-muted)" }}>
              {isAr ? "هذه الخدمة تتطلب عرض سعر مخصص" : "This service requires a custom quote"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surface-faint)",
        border: "1px solid var(--border-card)",
        boxShadow: "var(--shadow-panel)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(10,79,231,0.12)", border: "1px solid rgba(10,79,231,0.2)" }}
          >
            <Calculator size={18} style={{ color: "var(--color-accent)" }} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: "var(--color-foreground)" }}>
              {isAr ? "حاسبة التسعير التقريبي" : "Estimated Pricing Calculator"}
            </h3>
            <p className="text-xs" style={{ color: "var(--color-foreground-muted)" }}>
              {isAr ? "اضبط المتغيرات لمعرفة التكلفة التقريبة" : "Adjust variables to see estimated cost"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {displayedPrice && (
            <span className="hidden sm:inline font-display font-bold text-lg" style={{ color: "var(--color-accent)" }}>
              {symbol}{displayedPrice.toLocaleString("en-US")}
            </span>
          )}
          {isOpen ? (
            <ChevronUp size={18} style={{ color: "var(--color-foreground-muted)" }} />
          ) : (
            <ChevronDown size={18} style={{ color: "var(--color-foreground-muted)" }} />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-5" style={{ borderTop: "1px solid var(--border-faint)" }}>
              {/* Currency selector */}
              <div className="pt-5 flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--color-foreground-subtle)" }}>
                  {isAr ? "العملة" : "Currency"}
                </span>
                <select
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value as CurrencyCode)}
                  className="px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                  style={{
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border-input)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Options */}
              {CALCULATOR_CONFIG.map((config) => {
                const Icon = config.icon
                const selectedOption = config.options.find((o) => o.value === selections[config.id])
                return (
                  <div key={config.id}>
                    <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: "var(--color-foreground-subtle)" }}>
                      <Icon size={12} />
                      {isAr ? config.labelAr : config.label}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {config.options.map((option) => {
                        const isSelected = selections[config.id] === option.value
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleSelect(config.id, option.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                            style={{
                              background: isSelected ? "var(--chip-blue-bg)" : "var(--surface-subtle)",
                              border: isSelected ? "1px solid var(--chip-blue-border)" : "1px solid var(--border-card)",
                              color: isSelected ? "var(--color-accent)" : "var(--color-foreground-muted)",
                            }}
                          >
                            {isAr ? option.labelAr : option.label}
                          </button>
                        )
                      })}
                    </div>
                    {selectedOption && selectedOption.multiplier !== 1 && (
                      <p className="text-[10px] mt-1" style={{ color: "var(--color-foreground-muted)" }}>
                        {isAr ? "مضاعف:" : "Multiplier:"} {selectedOption.multiplier}x
                      </p>
                    )}
                  </div>
                )
              })}

              {/* Total */}
              <div
                className="rounded-xl p-4 flex items-center justify-between"
                style={{
                  background: "rgba(10,79,231,0.06)",
                  border: "1px solid rgba(10,79,231,0.12)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} style={{ color: "var(--color-accent)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                    {isAr ? "التكلفة التقريبية" : "Estimated Cost"}
                  </span>
                </div>
                <span className="font-display font-bold text-xl" style={{ color: "var(--color-accent)" }}>
                  {displayedPrice
                    ? `${symbol}${displayedPrice.toLocaleString("en-US")}`
                    : isAr ? "غير متاح" : "N/A"}
                </span>
              </div>

              <p className="text-[10px] text-center" style={{ color: "var(--color-foreground-muted)" }}>
                {isAr
                  ? "هذا تقدير تقريبي فقط. السعر النهائي يعتمد على متطلبات المشروع المحددة."
                  : "This is an approximate estimate only. Final pricing depends on specific project requirements."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
