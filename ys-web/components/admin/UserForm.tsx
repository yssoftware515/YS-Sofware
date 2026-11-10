'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Checkbox, FormSection } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'

import { API_BASE as API } from '@/lib/api/config'
import { ensureXsrfToken, readXsrfToken } from '@/lib/csrf'

export interface UserFormData {
  name: string
  email: string
  password: string
  password_confirmation: string
  role_id: string
  is_active: boolean
}

const emptyForm: UserFormData = {
  name: '', email: '', password: '', password_confirmation: '', role_id: '', is_active: true,
}

interface UserFormProps {
  userId?: string
  initialData?: Partial<UserFormData>
  isSelf?: boolean       // editing your own account — role/status locked
  isSuperAdmin?: boolean // target user is super_admin — locked unless current user is too
  currentUserIsSuperAdmin?: boolean
}

export function UserForm({
  userId, initialData, isSelf, isSuperAdmin, currentUserIsSuperAdmin,
}: UserFormProps) {
  const router = useRouter()
  const { show } = useToast()
  const isEdit = Boolean(userId)

  const [form, setForm]     = useState<UserFormData>({ ...emptyForm, ...initialData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [roles, setRoles]   = useState<{ id: string; name: string; slug: string; description: string | null; permissions: string[] }[]>([])

  const locked = isSelf || (isSuperAdmin && !currentUserIsSuperAdmin)

  useEffect(() => {
    fetch(`${API}/admin/roles`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(body => { if (body.success) setRoles(body.data) })
      .catch(() => {})
  }, [])

  const update = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!isEdit) {
      if (!form.name.trim())  newErrors.name = 'Name is required.'
      if (!form.email.trim()) newErrors.email = 'Email is required.'
      if (!form.role_id)      newErrors.role_id = 'Role is required.'
      if (!form.password || form.password.length < 12) newErrors.password = 'Password must be at least 12 characters.'
      if (form.password !== form.password_confirmation) newErrors.password_confirmation = 'Passwords do not match.'
    } else {
      if (form.name !== undefined && !form.name.trim())  newErrors.name = 'Name cannot be empty.'
      if (form.email !== undefined && !form.email.trim()) newErrors.email = 'Email cannot be empty.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { show('error', 'Please fix the errors before submitting.'); return }

    setSaving(true)
    const url    = isEdit ? `${API}/admin/users/${userId}` : `${API}/admin/users`
    const method = isEdit ? 'PUT' : 'POST'

    // Edit mode: never send role_id/is_active if editing self (server also
    // enforces this — client mirrors it so the UI doesn't imply a change
    // that will be silently dropped).
    const payload: Record<string, unknown> = isEdit
      ? {
          name: form.name,
          email: form.email,
          ...(isSelf ? {} : { role_id: form.role_id, is_active: form.is_active }),
        }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          password_confirmation: form.password_confirmation,
          role_id: form.role_id,
        }

    try {
      await ensureXsrfToken(API)
      const xsrf = readXsrfToken()
      const res  = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}) },
        body: JSON.stringify(payload),
      })
      const body = await res.json()

      if (!res.ok || !body.success) {
        if (body.errors) {
          const fieldErrors: Record<string, string> = {}
          Object.entries(body.errors).forEach(([key, msgs]) => { fieldErrors[key] = (msgs as string[])[0] })
          setErrors(fieldErrors)
        }
        show('error', body.message ?? 'Failed to save user.')
        return
      }

      show('success', isEdit ? 'User updated successfully.' : 'User created successfully.')
      router.push('/admin/users')
    } catch {
      show('error', 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link href="/admin/users" style={{ display: 'flex', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-foreground-muted)' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>
              {isEdit ? 'Edit User' : 'New User'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)' }}>
              {isEdit ? 'Update account details' : 'Create a new admin account'}
            </p>
          </div>
        </div>
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          <Save size={15} /> {isEdit ? 'Save Changes' : 'Create User'}
        </Button>
      </div>

      {locked && (
        <div style={{ padding: '0.875rem 1.125rem', borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--color-warning)', fontSize: '0.8125rem', marginBottom: '1.5rem', maxWidth: '42rem' }}>
          {isSelf
            ? '⚠ You are editing your own account — role and active status cannot be changed here.'
            : '⚠ This is a super admin account — only another super admin can modify its role or status.'}
        </div>
      )}

      <div style={{ maxWidth: '32rem' }}>
        <FormSection title="Account Details">
          <Field label="Full Name" required error={errors.name}>
            <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Yahya Hassan" error={!!errors.name} />
          </Field>

          <Field label="Email Address" required error={errors.email}>
            <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="admin@ys-systems.com" error={!!errors.email} />
          </Field>

          <Field label="Role" required error={errors.role_id} hint={locked ? 'Locked for this account' : undefined}>
            <Select value={form.role_id} onChange={e => update('role_id', e.target.value)} disabled={locked} error={!!errors.role_id}>
              <option value="">— Select Role —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>

          {isEdit && (
            <Checkbox
              label="Account active (can sign in)"
              checked={form.is_active}
              onChange={e => update('is_active', e.target.checked)}
              disabled={locked}
            />
          )}
        </FormSection>

        {!isEdit && (
          <FormSection title="Password" description="Minimum 12 characters">
            <Field label="Password" required error={errors.password}>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="••••••••••••"
                  error={!!errors.password}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} aria-label={showPwd ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-foreground-muted)', padding: '0.5rem', minWidth: 44, minHeight: 44 }}>
                  {showPwd ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </Field>

            <Field label="Confirm Password" required error={errors.password_confirmation}>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={form.password_confirmation}
                onChange={e => update('password_confirmation', e.target.value)}
                placeholder="••••••••••••"
                error={!!errors.password_confirmation}
              />
            </Field>
          </FormSection>
        )}
      </div>
    </form>
  )
}
