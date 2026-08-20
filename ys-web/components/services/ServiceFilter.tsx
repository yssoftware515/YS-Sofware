"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils/cn"

interface ServiceFilterProps {
  locale: string
  categories: string[]
  activeCategory: string | null
  onCategoryChange: (cat: string | null) => void
  count: number
}

export function ServiceFilter({ locale, categories, activeCategory, onCategoryChange, count }: ServiceFilterProps) {
  const isAr = locale === "ar"

  return (
    <div className="container-site relative z-10 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <FilterTab
            active={activeCategory === null}
            onClick={() => onCategoryChange(null)}
            label={isAr ? "الكل" : "All"}
            count={count}
          />
          {categories.map((cat) => (
            <FilterTab
              key={cat}
              active={activeCategory === cat}
              onClick={() => onCategoryChange(cat)}
              label={cat}
            />
          ))}
        </div>

        {/* Result count */}
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium shrink-0"
          style={{ color: "var(--color-foreground-muted)" }}
        >
          {count} {isAr ? "خدمة" : count === 1 ? "service" : "services"}
        </motion.span>
      </div>
    </div>
  )
}

function FilterTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shrink-0"
      )}
      style={{
        color: active ? "var(--text-bright)" : "var(--color-foreground-muted)",
        background: active ? "var(--chip-blue-bg)" : "transparent",
        border: active ? "1px solid var(--chip-blue-border)" : "1px solid transparent",
      }}
    >
      {label}
      {count !== undefined && (
        <span
          className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            background: active ? "var(--chip-blue-bg-strong)" : "var(--surface-strong)",
            color: active ? "var(--text-bright)" : "var(--color-foreground-muted)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}
