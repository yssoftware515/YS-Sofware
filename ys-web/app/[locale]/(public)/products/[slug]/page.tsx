import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api/client'
import { sanitizeHtml } from '@/lib/utils/sanitizeHtml'
import { buildMetadata, safeJsonLd } from '@/lib/seo'
import { StatusBadge } from '@/components/ui/Badge'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { getProductDashboardFallback } from '@/lib/utils/productAssets'
import type { ProductDetail } from '@/types'

const content = {
  en: {
    back: '← Back to Products', version: 'Current Version',
    latest_release: 'Latest Release', overview: 'Overview',
    get_started: 'Get Started', view_docs: 'View Documentation',
    launch: 'Launch Product', support: 'Get Support',
    value_prop: 'Why it stands out', target_audience: 'Who it is for',
    features: 'Key Features', pricing: 'Pricing',
    media: 'Gallery', price_coming_soon: 'Coming soon',
    custom_quote: 'Custom pricing', products_crumb: 'Products',
  },
  ar: {
    back: '→ العودة للمنتجات', version: 'الإصدار الحالي',
    latest_release: 'آخر إصدار', overview: 'نظرة عامة',
    get_started: 'ابدأ الآن', view_docs: 'عرض التوثيق',
    launch: 'افتح المنتج', support: 'احصل على الدعم',
    value_prop: 'لماذا هو مميز', target_audience: 'لمن صُمم',
    features: 'الميزات الأساسية', pricing: 'التسعير',
    media: 'الوسائط', price_coming_soon: 'قريباً', products_crumb: 'المنتجات',
  },
}

function offerText(plan: ProductDetail['pricing_plans'][number], locale: string) {
  if (plan.pricing_type === 'custom_quote') {
    return locale === 'ar' ? 'عرض سعر مخصص' : 'Custom quote'
  }
  if (plan.pricing_type === 'free') {
    return locale === 'ar' ? 'مجاناً' : 'Free'
  }
  if (plan.price) {
    const cycle = plan.billing_cycle ? ` / ${plan.billing_cycle.replace('_', ' ')}` : ''
    return `${plan.price} ${plan.currency ?? ''}${cycle}`.trim()
  }
  return locale === 'ar' ? 'التسعير قيد الإعداد' : 'Pricing coming soon'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  try {
    const product = await api.product(slug, locale)
    return buildMetadata({
      locale,
      path: `/products/${slug}`,
      title: product.seo?.title ?? product.name,
      description: product.seo?.description ?? product.short_desc,
      image: product.cover_image?.url,
    })
  } catch {
    return buildMetadata({
      locale,
      path: `/products/${slug}`,
      title: 'Product',
      description: 'YS Systems & Software product.',
      noIndex: true, // unresolvable product — don't index a broken page
    })
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = content[locale as keyof typeof content] ?? content.en

  let product: ProductDetail
  try {
    product = await api.product(slug, locale)
  } catch {
    notFound()
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    description: product.short_desc,
    applicationCategory: 'BusinessApplication',
    ...(product.current_version ? { softwareVersion: product.current_version } : {}),
    ...(product.cover_image ? { image: product.cover_image.url } : {}),
    offers: {
      '@type': 'Offer',
      availability: product.status === 'active' || product.status === 'beta'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/PreOrder',
    },
    publisher: {
      '@type': 'Organization',
      name: 'YS Systems & Software',
    },
  }

  // Destination URLs come from admin-validated values; render the
  // available CTAs only — never fabricate links for missing ones.
  const gallery = product.media.filter(m => m.url)

  // CMS-uploaded cover wins; a real in-product screenshot dropped in
  // public/branding/products/<slug>/<slug>-dashboard.webp is the fallback
  // (not the marketing "cover" — that's for the listing page). If neither
  // exists, the icon/initials placeholder below still applies.
  const heroImageUrl = product.cover_image?.url ?? getProductDashboardFallback(product.slug)

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background)' }}>
      {/* Structured data for rich search results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section style={{ paddingTop: '7rem', paddingBottom: '5rem', borderBottom: '1px solid var(--color-border)' }}>
        <div className="container-site">
          <Breadcrumb
            locale={locale}
            items={[
              { label: t.products_crumb, href: `/${locale}/products` },
              { label: product.name },
            ]}
          />
          <Link href={`/${locale}/products`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-foreground-muted)', textDecoration: 'none', marginBottom: '2rem', marginTop: '1rem' }}>
            {t.back}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {product.logo_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.logo_image.url} alt={product.logo_image.alt ?? product.name} width={40} height={40} style={{ borderRadius: 10, objectFit: 'contain' }} />
                )}
                <StatusBadge status={product.status} />
                {product.current_version && (
                  <span style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--color-foreground-muted)', padding: '0.25rem 0.75rem', backgroundColor: 'var(--color-background-subtle)', borderRadius: 6 }}>
                    v{product.current_version}
                  </span>
                )}
              </div>

              <h1 className="font-display font-semibold tracking-tight text-fluid-2xl" style={{ color: 'var(--color-foreground)' }}>
                {product.name}
              </h1>

              <p className="text-fluid-base" style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.7 }}>
                {product.short_desc}
              </p>

              {/* CTA row — destination URLs only when actually configured */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {product.product_url ? (
                  <a href={product.product_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1.5rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                    backgroundColor: 'var(--color-accent)', color: '#fff', textDecoration: 'none',
                  }}>
                    {t.launch} →
                  </a>
                ) : (
                  <Link href={`/${locale}/contact`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1.5rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                    backgroundColor: 'var(--color-accent)', color: '#fff', textDecoration: 'none',
                  }}>
                    {t.get_started}
                  </Link>
                )}
                {product.documentation_url && (
                  <a href={product.documentation_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1.5rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                    border: '1px solid var(--color-border)', color: 'var(--color-foreground)',
                    backgroundColor: 'var(--color-background-subtle)', textDecoration: 'none',
                  }}>
                    {t.view_docs}
                  </a>
                )}
                {product.support_url && (
                  <a href={product.support_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1.5rem', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
                    border: '1px solid var(--color-border)', color: 'var(--color-foreground)',
                    backgroundColor: 'var(--color-background-subtle)', textDecoration: 'none',
                  }}>
                    {t.support}
                  </a>
                )}
              </div>
            </div>

            {/* Cover Image */}
            <div style={{ position: 'relative', height: '20rem', borderRadius: '1.5rem', overflow: 'hidden', backgroundColor: 'var(--color-background-subtle)' }}>
              {heroImageUrl ? (
                <Image src={heroImageUrl} alt={product.cover_image?.alt ?? product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 96, height: 96, borderRadius: 24, backgroundColor: 'var(--color-accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="font-display font-bold" style={{ fontSize: '2.5rem', color: 'var(--color-accent)' }}>
                      {product.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Value proposition band */}
      {product.value_proposition && (
        <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--color-border)' }}>
          <div className="container-site">
            <div style={{ padding: '2rem', borderRadius: '1rem', backgroundColor: 'var(--color-accent-subtle)' }}>
              <h2 className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                {locale === 'ar' ? 'لماذا يبرز هذا المنتج' : 'Why it stands out'}
              </h2>
              <p className="text-fluid-base" style={{ color: 'var(--color-foreground)', lineHeight: 1.7 }}>
                {product.value_proposition}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Overview */}
      {product.long_desc && (
        <section className="section-sm">
          <div className="container-site">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <h2 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '1.5rem' }}>
                  {t.overview}
                </h2>
                <div style={{ color: 'var(--color-foreground-muted)', lineHeight: 1.8, fontSize: '1rem' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.long_desc) }} />
              </div>

              {/* Sidebar */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {product.latest_release && (
                  <div style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                      {t.latest_release}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-foreground)' }}>
                        v{product.latest_release.version}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
                      {product.latest_release.release_date}
                    </p>
                    {product.latest_release.notes && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.75rem', lineHeight: 1.6 }}>
                        {product.latest_release.notes}
                      </p>
                    )}
                  </div>
                )}

                {product.target_audience && (
                  <div style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                      {t.target_audience}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', lineHeight: 1.7 }}>
                      {product.target_audience}
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {product.features.length > 0 && (
        <section className="section-sm" style={{ backgroundColor: 'var(--color-background-subtle)' }}>
          <div className="container-site">
            <h2 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '1.5rem' }}>
              {locale === 'ar' ? 'المميزات الأساسية' : 'Key Features'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {product.features.map((feature, i) => (
                <div key={i} style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                  <h3 className="font-display font-semibold" style={{ fontSize: '1rem', color: 'var(--color-foreground)', marginBottom: '0.5rem' }}>
                    {feature.title}
                  </h3>
                  {feature.description && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', lineHeight: 1.7 }}>
                      {feature.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      {product.pricing_plans.length > 0 && (
        <section className="section-sm">
          <div className="container-site">
            <h2 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '1.5rem' }}>
              {t.pricing}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {product.pricing_plans.map((plan, i) => (
                <div key={i} style={{
                  padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)',
                  backgroundColor: plan.is_featured ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                  position: 'relative',
                }}>
                  {plan.is_featured && (
                    <span style={{ position: 'absolute', top: '-0.625rem', right: '1rem', fontSize: '0.6875rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: 999, backgroundColor: 'var(--color-accent)', color: '#fff' }}>
                      {locale === 'ar' ? 'مميز' : 'Featured'}
                    </span>
                  )}
                  <h3 className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)', marginBottom: '0.5rem' }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-foreground)', fontFamily: 'monospace' }}>
                    {offerText(plan, locale)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="section-sm" style={{ backgroundColor: 'var(--color-background-subtle)' }}>
          <div className="container-site">
            <h2 className="font-display font-semibold text-fluid-xl" style={{ color: 'var(--color-foreground)', marginBottom: '1.5rem' }}>
              {t.media}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.map((item, i) => (
                <div key={i} style={{ position: 'relative', height: '14rem', borderRadius: '1rem', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
                  <Image src={item.url!} alt={item.alt ?? product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}