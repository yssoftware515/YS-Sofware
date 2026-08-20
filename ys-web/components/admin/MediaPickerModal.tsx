'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, X, FileText, Check } from 'lucide-react'
import { useAdminList } from '@/lib/hooks/useAdminResource'

interface MediaItem {
  id: string
  url: string
  filename: string
  original_name: string
  mime_type: string
  human_size: string
  alt_text_en: string | null
}

interface MediaPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (mediaId: string) => void
}

/**
 * Read-only picker over the existing Media Library — absolutely no upload
 * logic here (the Media Library owns uploads). The backend /admin/media
 * endpoint remains the authorization + validation authority; this modal
 * only renders what that endpoint allows the current admin to see.
 */
export function MediaPickerModal({ open, onClose, onSelect }: MediaPickerModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const { data: items = [], isLoading, isError } = useAdminList<MediaItem>(
    '/admin/media',
    search ? { search } : undefined,
  )

  if (!open) return null

  const isImage = (mime: string) => mime.startsWith('image/')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select media"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: '56rem', maxHeight: '85dvh', overflowY: 'auto',
        borderRadius: '1rem', backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <h2 className="font-display font-semibold" style={{ fontSize: '1.0625rem', color: 'var(--color-foreground)' }}>
            Select Media
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ padding: '0.375rem', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--color-foreground-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ position: 'relative', maxWidth: '24rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search files..."
            style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.5rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading media...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
            {search ? 'No files match your search.' : 'No files in the library yet. Add files from the Media Library first.'}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(selected === item.id ? null : item.id)}
                aria-pressed={selected === item.id}
                style={{
                  position: 'relative', padding: 0, border: `2px solid ${selected === item.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer', backgroundColor: 'var(--color-background-subtle)',
                  aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={item?.original_name ?? item.filename}
              >
                {isImage(item?.mime_type ?? '') ? (
                  <Image src={item.url} alt={item.alt_text_en ?? item.original_name} fill className="object-cover" sizes="150px" />
                ) : (
                  <FileText size={24} style={{ color: 'var(--color-foreground-muted)' }} />
                )}
                {selected === item.id && (
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Check size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.875rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            disabled={!selected}
            onClick={() => {
              const chosen = items.find(i => i.id === selected)
              if (chosen) {
                onSelect(chosen.id)
                onClose()
              }
            }}
            style={{
              padding: '0.625rem 1.25rem', borderRadius: 8, border: 'none', fontSize: '0.875rem', fontWeight: 500,
              backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
              color: selected ? '#fff' : 'var(--color-foreground-muted)', cursor: selected ? 'pointer' : 'not-allowed',
            }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  )
}