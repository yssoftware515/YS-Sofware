"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, CheckCircle2, Loader2, User, Mail, Phone, MessageSquare, Wallet } from "lucide-react"
import { CURRENCIES, type CurrencyCode, budgetToRange } from "@/lib/utils/services-utils"
import { api } from "@/lib/api/client"

interface ServiceRequestFormProps {
  locale: string
  serviceSlug: string
  serviceName: string
}

type FormStatus = "idle" | "submitting" | "success" | "error"

export function ServiceRequestForm({ locale, serviceSlug, serviceName }: ServiceRequestFormProps) {
  const isAr = locale === "ar"
  const [status, setStatus] = useState<FormStatus>("idle")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    budget: "",
    currency: "USD" as CurrencyCode,
    message: "",
  })

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }, [errors])

  const validate = useCallback(() => {
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = isAr ? "الاسم مطلوب" : "Name is required"
    if (!form.email.trim()) {
      nextErrors.email = isAr ? "البريد الإلكتروني مطلوب" : "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = isAr ? "بريد إلكتروني غير صالح" : "Invalid email"
    }
    if (form.budget && isNaN(parseFloat(form.budget))) {
      nextErrors.budget = isAr ? "مبلغ غير صالح" : "Invalid amount"
    }
    if (form.message.trim() && form.message.trim().length < 20) {
      nextErrors.message = isAr ? "الرسالة يجب ألا تقل عن 20 حرفاً" : "Message must be at least 20 characters"
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [form, isAr])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStatus("submitting")
    try {
      // The public contact endpoint has no `budget`/`service_slug` fields —
      // map the free-text budget to its budget_range bucket and carry the
      // exact amount + service context inside `details` for the admin view.
      const budgetNum = form.budget ? parseFloat(form.budget) : null
      const message = form.message.trim() ||
        `${isAr ? "أود الاستفسار عن خدمة" : "Interested in service"} ${serviceName} (${serviceSlug})`
      const details = [
        budgetNum !== null ? `budget: ${form.budget} ${form.currency}` : null,
        `service: ${serviceName} (${serviceSlug})`,
      ].filter((d): d is string => Boolean(d))

      await api.contact({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: `Service Request: ${serviceName}`,
        message,
        budget_range: budgetNum !== null ? budgetToRange(budgetNum, form.currency) : undefined,
        details,
      }, locale)

      setStatus("success")
      setForm({ name: "", email: "", phone: "", budget: "", currency: "USD", message: "" })
    } catch {
      setStatus("error")
    }
  }, [form, serviceSlug, serviceName, validate, locale, isAr])

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-8 text-center"
        style={{
          background: "rgba(16,185,129,0.05)",
          border: "1px solid rgba(16,185,129,0.15)",
        }}
      >
        <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: "#10B981" }} />
        <h3 className="font-display font-bold text-lg mb-2" style={{ color: "var(--color-foreground)" }}>
          {isAr ? "تم إرسال طلبك بنجاح!" : "Request sent successfully!"}
        </h3>
        <p className="text-sm mb-6" style={{ color: "var(--color-foreground-muted)" }}>
          {isAr
            ? "فريقنا سيتواصل معك في أقرب وقت"
            : "Our team will reach out as soon as possible"}
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-sm font-semibold transition-colors hover:opacity-80"
          style={{ color: "var(--color-accent)" }}
        >
          {isAr ? "إرسال طلب آخر" : "Send another request"}
        </button>
      </motion.div>
    )
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      onSubmit={handleSubmit}
      className="rounded-2xl p-6 lg:p-8"
      style={{
        background: "var(--surface-faint)",
        border: "1px solid var(--border-card)",
        boxShadow: "var(--shadow-panel)",
      }}
      noValidate
    >
      <h3
        className="font-display font-bold text-lg mb-1"
        style={{ color: "var(--color-foreground)" }}
      >
        {isAr ? "اطلب عرض سعر" : "Request a Quote"}
      </h3>
      <p className="text-xs mb-6" style={{ color: "var(--color-foreground-muted)" }}>
        {isAr
          ? `املأ النموذج وسنرسل لك عرضاً مخصصاً لـ ${serviceName}`
          : `Fill out the form and we'll send you a custom quote for ${serviceName}`}
      </p>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-subtle)" }}>
            <User size={12} />
            {isAr ? "الاسم" : "Name"}
            <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--surface-subtle)",
              border: errors.name ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-input)",
              color: "var(--color-foreground)",
            }}
            placeholder={isAr ? "اسمك الكامل" : "Your full name"}
          />
          <AnimatePresence>
            {errors.name && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs mt-1"
                style={{ color: "#EF4444" }}
              >
                {errors.name}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-subtle)" }}>
            <Mail size={12} />
            {isAr ? "البريد الإلكتروني" : "Email"}
            <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--surface-subtle)",
              border: errors.email ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-input)",
              color: "var(--color-foreground)",
            }}
            placeholder={isAr ? "example@email.com" : "you@company.com"}
          />
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs mt-1"
                style={{ color: "#EF4444" }}
              >
                {errors.email}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-subtle)" }}>
            <Phone size={12} />
            {isAr ? "رقم الهاتف" : "Phone"}
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border-input)",
              color: "var(--color-foreground)",
            }}
            placeholder={isAr ? "+20 1XX XXX XXXX" : "+1 (555) 000-0000"}
          />
        </div>

        {/* Budget */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-subtle)" }}>
            <Wallet size={12} />
            {isAr ? "الميزانية (اختياري)" : "Budget (Optional)"}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={form.budget}
                onChange={(e) => updateField("budget", e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "var(--surface-subtle)",
                  border: errors.budget ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-input)",
                  color: "var(--color-foreground)",
                }}
                placeholder={isAr ? "50000" : "50000"}
              />
            </div>
            <select
              value={form.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer shrink-0"
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-input)",
                color: "var(--color-foreground)",
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          <AnimatePresence>
            {errors.budget && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs mt-1"
                style={{ color: "#EF4444" }}
              >
                {errors.budget}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Message */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-subtle)" }}>
            <MessageSquare size={12} />
            {isAr ? "تفاصيل إضافية" : "Additional Details"}
          </label>
          <textarea
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
            style={{
              background: "var(--surface-subtle)",
              border: "1px solid var(--border-input)",
              color: "var(--color-foreground)",
            }}
            placeholder={isAr
              ? "صف مشروعك أو متطلباتك الخاصة..."
              : "Describe your project or specific requirements..."}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 btn-hero-primary disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {isAr ? "جاري الإرسال..." : "Sending..."}
            </>
          ) : (
            <>
              <Send size={16} />
              {isAr ? "إرسال الطلب" : "Send Request"}
            </>
          )}
        </button>

        {status === "error" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-center"
            style={{ color: "#EF4444" }}
          >
            {isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Please try again."}
          </motion.p>
        )}
      </div>
    </motion.form>
  )
}
