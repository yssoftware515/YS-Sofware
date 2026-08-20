"use client"

import Link from "next/link"
import Image from "next/image"
import {
  Github,
  Linkedin,
  Twitter,
  Globe,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react"
import type { PublicSettings, Menu, Product } from "@/types"
import { validateSocialUrl } from "@/lib/cms/validate"

interface FooterProps {
  locale: string
  settings?: PublicSettings
  menus?: Record<string, Menu>
  products?: Product[]
}

const content = {
  en: {
    products: "Products",
    company: "Company",
    resources: "Resources",
    legal: "Legal",
    newsletter_title: "Stay in the loop",
    newsletter_subtitle:
      "Get product updates, engineering insights, and company news — no spam.",
    newsletter_placeholder: "Enter your email",
    newsletter_button: "Subscribe",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    cookies: "Cookie Policy",
    copyright: "All rights reserved.",
    tagline: "Building the next generation of business software.",
    viewAllProducts: "View All Products",
    backToTop: "Back to top",
    systemStatus: "All Systems Operational",
  },
  ar: {
    products: "المنتجات",
    company: "الشركة",
    resources: "الموارد",
    legal: "قانوني",
    newsletter_title: "ابقَ على اطلاع",
    newsletter_subtitle:
      "احصل على تحديثات المنتجات، ورؤى هندسية، وأخبار الشركة — بدون رسائل مزعجة.",
    newsletter_placeholder: "أدخل بريدك الإلكتروني",
    newsletter_button: "اشترك",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
    cookies: "سياسة ملفات تعريف الارتباط",
    copyright: "جميع الحقوق محفوظة.",
    tagline: "نبني الجيل القادم من برمجيات الأعمال.",
    viewAllProducts: "عرض كل المنتجات",
    backToTop: "العودة للأعلى",
    systemStatus: "جميع الأنظمة تعمل",
  },
}

function menuLinks(
  menu: Menu | undefined,
  _locale: string,
  fallbackLinks: { href: string; label: string }[]
) {
  if (!menu?.items?.length) return fallbackLinks
  return menu.items.map((item) => ({
    href: item.url ?? "#",
    label: item.title,
  }))
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOTER — premium multi-tier design matching the platform's strength
// ═══════════════════════════════════════════════════════════════════════════════
export function Footer({ locale, settings, menus, products }: FooterProps) {
  const isAr = locale === "ar"
  const t = content[locale as keyof typeof content] ?? content.en
  const companyName =
    settings?.brand?.company_name ?? "YS Systems & Software"
  const tagline =
    locale === "ar"
      ? settings?.brand?.company_tagline_ar ?? t.tagline
      : settings?.brand?.company_tagline_en ?? t.tagline

  const Arrow = isAr ? ArrowLeft : ArrowRight

  // Product links from live data
  const productsLinks = (products ?? [])
    .filter((p) => p.status !== "archived")
    .map((p) => ({ href: `/products/${p.slug}`, label: p.name }))

  if (productsLinks.length === 0) {
    productsLinks.push({ href: "/products", label: t.viewAllProducts })
  }

  const companyLinks = menuLinks(menus?.footer_company, locale, [
    {
      href: "/about",
      label: locale === "ar" ? "عن الشركة" : "About",
    },
    {
      href: "/careers",
      label: locale === "ar" ? "الوظائف" : "Careers",
    },
    {
      href: "/contact",
      label: locale === "ar" ? "تواصل معنا" : "Contact",
    },
  ])

  const resourcesLinks = menuLinks(menus?.footer_resources, locale, [
    {
      href: "/docs",
      label: locale === "ar" ? "التوثيق" : "Docs",
    },
    {
      href: "/roadmap",
      label: locale === "ar" ? "خارطة الطريق" : "Roadmap",
    },
    {
      href: "/updates",
      label: locale === "ar" ? "المستجدات" : "Updates",
    },
    {
      href: "/status",
      label: locale === "ar" ? "حالة النظام" : "Status",
    },
    {
      href: "/faq",
      label: locale === "ar" ? "الأسئلة الشائعة" : "FAQ",
    },
  ])

  const legalLinks = [
    { href: "/privacy", label: t.privacy },
    { href: "/terms", label: t.terms },
    { href: "/cookie-policy", label: t.cookies },
  ]

  const socials: Array<{
    key: string
    label: string
    url?: string
    icon: LucideIcon
  }> = [
    {
      key: "github",
      label: "GitHub",
      url: settings?.social?.github_url ?? undefined,
      icon: Github,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      url: settings?.social?.linkedin_url ?? undefined,
      icon: Linkedin,
    },
    {
      key: "x",
      label: "X (Twitter)",
      url: settings?.social?.x_url ?? undefined,
      icon: Twitter,
    },
    {
      key: "tiktok",
      label: "TikTok",
      url: settings?.social?.tiktok_url ?? undefined,
      icon: Globe,
    },
  ].filter((s) => validateSocialUrl(s.url))

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        borderTop: "1px solid var(--divider)",
        backgroundColor: "var(--color-background)",
      }}
    >
      {/* Top ambient glow — fades from page content into footer */}
      <div
        className="absolute top-0 inset-x-0 h-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(10,79,231,0.04) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
        aria-hidden="true"
      />

      <div className="container-site relative z-10">
        {/* ═══════════════════════════════════════════════════════════════
            TIER 1: Newsletter + Brand
        ═══════════════════════════════════════════════════════════════ */}
        <div
          className="py-14 lg:py-16"
          style={{ borderBottom: "1px solid var(--divider)" }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">
            {/* Brand */}
            <div className="max-w-md">
              <Link
                href={`/${locale}`}
                className="inline-flex items-center gap-2.5 shrink-0 mb-4"
              >
                <Image
                  src="/branding/logo/logo.svg"
                  alt={companyName}
                  width={32}
                  height={32}
                  className="shrink-0"
                />
                <span
                  className="font-display font-semibold text-base tracking-tight"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {companyName}
                </span>
              </Link>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--color-foreground-muted)",
                  maxWidth: 320,
                }}
              >
                {tagline}
              </p>
            </div>

            {/* Newsletter */}
            <div className="w-full max-w-md lg:max-w-sm">
              <h4
                className="font-display font-semibold text-sm mb-1.5"
                style={{ color: "var(--color-foreground)" }}
              >
                {t.newsletter_title}
              </h4>
              <p
                className="text-xs leading-relaxed mb-3.5"
                style={{ color: "var(--color-foreground-muted)" }}
              >
                {t.newsletter_subtitle}
              </p>
              <form
                className="flex gap-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="email"
                  placeholder={t.newsletter_placeholder}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2"
                  style={{
                    background: "var(--surface-subtle)",
                    border: "1px solid var(--border-input)",
                    color: "var(--color-foreground)",
                    caretColor: "var(--color-accent)",
                  }}
                  dir={isAr ? "rtl" : "ltr"}
                />
                <button
                  type="submit"
                  className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 btn-hero-primary"
                >
                  {t.newsletter_button}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TIER 2: Link Columns
        ═══════════════════════════════════════════════════════════════ */}
        <div
          className="py-12 lg:py-14"
          style={{ borderBottom: "1px solid var(--divider)" }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-10">
            {/* Products */}
            <FooterColumn title={t.products} locale={locale} links={productsLinks} />

            {/* Company */}
            <FooterColumn title={t.company} locale={locale} links={companyLinks} />

            {/* Resources */}
            <FooterColumn title={t.resources} locale={locale} links={resourcesLinks} />

            {/* Legal */}
            <FooterColumn title={t.legal} locale={locale} links={legalLinks} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TIER 3: Bottom Bar
        ═══════════════════════════════════════════════════════════════ */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Copyright + Status */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span style={{ color: "var(--color-foreground-muted)" }}>
              &copy; {new Date().getFullYear()} {companyName}. {t.copyright}
            </span>

            {/* System status indicator */}
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)",
                color: "#34D399",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t.systemStatus}
            </span>
          </div>

          {/* Right: Socials + Back to top */}
          <div className="flex items-center gap-3">
            {/* Social icons */}
            <div className="flex items-center gap-1">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200"
                  style={{
                    color: "var(--color-foreground-muted)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--color-foreground)"
                    e.currentTarget.style.background =
                      "var(--surface-hover)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color =
                      "var(--color-foreground-muted)"
                    e.currentTarget.style.background = "transparent"
                  }}
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>

            {/* Divider */}
            <span
              className="hidden sm:block w-px h-4"
              style={{ background: "var(--border-input)" }}
            />

            {/* Back to top */}
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-200"
              style={{ color: "var(--color-foreground-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-foreground)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color =
                  "var(--color-foreground-muted)"
              }}
            >
              {t.backToTop}
              <ArrowUp size={13} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOTER COLUMN — link group with hover effects
// ═══════════════════════════════════════════════════════════════════════════════
function FooterColumn({
  title,
  locale,
  links,
}: {
  title: string
  locale: string
  links: { href: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3
        className="text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-foreground)" }}
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {links.map(({ href, label }) => (
          <li key={href + label}>
            <Link
              href={`/${locale}${href}`}
              className="inline-block text-sm transition-all duration-200"
              style={{
                color: "var(--color-foreground-muted)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-foreground)"
                e.currentTarget.style.transform = "translateX(2px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color =
                  "var(--color-foreground-muted)"
                e.currentTarget.style.transform = "translateX(0)"
              }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
