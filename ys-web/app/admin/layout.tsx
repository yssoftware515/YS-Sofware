import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import AdminShell from './admin-shell'

// The admin panel is a private, authenticated area. Emit an explicit
// noindex so /admin and every route under it is never picked up by
// search engines, even if a page forgets its own metadata.
export const metadata: Metadata = {
  title: 'Admin Panel | YS Systems & Software',
  robots: {
    index: false,
    follow: false,
  },
}

// The admin panel's language is a user preference kept in a cookie
// (ys_admin_locale), not in the URL — /admin has no locale segment.
//
// It has to be read HERE, on the server: reading document.cookie in the
// client component would give the browser one answer ('ar') and the server
// another ('en'), and React would then reject the server HTML on hydration
// (error #418 — "server rendered text didn't match the client"). Resolving
// it once here means both sides render the same language.
async function resolveAdminLocale(): Promise<'en' | 'ar'> {
  const value = (await cookies()).get('ys_admin_locale')?.value

  return value === 'ar' ? 'ar' : 'en'
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = await resolveAdminLocale()

  return <AdminShell locale={locale}>{children}</AdminShell>
}
