'use client'

import Image from 'next/image'
import { AnimatedBox } from './AnimatedBox'
import { cn } from '@/lib/utils/cn'

interface AboutHeroProps {
  locale: string
  eyebrow: string
  headlineLine1: string
  headlineLine2: string
  headlineHighlight: string
  subline: string
  imageAlt: string
}

/**
 * AboutHero — full-bleed background hero, same technique as the homepage's
 * HeroSection (desktop image + separate mobile image, text-legibility
 * scrim, ambient radial glow), with the accent swapped to violet to give
 * the About page its own identity without touching the homepage's blue.
 *
 * No CTA buttons / trust line here on purpose: the reference design this
 * page is built from doesn't have them in the hero, and the page already
 * has a dedicated CTA section further down — repeating it here duplicated
 * the "3 Products" line that's already the first Highlights card.
 *
 * The text block is pinned to the same side regardless of locale (dir="ltr"
 * on the wrapper, same trick HeroSection already uses) because the scrim
 * and the image's own lighting/composition are a fixed pairing — mirroring
 * only the text while the image stayed put left the Arabic headline sitting
 * on the bright, un-scrimmed half of the image. Text alignment and the
 * headline/subline's own dir still flip per locale so Arabic still reads
 * correctly within the pinned block.
 */
export function AboutHero({
  locale,
  eyebrow,
  headlineLine1,
  headlineLine2,
  headlineHighlight,
  subline,
  imageAlt,
}: AboutHeroProps) {
  const isAr = locale === 'ar'
  return (
    <section
      className="relative flex flex-col overflow-hidden min-h-[440px] lg:min-h-[480px]"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {/* ── Background Layers — mirrors HeroSection's technique exactly ── */}

      {/* Desktop full-bleed background */}
      <div className="hidden lg:block absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <Image
          src="/branding/about/about.webp"
          alt={imageAlt}
          fill
          className="object-cover"
          style={{ objectPosition: '68% 42%' }}
          sizes="100vw"
          priority
        />
      </div>

      {/* Desktop text legibility scrim — anchored start, illustration end */}
      <div
        className="hidden lg:block absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(1,5,15,0.92) 0%, rgba(1,5,15,0.72) 32%, rgba(1,5,15,0.3) 52%, transparent 68%)' }}
        aria-hidden="true"
      />

      {/* Mobile full-bleed background */}
      <div className="lg:hidden absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <Image
          src="/branding/about/mobile%20about.webp"
          alt=""
          fill
          className="object-cover"
          style={{ objectPosition: '50% 100%' }}
          sizes="100vw"
          priority
        />
      </div>
      <div
        className="lg:hidden absolute inset-0 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(1,5,15,0.95) 0%, rgba(1,5,15,0.55) 45%, rgba(1,5,15,0.55) 100%)' }}
        aria-hidden="true"
      />

      {/* Ambient violet glow — the about-page-only identity accent */}
      <div className="hidden lg:block absolute inset-0 z-[1] pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 55% 50% at 72% 45%, rgba(139,92,246,0.22) 0%, transparent 65%)' }} />
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div dir="ltr" className="container-site relative z-10 flex-1 flex items-center pt-36 pb-6 lg:pt-20 lg:pb-6">
        <div
          className={cn(
            'max-w-xl flex flex-col items-center text-center lg:items-start',
            isAr ? 'lg:text-right' : 'lg:text-left'
          )}
        >
          <AnimatedBox delay={0} duration={0.4}>
            <span
              className="glass-badge-violet inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: 'rgba(167, 139, 250, 0.95)' }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: '#8B5CF6' }} />
              {eyebrow}
            </span>
          </AnimatedBox>

          <div className="h-3.5" />

          <AnimatedBox delay={0.08} duration={0.5}>
            <h1
              dir={isAr ? 'rtl' : 'ltr'}
              className="font-display font-bold tracking-tight"
              style={{ fontSize: 'clamp(32px, 3.2vw, 48px)', lineHeight: 1.15, letterSpacing: '-0.02em', color: '#FFFFFF' }}
            >
              {headlineLine1}
              <br />
              {headlineLine2}{' '}
              <span className="text-gradient-violet-strong">{headlineHighlight}</span>
            </h1>
          </AnimatedBox>

          <div className="h-3.5" />

          <AnimatedBox delay={0.16} duration={0.5}>
            <p dir={isAr ? 'rtl' : 'ltr'} className="text-base" style={{ color: 'rgba(255,255,255,0.72)', maxWidth: 460, lineHeight: 1.7 }}>
              {subline}
            </p>
          </AnimatedBox>
        </div>
      </div>
    </section>
  )
}
