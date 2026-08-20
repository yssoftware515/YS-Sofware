'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/components/admin/PermissionGate'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'

interface AdminUser {
  id: string; name: string; email: string; is_active: boolean
  last_login_at: string | null
  role: { id: string; name: string; slug: string } | null
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), searchInput ? 300 : 0)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: users = [], isLoading, isError, error } = useAdminList<AdminUser>('/admin/users', search ? { search } : undefined)
  const deleteUser = useAdminDelete('/admin/users')

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return
    deleteUser.mutate(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Users</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>Manage admin accounts and roles</p>
        </div>
        <Link href="/admin/users/new">
          <Button variant="primary" size="sm"><Plus size={16} /> Add User</Button>
        </Link>
      </div>

      <div style={{ position: 'relative', maxWidth: '24rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-muted)' }} />
        <input
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load users.'}
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No users found. <Link href="/admin/users/new" style={{ color: 'var(--color-accent)' }}>Create one →</Link>
                </td></tr>
              ) : users.map((user) => {
                const isSelf       = user.id === currentUser?.id
                const isSuperAdmin = user.role?.slug === 'super_admin'

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--color-foreground)' }}>{user.name}</span>
                        {isSelf && (
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: 9999, backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>You</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)' }}>{user.email}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {isSuperAdmin && <ShieldCheck size={14} style={{ color: '#8B5CF6' }} />}
                        <span style={{ color: isSuperAdmin ? '#8B5CF6' : 'var(--color-foreground-muted)', fontWeight: isSuperAdmin ? 600 : 400 }}>
                          {user.role?.name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: user.is_active ? '#10B981' : 'var(--color-error)' }}>
                        {user.is_active ? '🟢 Active' : '🔴 Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link href={`/admin/users/${user.id}`} style={{ padding: '0.375rem', borderRadius: 6, color: 'var(--color-foreground-muted)', display: 'flex' }} title="Edit">
                          <Pencil size={15} />
                        </Link>
                        {!isSelf && !isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(user.id, user.name)}
                            disabled={deleteUser.isPending && deleteUser.variables === user.id}
                            style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)' }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
