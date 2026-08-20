import type { Metadata } from 'next'
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}