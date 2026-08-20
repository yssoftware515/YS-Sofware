'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface AuthUser {
  id: string
  name: string
  email: string
  role: {
    id: string
    name: string
    slug: string
    permissions: string[]
  }
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  hasPermission: (permission: string) => boolean
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  hasPermission: () => false,
  refresh: async () => {},
})

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      const body = await res.json()
      if (body.success && body.data) {
        setUser(body.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    fetch(`${API}/auth/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(res => res.json())
      .then(body => {
        if (!cancelled) setUser(body.success && body.data ? body.data : null)
      })
      .catch(() => { if (!cancelled) setUser(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    const perms = user.role.permissions
    return perms.includes('*') || perms.includes(permission)
  }

  return (
    <AuthContext.Provider value={{ user, loading, hasPermission, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

interface PermissionGateProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission, loading } = useAuth()

  if (loading) return null
  if (!hasPermission(permission)) return <>{fallback}</>
  return <>{children}</>
}
