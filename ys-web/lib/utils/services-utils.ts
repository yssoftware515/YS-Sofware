"use client"

import type { BudgetRange, Service } from "@/types"

export type CurrencyCode = "USD" | "EGP" | "SAR" | "AED" | "EUR" | "GBP"

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string; labelAr: string }[] = [
  { code: "USD", symbol: "$", label: "US Dollar", labelAr: "دولار أمريكي" },
  { code: "EGP", symbol: "E£", label: "Egyptian Pound", labelAr: "جنيه مصري" },
  { code: "SAR", symbol: "﷼", label: "Saudi Riyal", labelAr: "ريال سعودي" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham", labelAr: "درهم إماراتي" },
  { code: "EUR", symbol: "€", label: "Euro", labelAr: "يورو" },
  { code: "GBP", symbol: "£", label: "British Pound", labelAr: "جنيه إسترليني" },
]

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol || code
}

export function formatPrice(price: string | number | undefined | null, currency: string): string {
  if (price === null || price === undefined || price === "") return ""
  const num = typeof price === "string" ? parseFloat(price) : price
  if (isNaN(num)) return String(price)
  const symbol = getCurrencySymbol(currency)
  return `${symbol}${num.toLocaleString("en-US")}`
}

export function filterServices(
  services: Service[],
  query: string,
  category: string | null,
  budget: number | null,
  budgetCurrency: CurrencyCode,
): Service[] {
  return services.filter((s) => {
    const matchesQuery = !query ||
      s.name?.toLowerCase().includes(query.toLowerCase()) ||
      s.short_desc?.toLowerCase().includes(query.toLowerCase()) ||
      s.category?.toLowerCase().includes(query.toLowerCase())

    const matchesCategory = !category || s.category === category

    // Budget comparison is currency-aware: the service's own price is
    // converted into the visitor's chosen currency before comparing, so
    // "50,000 EGP" and "$1,000" never get compared as if equal.
    const matchesBudget = !budget || !s.starting_price ||
      budget >= toBudgetCurrency(parseFloat(String(s.starting_price)), s.currency, budgetCurrency)

    return matchesQuery && matchesCategory && matchesBudget
  })
}

function toBudgetCurrency(price: number, serviceCurrency: string | null, target: CurrencyCode): number {
  const from = CURRENCIES.some((c) => c.code === serviceCurrency)
    ? (serviceCurrency as CurrencyCode)
    : "USD"
  return convertBudget(price, from, target)
}

export function getCategories(services: Service[]): string[] {
  const cats = new Set<string>()
  services.forEach((s) => { if (s.category) cats.add(s.category) })
  return Array.from(cats)
}

// Approximate conversion rates (for budget matching display only)
export function convertBudget(value: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return value
  const rates: Record<CurrencyCode, number> = {
    USD: 1,
    EGP: 0.02,
    SAR: 0.27,
    AED: 0.27,
    EUR: 1.08,
    GBP: 1.27,
  }
  const inUSD = value * rates[from]
  return inUSD / rates[to]
}

// Maps a free-text budget amount to the backend's ContactRequest
// budget_range buckets (USD-based, mirrored with ContactRequest::BUDGET_RANGES).
export function budgetToRange(amount: number, currency: CurrencyCode): BudgetRange {
  const usd = convertBudget(amount, currency, "USD")
  if (usd < 10000) return "under_10k"
  if (usd < 30000) return "10k_30k"
  if (usd < 100000) return "30k_100k"
  return "over_100k"
}
