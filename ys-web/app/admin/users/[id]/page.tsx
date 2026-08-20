'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { UserForm, type UserFormData } from '@/components/admin/UserForm'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function EditUserPage() {
  const params = useParams()
  const id     = params.id as string

  const [data, setData]                       = useState<Partial<UserFormData> | null>(null)
  const [initialProductIds, setInitialProductIds] = useState<string[]>([])
  const [isSelf, setIsSelf]                   = useState(false)
  const [isSuperAdmin, setIsSuperAdmin]       = useState(false)
  const [currentIsSuperAdmin, setCurrentIsSuperAdmin] = useState(false)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState(false)

  useEffect(() => {

    Promise.all([
      fetch(`${API}/admin/users/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } }).then(r => r.json()),
      fetch(`${API}/auth/me`,           { credentials: 'include', headers: { Accept: 'application/json' } }).then(r => r.json()),
    ]).then(([userBody, meBody]) => {
      if (!userBody.success || !meBody.success) { setError(true); return }

      const targetUser = userBody.data
      const me         = meBody.data

      setData({
        name: targetUser.name,
        email: targetUser.email,
        role_id: targetUser.role?.id ?? '',
        is_active: targetUser.is_active,
      })
      setInitialProductIds(targetUser.product_ids ?? [])
      setIsSelf(targetUser.id === me.id)
      // Checks the actual '*' permission, not the role's slug/name — a
      // super-admin role isn't guaranteed to literally be named
      // "super_admin"; what makes it super-admin is holding '*'.
      setIsSuperAdmin(targetUser.role?.permissions?.includes('*') ?? false)
      setCurrentIsSuperAdmin(me.role?.permissions?.includes('*') ?? false)
    }).catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
  if (error || !data) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>Failed to load user.</div>

  return (
    <UserForm
      userId={id}
      initialData={data}
      initialProductIds={initialProductIds}
      isSelf={isSelf}
      isSuperAdmin={isSuperAdmin}
      currentUserIsSuperAdmin={currentIsSuperAdmin}
    />
  )
}
