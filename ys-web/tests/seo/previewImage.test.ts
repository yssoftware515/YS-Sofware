import { describe, expect, it } from 'vitest'
import { buildMetadata, resolveAppUrl } from '@/lib/seo'

/**
 * The link-preview (Open Graph / Twitter card) image URL.
 *
 * NEXT_PUBLIC_APP_URL is a BUILD-time variable. A deployment that does not
 * set it used to emit the image URL against a hardcoded, unrelated domain
 * (or against localhost), so a shared link preview showed no image at all.
 * The base URL is now resolved per request, falling back to the host the
 * request arrived on.
 */
describe('resolveAppUrl', () => {
  it('uses NEXT_PUBLIC_APP_URL when it is configured', async () => {
    const original = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://ys-software.vercel.app'

    try {
      await expect(resolveAppUrl()).resolves.toBe('https://ys-software.vercel.app')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = original
    }
  })

  it('falls back to a sane origin instead of throwing when the env var is unset', async () => {
    const original = process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_APP_URL

    try {
      const url = await resolveAppUrl()
      expect(url).toMatch(/^https?:\/\//)
      expect(url).not.toContain('undefined')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = original
    }
  })
})

describe('buildMetadata (link preview image)', () => {
  it('emits an absolute Open Graph image URL on the configured domain', async () => {
    const original = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://ys-software.vercel.app'

    try {
      const metadata = await buildMetadata({
        locale: 'en',
        path: '/services',
        title: 'Our Services',
        description: 'End-to-end technology solutions',
      })

      const ogImages = metadata.openGraph?.images as Array<{ url: string; width?: number; height?: number }>

      expect(ogImages).toBeDefined()
      expect(ogImages[0].url).toBe(
        'https://ys-software.vercel.app/branding/social/og-image.jpg'
      )
      expect(ogImages[0].url.startsWith('http')).toBe(true)
      expect(ogImages[0].width).toBe(1200)
      expect(ogImages[0].height).toBe(800)

      const twitterImages = metadata.twitter?.images as string[]
      expect(twitterImages[0]).toBe(
        'https://ys-software.vercel.app/branding/social/twitter-card.jpg'
      )

      expect(metadata.openGraph?.url).toBe('https://ys-software.vercel.app/en/services')
      expect(metadata.alternates?.canonical).toBe('https://ys-software.vercel.app/en/services')
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = original
    }
  })

  it('never points the preview image at localhost', async () => {
    const original = process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_APP_URL

    try {
      const metadata = await buildMetadata({
        locale: 'ar',
        path: '/about',
        title: 'من نحن',
        description: 'عن الشركة',
      })

      const ogImages = metadata.openGraph?.images as Array<{ url: string }>
      expect(ogImages[0].url).not.toContain('localhost')
      expect(ogImages[0].url).toMatch(/^https?:\/\/[a-z0-9.-]+/)
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = original
    }
  })
})
