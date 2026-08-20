'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea, Select, Checkbox } from '@/components/admin/FormElements'
import { useToast } from '@/components/admin/Toast'
import { adminCreate, adminUpdate } from '@/lib/admin/api'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'

const RESOURCE = '/admin/timeline'

interface TimelineEntry {
  id: string
  title_en: string
  title_ar: string
  description_en: string | null
  description_ar: string | null
  event_date: string
  type: 'founding' | 'product_launch' | 'milestone' | 'award' | 'partnership'
  is_public: boolean
  sort_order: number
  product: { name_en: string } | null
}

const typeColors: Record<string, string> = {
  founding: '#8B5CF6', product_launch: 'var(--color-accent)', milestone: '#10B981',
  award: '#F59E0B', partnership: '#EC4899',
}

const typeLabels: Record<string, string> = {
  founding: 'Founding', product_launch: 'Product Launch', milestone: 'Milestone',
  award: 'Award', partnership: 'Partnership',
}

export default function TimelinePage() {
  const queryClient = useQueryClient()
  const [modalEntry, setModalEntry] = useState<TimelineEntry | 'new' | null>(null)

  const { data: entries = [], isLoading } = useAdminList<TimelineEntry>(RESOURCE)
  const deleteEntry = useAdminDelete(RESOURCE)

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    deleteEntry.mutate(id)
  }

  const sorted = [...entries].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Company Timeline</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>Manage milestones shown on the About page</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setModalEntry('new')}>
          <Plus size={16} /> Add Milestone
        </Button>
      </div>

      <div style={{ borderRadius: '1rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-subtle)' }}>
                {['Date', 'Title', 'Type', 'Product', 'Visibility', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                  No milestones yet. <button onClick={() => setModalEntry('new')} style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Add one →</button>
                </td></tr>
              ) : sorted.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-background-subtle">
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(entry.event_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 500, color: 'var(--color-foreground)' }}>{entry.title_en}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 9999, backgroundColor: `${typeColors[entry.type]}18`, color: typeColors[entry.type] }}>
                      {typeLabels[entry.type]}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--color-foreground-muted)' }}>{entry.product?.name_en ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: entry.is_public ? '#10B981' : 'var(--color-foreground-muted)' }}>
                      {entry.is_public ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setModalEntry(entry)} style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-foreground-muted)' }}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(entry.id, entry.title_en)} disabled={deleteEntry.isPending && deleteEntry.variables === entry.id} style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-error)' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalEntry && (
        <TimelineModal
          entry={modalEntry === 'new' ? null : modalEntry}
          onClose={() => setModalEntry(null)}
          onSaved={() => { setModalEntry(null); queryClient.invalidateQueries({ queryKey: [RESOURCE] }) }}
        />
      )}
    </div>
  )
}

function TimelineModal({
  entry, onClose, onSaved,
}: {
  entry: TimelineEntry | null; onClose: () => void; onSaved: () => void
}) {
  const { show } = useToast()
  const isEdit = Boolean(entry)

  const [form, setForm] = useState({
    title_en: entry?.title_en ?? '',
    title_ar: entry?.title_ar ?? '',
    description_en: entry?.description_en ?? '',
    description_ar: entry?.description_ar ?? '',
    event_date: entry?.event_date ?? new Date().toISOString().slice(0, 10),
    type: entry?.type ?? 'milestone' as TimelineEntry['type'],
    is_public: entry?.is_public ?? true,
    sort_order: entry?.sort_order ?? 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.title_en.trim()) newErrors.title_en = 'English title is required.'
    if (!form.title_ar.trim()) newErrors.title_ar = 'Arabic title is required.'
    if (!form.event_date)      newErrors.event_date = 'Date is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? adminUpdate(`${RESOURCE}/${entry!.id}`, form)
        : adminCreate(RESOURCE, form),
    onSuccess: () => {
      show('success', isEdit ? 'Milestone updated.' : 'Milestone created.')
      onSaved()
    },
    onError: (err) => {
      const anyErr = err as { message?: string; errors?: Record<string, string[]> }
      if (anyErr.errors) {
        const fieldErrors: Record<string, string> = {}
        Object.entries(anyErr.errors).forEach(([k, msgs]) => { fieldErrors[k] = msgs[0] })
        setErrors(fieldErrors)
      }
      show('error', anyErr.message ?? 'Failed to save milestone.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    saveMutation.mutate()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '32rem', backgroundColor: 'var(--color-surface)', borderRadius: '1rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-modal)', margin: '2rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)' }}>
            {isEdit ? 'Edit Milestone' : 'New Milestone'}
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-foreground-muted)' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '65vh', overflowY: 'auto' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="English Title" required error={errors.title_en}>
              <Input value={form.title_en} onChange={e => update('title_en', e.target.value)} placeholder="YS-Matrix Released" error={!!errors.title_en} />
            </Field>
            <Field label="Arabic Title" required error={errors.title_ar}>
              <Input value={form.title_ar} onChange={e => update('title_ar', e.target.value)} placeholder="إطلاق YS-Matrix" dir="rtl" error={!!errors.title_ar} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Event Date" required error={errors.event_date}>
              <Input type="date" value={form.event_date} onChange={e => update('event_date', e.target.value)} error={!!errors.event_date} />
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={e => update('type', e.target.value as typeof form.type)}>
                <option value="founding">Founding</option>
                <option value="product_launch">Product Launch</option>
                <option value="milestone">Milestone</option>
                <option value="award">Award</option>
                <option value="partnership">Partnership</option>
              </Select>
            </Field>
          </div>

          <Field label="Description (English)">
            <Textarea value={form.description_en} onChange={e => update('description_en', e.target.value)} rows={2} placeholder="Optional details..." />
          </Field>
          <Field label="Description (Arabic)">
            <Textarea value={form.description_ar} onChange={e => update('description_ar', e.target.value)} rows={2} dir="rtl" placeholder="تفاصيل اختيارية..." />
          </Field>

          <Checkbox label="Visible on public About page" checked={form.is_public} onChange={e => update('is_public', e.target.checked)} />

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <Button type="submit" variant="primary" size="sm" loading={saveMutation.isPending} style={{ flex: 1 }}>
              <Save size={15} /> {isEdit ? 'Save Changes' : 'Create Milestone'}
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
