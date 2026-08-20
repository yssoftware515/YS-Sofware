"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, ChevronDown, Check, X } from "lucide-react"
import { CURRENCIES, type CurrencyCode } from "@/lib/utils/services-utils"
import { cn } from "@/lib/utils/cn"

interface BudgetInputProps {
  locale: string
  value: number | null
  currency: CurrencyCode
  onChange: (value: number | null, currency: CurrencyCode) => void
}

export function BudgetInput({ locale, value, currency, onChange }: BudgetInputProps) {
  const isAr = locale === "ar"
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value?.toString() || "")
  const [syncedValue, setSyncedValue] = useState(value)

  // Sync input with external value — adjusted during render (React's
  // documented pattern), never inside an effect.
  if (syncedValue !== value) {
    setSyncedValue(value)
    setInputValue(value?.toString() || "")
  }
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Allow: empty, numbers, one decimal point
    const cleaned = raw.replace(/[^0-9.]/g, "")
    const parts = cleaned.split(".")
    const sanitized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned

    setInputValue(sanitized)

    const num = parseFloat(sanitized)
    if (!isNaN(num) && num >= 0) {
      onChange(num, currency)
    } else if (sanitized === "" || sanitized === ".") {
      onChange(null, currency)
    }
  }, [currency, onChange])

  const handleCurrencySelect = useCallback((code: CurrencyCode) => {
    onChange(value, code)
    setIsOpen(false)
    inputRef.current?.focus()
  }, [value, onChange])

  const handleClear = useCallback(() => {
    setInputValue("")
    onChange(null, currency)
    inputRef.current?.focus()
  }, [currency, onChange])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="container-site relative z-10 pb-12"
    >
      <div
        className="max-w-2xl mx-auto rounded-2xl p-6 lg:p-8"
        style={{
          background: "var(--surface-faint)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border-card)",
          boxShadow: "var(--shadow-panel)",
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(10,79,231,0.12)", border: "1px solid rgba(10,79,231,0.2)" }}
          >
            <Wallet size={18} style={{ color: "var(--color-accent)" }} />
          </div>
          <div>
            <h3
              className="font-display font-semibold text-base"
              style={{ color: "var(--color-foreground)" }}
            >
              {isAr ? "لديك ميزانية محددة؟" : "Have a budget in mind?"}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
              {isAr
                ? "اكتب ميزانيتك وسنرشح لك الخدمات المناسبة"
                : "Enter your budget and we'll match you with suitable services"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Amount Input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={isAr ? "مثال: 50000" : "e.g. 50000"}
              className="w-full px-4 py-3 pr-10 rounded-xl text-sm font-medium outline-none transition-all"
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-input)",
                color: "var(--color-foreground)",
              }}
              aria-label={isAr ? "الميزانية" : "Budget amount"}
            />
            <AnimatePresence>
              {inputValue && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                  style={{ color: "var(--color-foreground-muted)" }}
                  aria-label={isAr ? "مسح" : "Clear"}
                >
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Currency Selector */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all min-w-[140px] justify-between"
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-input)",
                color: "var(--color-foreground)",
              }}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{selectedCurrency.symbol}</span>
                <span>{selectedCurrency.code}</span>
              </span>
              <ChevronDown
                size={14}
                className="transition-transform"
                style={{
                  color: "var(--color-foreground-muted)",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-50 mt-2 w-full rounded-xl overflow-hidden"
                  style={{
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-dropdown)",
                  }}
                  role="listbox"
                >
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleCurrencySelect(c.code)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        currency === c.code ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-hover-soft)]"
                      )}
                      role="option"
                      aria-selected={currency === c.code}
                    >
                      <span className="text-base w-6 text-center">{c.symbol}</span>
                      <span className="flex-1 text-left" style={{ color: "var(--color-foreground)" }}>
                        {isAr ? c.labelAr : c.label}
                      </span>
                      {currency === c.code && (
                        <Check size={14} style={{ color: "var(--color-accent)" }} />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Budget hint */}
        {value && value > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs mt-3"
            style={{ color: "var(--color-foreground-muted)" }}
          >
            {isAr
              ? `نعرض الخدمات التي تبدأ من ${selectedCurrency.symbol}${value.toLocaleString("en-US")} أو أقل`
              : `Showing services starting at ${selectedCurrency.symbol}${value.toLocaleString("en-US")} or below`}
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}
