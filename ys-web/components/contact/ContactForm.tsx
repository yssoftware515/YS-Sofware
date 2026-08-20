"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, CheckCircle2, Loader2, User, Mail, Phone, MessageSquare, Wallet, Building2, ChevronDown, X } from "lucide-react"
import { CURRENCIES, type CurrencyCode, budgetToRange } from "@/lib/utils/services-utils"
import { api } from "@/lib/api/client"

interface ContactFormProps {
  locale: string
  serviceSlug?: string
  serviceName?: string
}

type FormStatus = "idle" | "submitting" | "success" | "error"

export function ContactForm({ locale, serviceSlug, serviceName }: ContactFormProps) {
  const isAr = locale === "ar"
  const [status, setStatus] = useState<FormStatus>("idle")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: serviceName ? `Inquiry about ${serviceName}` : "",
    message: "",
    budget: "",
    currency: "USD" as CurrencyCode,
    contactPreference: "email" as "email" | "whatsapp",
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
    if (!form.subject.trim()) nextErrors.subject = isAr ? "الموضوع مطلوب" : "Subject is required"
    if (!form.message.trim()) nextErrors.message = isAr ? "الرسالة مطلوبة" : "Message is required"
    else if (form.message.trim().length < 20) {
      nextErrors.message = isAr ? "الرسالة يجب ألا تقل عن 20 حرفاً" : "Message must be at least 20 characters"
    }
    if (form.budget && isNaN(parseFloat(form.budget))) {
      nextErrors.budget = isAr ? "مبلغ غير صالح" : "Invalid amount"
    }
    if (form.contactPreference === "whatsapp" && !form.phone.trim()) {
      nextErrors.phone = isAr ? "رقم الهاتف مطلوب للتواصل عبر واتساب" : "Phone is required for WhatsApp contact"
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [form, isAr])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStatus("submitting")
    try {
      // The public contact endpoint accepts budget_range (bucketed), not a
      // raw number. Keep the free-text UX and map it: the exact amount +
      // currency and the originating service slug ride inside `details`
      // so admins still see the precise figures.
      const budgetNum = form.budget ? parseFloat(form.budget) : null
      const details = [
        budgetNum !== null ? `budget: ${form.budget} ${form.currency}` : null,
        serviceSlug ? `service: ${serviceSlug}` : null,
      ].filter((d): d is string => Boolean(d))

      await api.contact({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        company_name: form.company || undefined,
        contact_preference: form.contactPreference,
        subject: form.subject,
        message: form.message,
        budget_range: budgetNum !== null ? budgetToRange(budgetNum, form.currency) : undefined,
        details: details.length > 0 ? details : undefined,
      }, locale)

      setStatus("success")
      setForm({
        name: "", email: "", phone: "", company: "", subject: "",
        message: "", budget: "", currency: "USD", contactPreference: "email",
      })
    } catch {
      setStatus("error")
    }
  }, [form, serviceSlug, validate, locale])

  const selectedCurrency = CURRENCIES.find((c) => c.code === form.currency) || CURRENCIES[0]

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-8 lg:p-10 text-center h-full flex flex-col items-center justify-center"
        style={{
          background: "rgba(16,185,129,0.05)",
          border: "1px solid rgba(16,185,129,0.15)",
        }}
      >
        <CheckCircle2 size={56} className="mb-5" style={{ color: "#10B981" }} />
        <h3 className="font-display font-bold text-xl mb-3" style={{ color: "var(--color-foreground)" }}>
          {isAr ? "تم إرسال رسالتك بنجاح!" : "Message sent successfully!"}
        </h3>
        <p className="text-sm mb-6 max-w-sm" style={{ color: "var(--color-foreground-muted)" }}>
          {isAr
            ? "شكراً لتواصلك معنا. فريقنا سيراجع رسالتك ويتواصل معك في أقرب وقت ممكن."
            : "Thank you for reaching out. Our team will review your message and get back to you as soon as possible."}
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-sm font-semibold transition-colors hover:opacity-80"
          style={{ color: "var(--color-accent)" }}
        >
          {isAr ? "إرسال رسالة جديدة" : "Send another message"}
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
      className="rounded-2xl p-6 lg:p-8 h-full"
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
        {isAr ? "أرسل لنا رسالة" : "Send us a message"}
      </h3>
      <p className="text-xs mb-6" style={{ color: "var(--color-foreground-muted)" }}>
        {isAr
          ? "املأ النموذج وهنرد عليك في أقرب وقت ممكن"
          : "Fill out the form and we'll get back to you as soon as possible"}
      </p>

      <div className="space-y-4">
        {/* Name + Email row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs mt-1" style={{ color: "#EF4444" }}>
                  {errors.name}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

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
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs mt-1" style={{ color: "#EF4444" }}>
                  {errors.email}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Phone + Company row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                border: errors.phone ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-input)",
                color: "var(--color-foreground)",
              }}
              placeholder={isAr ? "+20 1XX XXX XXXX" : "+1 (555) 000-0000"}
            />
            <AnimatePresence>
              {errors.phone && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs mt-1" style={{ color: "#EF4444" }}>
                  {errors.phone}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-subtle)" }}>
              <Building2 size={12} />
              {isAr ? "الشركة" : "Company"}
            </label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => updateField("company", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--border-input)",
                color: "var(--color-foreground)",
              }}
              placeholder={isAr ? "اسم الشركة (اختياري)" : "Company name (optional)"}
            />
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-subtle)" }}>
            <MessageSquare size={12} />
            {isAr ? "الموضوع" : "Subject"}
            <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
background: "var(--surface-subtle)",
                border: errors.subject ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-input)",
              color: "var(--color-foreground)",
            }}
            placeholder={isAr ? "موضوع رسالتك" : "What is this about?"}
          />
          <AnimatePresence>
            {errors.subject && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs mt-1" style={{ color: "#EF4444" }}>
                {errors.subject}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Message */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-subtle)" }}>
            <MessageSquare size={12} />
            {isAr ? "الرسالة" : "Message"}
            <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <textarea
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
            style={{
              background: "var(--surface-subtle)",
              border: errors.message ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-input)",
              color: "var(--color-foreground)",
            }}
            placeholder={isAr
              ? "صف مشروعك أو استفسارك بالتفصيل..."
              : "Describe your project or inquiry in detail..."}
          />
          <AnimatePresence>
            {errors.message && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs mt-1" style={{ color: "#EF4444" }}>
                {errors.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Budget - FREE TEXT (not select) + Currency */}
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
                placeholder={isAr ? "اكتب المبلغ اللي تناسبك" : "Enter your budget amount"}
              />
              <AnimatePresence>
                {form.budget && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => updateField("budget", "")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md"
                    style={{ color: "var(--color-foreground-muted)" }}
                    type="button"
                  >
                    <X size={12} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Currency dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm outline-none min-w-[90px] justify-between"
                style={{
                  background: "var(--surface-subtle)",
                  border: "1px solid var(--border-input)",
                  color: "var(--color-foreground)",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span>{selectedCurrency.symbol}</span>
                  <span className="text-xs">{selectedCurrency.code}</span>
                </span>
                <ChevronDown size={12} style={{ color: "var(--color-foreground-muted)" }} />
              </button>

              <AnimatePresence>
                {showCurrencyDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    className="absolute z-50 right-0 mt-2 w-40 rounded-xl overflow-hidden"
                    style={{
                      background: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border)",
                      boxShadow: "var(--shadow-dropdown)",
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          updateField("currency", c.code)
                          setShowCurrencyDropdown(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-[var(--surface-hover-soft)]"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        <span className="w-5 text-center">{c.symbol}</span>
                        <span>{isAr ? c.labelAr : c.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <AnimatePresence>
            {errors.budget && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-xs mt-1" style={{ color: "#EF4444" }}>
                {errors.budget}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Contact Preference */}
        <div>
          <label className="text-xs font-medium mb-2 block" style={{ color: "var(--color-foreground-subtle)" }}>
            {isAr ? "كيف تفضل أن نتواصل معك؟" : "How should we reach you?"}
          </label>
          <div className="flex gap-2">
            {[
              { value: "email" as const, label: isAr ? "البريد الإلكتروني" : "Email", labelAr: "البريد الإلكتروني" },
              { value: "whatsapp" as const, label: "WhatsApp", labelAr: "واتساب" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("contactPreference", opt.value)}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: form.contactPreference === opt.value ? "var(--chip-blue-bg)" : "var(--surface-subtle)",
                  border: form.contactPreference === opt.value ? "1px solid var(--chip-blue-border)" : "1px solid var(--border-input)",
                  color: form.contactPreference === opt.value ? "var(--color-accent)" : "var(--color-foreground-muted)",
                }}
              >
                {isAr ? opt.labelAr : opt.label}
              </button>
            ))}
          </div>
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
              {isAr ? "إرسال الرسالة" : "Send Message"}
            </>
          )}
        </button>

        {status === "error" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-center" style={{ color: "#EF4444" }}>
            {isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Please try again."}
          </motion.p>
        )}
      </div>
    </motion.form>
  )
}
