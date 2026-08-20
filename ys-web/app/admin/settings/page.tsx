'use client'

import { useEffect, useState } from 'react'
import { Save, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { adminList, adminUpdate } from '@/lib/admin/api'

interface Setting {
  id: string; group: string; key: string; value: unknown
  description: string | null; is_public: boolean
}

type ValueKind = 'boolean' | 'json' | 'string'

function kindOf(value: unknown): ValueKind {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object' && value !== null) return 'json'
  return 'string'
}

/**
 * Load path kept out of the component so its failure surface is
 * unit-testable without a DOM (Phase 4A, INT-008): a rejected fetch
 * must reach the caller — the page turns it into a visible error.
 */
export async function loadSettings(): Promise<Setting[]> {
  return adminList<Setting>('/admin/settings')
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Draft text per setting — always a string in the editor, parsed to the
  // correct real type (boolean/object/string) only at save time.
  const [drafts,   setDrafts]   = useState<Record<string, string>>({})
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})
  const [saved,    setSaved]    = useState<string | null>(null)
  const [saveError, setSaveError] = useState<Record<string, string>>({})
  const [saving,   setSaving]   = useState<string | null>(null)
  const [activeGroup, setActiveGroup] = useState('brand')

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(() => setLoadError('Could not load settings — check your connection and try again.'))
      .finally(() => setLoading(false))
  }, [])

  const groups = [...new Set(settings.map(s => s.group))]
  const filtered = settings.filter(s => s.group === activeGroup)

  const draftFor = (setting: Setting): string => {
    if (drafts[setting.id] !== undefined) return drafts[setting.id]
    const kind = kindOf(setting.value)
    if (kind === 'json') return JSON.stringify(setting.value, null, 2)
    return String(setting.value ?? '')
  }

  const hasChanged = (setting: Setting): boolean => {
    if (drafts[setting.id] === undefined) return false
    return draftFor(setting) !== (kindOf(setting.value) === 'json'
      ? JSON.stringify(setting.value, null, 2)
      : String(setting.value ?? ''))
  }

  const handleTextChange = (setting: Setting, text: string) => {
    setDrafts(prev => ({ ...prev, [setting.id]: text }))

    if (kindOf(setting.value) === 'json') {
      try {
        JSON.parse(text)
        setJsonErrors(prev => { const next = { ...prev }; delete next[setting.id]; return next })
      } catch {
        setJsonErrors(prev => ({ ...prev, [setting.id]: 'Invalid JSON — check syntax before saving.' }))
      }
    }
  }

  const handleBooleanToggle = async (setting: Setting, checked: boolean) => {
    // Booleans save immediately on toggle — no separate Save step needed,
    // matching how a checkbox behaves everywhere else in this admin panel.
    await persist(setting, checked)
  }

  const handleSave = async (setting: Setting) => {
    const kind = kindOf(setting.value)
    const text = draftFor(setting)

    let parsedValue: unknown = text
    if (kind === 'json') {
      try {
        parsedValue = JSON.parse(text)
      } catch {
        setJsonErrors(prev => ({ ...prev, [setting.id]: 'Invalid JSON — check syntax before saving.' }))
        return
      }
    }

    await persist(setting, parsedValue)
  }

  const persist = async (setting: Setting, value: unknown) => {
    setSaving(setting.id)
    try {
      await adminUpdate(`/admin/settings/${setting.id}`, { value })
      setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value } : s))
      setDrafts(prev => { const next = { ...prev }; delete next[setting.id]; return next })
      setSaveError(prev => { const next = { ...prev }; delete next[setting.id]; return next })
      setSaved(setting.id)
      setTimeout(() => setSaved(null), 2000)
    } catch (err) {
      // Network/API error — draft stays in place so the user doesn't
      // lose input, and the failure is visible instead of silent.
      const message = (err as { message?: string })?.message ?? 'Failed to save — check your connection and try again.'
      setSaveError(prev => ({ ...prev, [setting.id]: message }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Settings</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>Manage company-wide configuration</p>
      </div>

      {/* Group tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {groups.map(group => (
          <button key={group} onClick={() => setActiveGroup(group)} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: '0.8125rem', fontWeight: 500, textTransform: 'capitalize',
            backgroundColor: activeGroup === group ? 'var(--color-accent-subtle)' : 'transparent',
            color: activeGroup === group ? 'var(--color-accent)' : 'var(--color-foreground-muted)',
          }}>
            {group}
          </button>
        ))}
      </div>

      {/* Settings list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
        ) : loadError ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.25rem', borderRadius: '0.875rem', border: '1px solid var(--color-error)', backgroundColor: 'var(--color-surface)', fontSize: '0.875rem', color: 'var(--color-error)' }}>
            <AlertCircle size={16} /> {loadError}
          </div>
        ) : filtered.map((setting) => {
          const kind    = kindOf(setting.value)
          const changed = hasChanged(setting)
          const jsonErr = jsonErrors[setting.id]
          const saveErr = saveError[setting.id]

          return (
            <div key={setting.id} style={{ padding: '1.25rem 1.5rem', borderRadius: '0.875rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-foreground)', fontFamily: 'monospace' }}>{setting.key}</p>
                  {setting.description && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-foreground-muted)', marginTop: '0.25rem' }}>{setting.description}</p>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.625rem', borderRadius: 9999, backgroundColor: setting.is_public ? 'rgba(16,185,129,0.1)' : 'var(--color-background-muted)', color: setting.is_public ? '#10B981' : 'var(--color-foreground-muted)', whiteSpace: 'nowrap' }}>
                  {setting.is_public ? 'Public' : 'Private'}
                </span>
              </div>

              {kind === 'boolean' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={setting.value as boolean}
                    disabled={saving === setting.id}
                    onChange={e => handleBooleanToggle(setting, e.target.checked)}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)' }}>
                    {saving === setting.id ? 'Saving...' : 'Enabled'}
                  </span>
                </label>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    {kind === 'json' ? (
                      <textarea
                        value={draftFor(setting)}
                        onChange={e => handleTextChange(setting, e.target.value)}
                        rows={8}
                        style={{
                          flex: 1, padding: '0.75rem', borderRadius: 8,
                          border: `1px solid ${jsonErr ? 'var(--color-error)' : 'var(--color-border)'}`,
                          backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)',
                          fontSize: '0.8125rem', fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                        }}
                      />
                    ) : (
                      <input
                        value={draftFor(setting)}
                        onChange={e => handleTextChange(setting, e.target.value)}
                        style={{ flex: 1, padding: '0.625rem 0.875rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    )}

                    {changed && !jsonErr && (
                      <Button variant="primary" size="sm" loading={saving === setting.id} onClick={() => handleSave(setting)}>
                        {saved === setting.id ? <Check size={14} /> : <Save size={14} />}
                        {saved === setting.id ? 'Saved' : 'Save'}
                      </Button>
                    )}
                  </div>

                  {jsonErr && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.5rem' }}>
                      <AlertCircle size={13} /> {jsonErr}
                    </p>
                  )}

                  {saveErr && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.5rem' }}>
                      <AlertCircle size={13} /> {saveErr}
                    </p>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
