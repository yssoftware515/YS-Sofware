'use client'

import { useState } from 'react'
import { Save, Shield, Plus, Trash2, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/admin/PageHeader'
import { SectionCard } from '@/components/admin/SectionCard'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { useAuth } from '@/components/admin/PermissionGate'
import { usePlatform } from '@/lib/platform/PlatformProvider'
import { adminCreate, adminUpdate } from '@/lib/admin/api'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'
import type { PermissionGroup } from '@/lib/platform/registries/PermissionRegistry'

interface Role {
  id: string
  name: string
  slug: string
  description: string | null
  permissions: string[]
}

const RESOURCE = '/admin/roles'

export default function RolesPage() {
  const { show } = useToast()
  const queryClient = useQueryClient()
  const { kernel, loaded: platformLoaded } = usePlatform()
  const { hasPermission } = useAuth()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [edited, setEdited] = useState<Record<string, string[]>>({})
  const [showCreate, setShowCreate] = useState(false)

  // Reading roles requires manage_users (RoleController@index); mutating
  // them requires manage_admins. The page follows the backend boundary
  // exactly: readers see the read-only view, only manage_admins holders
  // get the mutation controls.
  const canManageAdmins = hasPermission('manage_admins')

  const permissionGroups: PermissionGroup[] = platformLoaded && kernel
    ? kernel.getRegistry('permissions').getGroups()
    : []

  const { data: roles = [], isLoading } = useAdminList<Role>(RESOURCE)
  const deleteRole = useAdminDelete(RESOURCE)

  const currentPerms = (role: Role) => edited[role.id] ?? role.permissions

  const togglePerm = (roleId: string, base: string[], perm: string) => {
    const perms = edited[roleId] ?? base
    setEdited(prev => ({
      ...prev,
      [roleId]: perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm],
    }))
  }

  const toggleGroup = (roleId: string, base: string[], groupPerms: string[]) => {
    const current = edited[roleId] ?? base
    const allSelected = groupPerms.every(p => current.includes(p))
    setEdited(prev => ({
      ...prev,
      [roleId]: allSelected ? current.filter(p => !groupPerms.includes(p)) : [...new Set([...current, ...groupPerms])],
    }))
  }

  const saveRole = async (roleId: string) => {
    const permissions = edited[roleId]
    try {
      await adminUpdate(`${RESOURCE}/${roleId}`, { permissions })
      queryClient.invalidateQueries({ queryKey: [RESOURCE] })
      setEdited(prev => { const next = { ...prev }; delete next[roleId]; return next })
      show('success', 'Role updated.')
    } catch (err) {
      show('error', err instanceof Error ? err.message : 'Failed to save.')
    }
  }

  const handleDelete = (roleId: string, name: string) => {
    if (!confirm(`Delete role "${name}"? Any user still assigned to it will block this — reassign them first.`)) return
    deleteRole.mutate(roleId)
  }

  if (isLoading) return (
    <>
      <PageHeader title="Roles & Permissions" subtitle="Manage access control roles" />
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
    </>
  )

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage access control roles"
        actions={canManageAdmins ? <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}><Plus size={15} /> New Role</Button> : undefined}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {roles.map(role => {
          const isOpen = expanded === role.id
          const perms = currentPerms(role)
          const hasChanges = JSON.stringify([...perms].sort()) !== JSON.stringify([...role.permissions].sort())
          const isSuperAdminRole = role.permissions.includes('*')
          return (
            <SectionCard
              key={role.id}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={16} />
                  <span>{role.name}</span>
                </div>
              }
              description={role.description ?? `${role.permissions.length} permission(s) · ${perms.length} selected`}
              actions={
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {canManageAdmins && hasChanges && <Button variant="primary" size="sm" onClick={() => saveRole(role.id)}><Save size={14} /> Save</Button>}
                  <button onClick={() => setExpanded(isOpen ? null : role.id)}
                    style={{ padding: '0.375rem 0.75rem', borderRadius: 6, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    {isOpen ? 'Collapse' : 'Edit'}
                  </button>
                  {/* The seeded super-admin role ('*') can't be deleted —
                      matches the backend's own guard (see RoleController). */}
                  {canManageAdmins && !isSuperAdminRole && (
                    <button onClick={() => handleDelete(role.id, role.name)} disabled={deleteRole.isPending && deleteRole.variables === role.id}
                      style={{ padding: '0.375rem', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-error)' }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              }
            >
              {isOpen && (
                isSuperAdminRole ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
                    This role grants unrestricted super-admin access and can&apos;t be edited here.
                  </p>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {permissionGroups.map(pg => {
                    const groupPerms = pg.permissions
                    const allSelected = groupPerms.every(p => perms.includes(p))
                    const someSelected = groupPerms.some(p => perms.includes(p))
                    return (
                      <div key={pg.group} style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                            onChange={() => toggleGroup(role.id, role.permissions, groupPerms)}
                            style={{ accentColor: 'var(--color-accent)' }} />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{pg.group}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', paddingLeft: '1.5rem' }}>
                          {groupPerms.map(perm => (
                            <label key={perm} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: 4, backgroundColor: perms.includes(perm) ? 'var(--color-accent-subtle)' : 'var(--color-background-subtle)' }}>
                              <input type="checkbox" checked={perms.includes(perm)} onChange={() => togglePerm(role.id, role.permissions, perm)}
                                style={{ accentColor: 'var(--color-accent)' }} />
                              {perm.replace(/_/g, ' ')}
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                )
              )}
            </SectionCard>
          )
        })}
      </div>

      {showCreate && (
        <CreateRoleModal
          permissionGroups={permissionGroups}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: [RESOURCE] }) }}
        />
      )}
    </>
  )
}

function CreateRoleModal({ permissionGroups, onClose, onCreated }: {
  permissionGroups: PermissionGroup[]
  onClose: () => void
  onCreated: () => void
}) {
  const { show } = useToast()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'))
  }

  const togglePerm = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || permissions.length === 0) {
      setErrors({
        ...(!name.trim() ? { name: 'Name is required.' } : {}),
        ...(permissions.length === 0 ? { permissions: 'Select at least one permission.' } : {}),
      })
      return
    }

    setSaving(true)
    try {
      await adminCreate('/admin/roles', { name, slug, description: description || null, permissions })
      show('success', 'Role created successfully.')
      onCreated()
    } catch (err) {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> }
      if (anyErr.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(anyErr.errors).forEach(([k, msgs]) => { fieldErrors[k] = msgs[0] })
        setErrors(fieldErrors)
      }
      show('error', anyErr.message ?? 'Failed to create role.')
    } finally {
      setSaving(false)
    }
  }

  // De-duplicated permission set — several groups (Releases/Products,
  // Timeline/Settings/Feature Flags) intentionally share one underlying
  // permission string, and a role's checkbox list should only offer each
  // real permission once.
  const uniquePerms = Array.from(new Set(permissionGroups.flatMap(pg => pg.permissions)))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '32rem', maxHeight: '85vh', overflowY: 'auto', backgroundColor: 'var(--color-surface)', borderRadius: '1rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, backgroundColor: 'var(--color-surface)' }}>
          <h2 className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)' }}>New Role</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-foreground-muted)' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Field label="Name" required error={errors.name}>
            <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Support Admin" error={!!errors.name} />
          </Field>
          <Field label="Slug" hint="Auto-generated, edit if needed">
            <Input value={slug} onChange={e => setSlug(e.target.value)} style={{ fontFamily: 'monospace' }} />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What this role is for" />
          </Field>
          <Field label="Permissions" required error={errors.permissions}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '14rem', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 8 }}>
              {uniquePerms.map(perm => (
                <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permissions.includes(perm)} onChange={() => togglePerm(perm)} style={{ accentColor: 'var(--color-accent)' }} />
                  {perm.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </Field>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <Button type="submit" variant="primary" size="sm" loading={saving} style={{ flex: 1 }}>Create Role</Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
