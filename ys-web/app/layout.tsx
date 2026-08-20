import type { Metadata } from 'next'
import { headers } from 'next/headers'
import '@/styles/globals.css'
import { getVerificationMetaTags } from '@/lib/search-verification'

export const metadata: Metadata = {
  title: {
    default:  'YS Systems & Software',
    template: '%s | YS Systems & Software',
  },
  description: 'Building modern, scalable, and secure software systems.',
  icons: {
    icon: '/branding/favicon/favicon-32x32.png',
  },
  manifest: '/branding/site.webmanifest',
  other: {
    'theme-color': '#0A4FE7',
    'color-scheme': 'light dark',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#0A4FE7',
}

const localeScript = `
(function(){
  try {
    var path = window.location.pathname;
    var locale = path.split('/')[1];
    if (locale === 'ar') {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  } catch(e) {}
})();
`

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const verificationTags = getVerificationMetaTags()
  // The inline script below is allowed by the nonce-based CSP emitted in
  // proxy.ts; without the nonce it would be blocked (script-src has no
  // 'unsafe-inline'). This makes every page dynamically rendered.
  const nonce = (await headers()).get('x-nonce')

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} nonce={nonce ?? undefined} />
        {verificationTags.map((tag) => (
          <meta key={tag.name} name={tag.name} content={tag.content} />
        ))}
      </head>
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  )
}
