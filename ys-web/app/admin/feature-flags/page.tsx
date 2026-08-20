'use client'

import { useState } from 'react'
import { Plus, Trash2, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { adminUpdate, adminCreate } from '@/lib/admin/api'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'
import { useQueryClient } from '@tanstack/react-query'

interface FeatureFlag {
  id: string
  key: string
  is_enabled: boolean
  description: string | null
  environment: 'all' | 'production' | 'staging' | 'local'
  product: { name_en: string } | null
}

const envColors: Record<string, { bg: string; color: string }> = {
  all:        { bg: 'var(--color-background-muted)', color: 'var(--color-foreground-muted)' },
  production: { bg: 'rgba(239,68,68,0.1)',  color: '#EF4444' },
  staging:    { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B' },
  local:      { bg: 'rgba(99,102,241,0.1)', color: 'var(--color-accent)' },
}

const RESOURCE = '/admin/feature-flags'

export default function FeatureFlagsPage() {
  const { show } = useToast()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [toggling, setToggling]     = useState<string | null>(null)

  const { data: flags = [], isLoading, isError, error } = useAdminList<FeatureFlag>(RESOURCE)
  const deleteFlag = useAdminDelete(RESOURCE)

  const handleToggle = async (flag: FeatureFlag) => {
    setToggling(flag.id)
    // Optimistic update against the query cache — same instant-feedback
    // behavior as before, now expressed through TanStack Query's cache
    // instead of local component state.
    queryClient.setQueryData<FeatureFlag[]>([RESOURCE, {}], prev =>
      prev?.map(f => f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f))

    try {
      await adminUpdate(`${RESOURCE}/${flag.id}`, { is_enabled: !flag.is_enabled })
    } catch (err) {
      queryClient.setQueryData<FeatureFlag[]>([RESOURCE, {}], prev =>
        prev?.map(f => f.id === flag.id ? { ...f, is_enabled: flag.is_enabled } : f))
      show('error', err instanceof Error ? err.message : 'Failed to toggle flag.')
    }
    setToggling(null)
  }

  const handleEnvironmentChange = async (flag: FeatureFlag, environment: FeatureFlag['environment']) => {
    try {
      await adminUpdate(`${RESOURCE}/${flag.id}`, { environment })
      queryClient.invalidateQueries({ queryKey: [RESOURCE] })
      show('success', 'Environment updated.')
    } catch (err) {
      show('error', err instanceof Error ? err.message : 'Update failed.')
    }
  }

  const handleDelete = (id: string, key: string) => {
    if (!confirm(`Delete flag "${key}"? This cannot be undone.`)) return
    deleteFlag.mutate(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Feature Flags</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
            Toggle features on/off without deploying. Changes take effect immediately (Redis-cached, ~0ms lookup).
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Flag
        </Button>
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Enabled', 'Key', 'Description', 'Product', 'Environment', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : isError ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-error)' }}>
                  {error instanceof Error ? error.message : 'Failed to load feature flags.'}
                </td></tr>
              ) : flags.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No feature flags yet. <button onClick={() => setShowCreate(true)} style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Create one →</button>
                </td></tr>
              ) : flags.map((flag) => {
                const env = envColors[flag.environment] ?? envColors.all
                return (
                  <tr key={flag.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <ToggleSwitch checked={flag.is_enabled} onChange={() => handleToggle(flag)} disabled={toggling === flag.id} />
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--color-foreground)', backgroundColor: 'var(--color-background-subtle)', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                        {flag.key}
                      </code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', maxWidth: '18rem' }}>
                      {flag.description ?? '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)' }}>
                      {flag.product?.name_en ?? '— Global —'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <select
                        value={flag.environment}
                        onChange={e => handleEnvironmentChange(flag, e.target.value as FeatureFlag['environment'])}
                        style={{
                          fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 6,
                          backgroundColor: env.bg, color: env.color, border: 'none', cursor: 'pointer',
                        }}
                      >
                        <option value="all">All</option>
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                        <option value="local">Local</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <button
                        onClick={() => handleDelete(flag.id, flag.key)}
                        disabled={deleteFlag.isPending && deleteFlag.variables === flag.id}
                        style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateFlagModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: [RESOURCE] }) }}
        />
      )}
    </div>
  )
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        position: 'relative', width: 40, height: 22, borderRadius: 9999, border: 'none', cursor: disabled ? 'wait' : 'pointer',
        backgroundColor: checked ? '#10B981' : 'var(--color-background-muted)', transition: 'background-color 150ms', flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: '50%',
        backgroundColor: '#fff', transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function CreateFlagModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { show } = useToast()
  const [key, setKey]                 = useState('')
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState<'all' | 'production' | 'staging' | 'local'>('all')
  const [isEnabled, setIsEnabled]     = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [saving, setSaving]           = useState(false)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!key.trim()) newErrors.key = 'Key is required.'
    else if (!/^[a-z0-9_.-]+$/.test(key)) newErrors.key = 'Lowercase letters, numbers, dots, hyphens, underscores only.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await adminCreate(RESOURCE, { key: key.trim(), description: description || null, environment, is_enabled: isEnabled })
      show('success', 'Feature flag created.')
      onCreated()
    } catch (err) {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> }
      if (anyErr.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(anyErr.errors).forEach(([k, msgs]) => { fieldErrors[k] = msgs[0] })
        setErrors(fieldErrors)
      }
      show('error', anyErr.message ?? 'Failed to create flag.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '28rem', backgroundColor: 'var(--color-surface)', borderRadius: '1rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)' }}>New Feature Flag</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-foreground-muted)' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Field label="Key" required hint="Cannot be changed after creation" error={errors.key}>
            <Input value={key} onChange={e => setKey(e.target.value)} placeholder="new_dashboard_ui" style={{ fontFamily: 'monospace' }} error={!!errors.key} />
          </Field>

          <Field label="Description">
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What does this flag control?" />
          </Field>

          <Field label="Environment">
            <Select value={environment} onChange={e => setEnvironment(e.target.value as typeof environment)}>
              <option value="all">All</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="local">Local</option>
            </Select>
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-foreground)' }}>
            <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }} />
            Enable immediately
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <Button type="submit" variant="primary" size="sm" loading={saving} style={{ flex: 1 }}>
              <Save size={15} /> Create Flag
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
