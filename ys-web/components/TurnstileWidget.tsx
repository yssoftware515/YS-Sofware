'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      execute: (widgetId: string) => void
      getResponse: (widgetId: string) => string
      reset: (widgetId: string) => void
    }
  }
}

export type TurnstileHandle = {
  getToken: () => Promise<string>
  reset: () => void
}

const TurnstileWidget = forwardRef<TurnstileHandle>(function TurnstileWidget(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const tokenRef = useRef('')

  useImperativeHandle(ref, () => ({
    getToken: async () => {
      const w = window.turnstile
      if (!w || !widgetIdRef.current) return ''

      w.execute(widgetIdRef.current)

      // Invisible mode resolves asynchronously; poll getResponse until
      // a token appears (the widget's callback also mirrors it).
      const deadline = Date.now() + 10000
      while (Date.now() < deadline) {
        const token = w.getResponse(widgetIdRef.current)
        if (token) {
          tokenRef.current = token
          return token
        }
        await new Promise(r => setTimeout(r, 150))
      }

      return tokenRef.current
    },
    reset: () => {
      tokenRef.current = ''
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }))

  useEffect(() => {
    if (!SITE_KEY) return
    const container = containerRef.current
    if (!container) return

    const render = () => {
      const w = window.turnstile
      if (!w || !containerRef.current) return
      widgetIdRef.current = w.render(containerRef.current, {
        sitekey: SITE_KEY,
        size: 'invisible',
        callback: (token: string) => {
          tokenRef.current = token
        },
        'expired-callback': () => {
          tokenRef.current = ''
        },
      })
    }

    if (window.turnstile) {
      render()
    } else {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = render
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    }
  }, [])

  // No site key configured -> CAPTCHA disabled, render nothing.
  if (!SITE_KEY) return null

  return <div ref={containerRef} aria-hidden="true" />
})

export default TurnstileWidget