'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, Trash2, Copy, Check, FileText, Search } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/admin/Toast'
import { useAdminList, useAdminDelete } from '@/lib/hooks/useAdminResource'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const RESOURCE = '/admin/media'

interface MediaItem {
  id: string
  url: string
  filename: string
  original_name: string
  mime_type: string
  size: number
  human_size: string
  alt_text_en: string | null
  uploaded_by: string | null
  created_at: string
}

export default function MediaLibraryPage() {
  const { show } = useToast()
  const queryClient = useQueryClient()
  const [dragOver, setDragOver] = useState(false)
  const [search, setSearch]     = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: items = [], isLoading } = useAdminList<MediaItem>(RESOURCE, search ? { search } : undefined)
  const deleteMedia = useAdminDelete(RESOURCE)

  // Multipart file upload stays as a raw fetch — FormData isn't JSON, so
  // it can't go through adminCreate()/adminFetch() as-is. What changed:
  // this is now a real useMutation (proper isPending state, and success
  // invalidates the query cache instead of manually re-calling a fetch
  // function), not a bespoke one-off async function.
  const uploadFiles = useMutation({
    mutationFn: async (files: File[]) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']
      const maxSizeBytes = 10 * 1024 * 1024
      let successCount = 0

      for (const file of files) {
        if (!allowedTypes.includes(file.type)) { show('error', `${file.name}: file type not allowed.`); continue }
        if (file.size > maxSizeBytes) { show('error', `${file.name}: exceeds 10MB limit.`); continue }

        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`${API}${RESOURCE}`, { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' }, body: formData })
        const body = await res.json()
        if (body.success) successCount++
        else show('error', `${file.name}: ${body.message ?? 'upload failed'}`)
      }
      return successCount
    },
    onSuccess: (successCount) => {
      if (successCount > 0) {
        show('success', `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully.`)
        queryClient.invalidateQueries({ queryKey: [RESOURCE] })
      }
    },
    onError: () => show('error', 'Upload failed — network error.'),
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) uploadFiles.mutate(Array.from(e.dataTransfer.files))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles.mutate(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    deleteMedia.mutate(id)
  }

  const isImage = (mime: string) => mime.startsWith('image/')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-display font-semibold" style={{ fontSize: '1.375rem', color: 'var(--color-foreground)' }}>Media Library</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>Upload and manage files</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} loading={uploadFiles.isPending}>
          <Upload size={16} /> Upload Files
        </Button>
        <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileInputChange}
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf" />
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '2.5rem', borderRadius: '1rem', textAlign: 'center', cursor: 'pointer',
          border: `2px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
          backgroundColor: dragOver ? 'var(--color-accent-subtle)' : 'var(--color-background-subtle)',
          transition: 'all 200ms',
        }}
      >
        <Upload size={28} style={{ color: dragOver ? 'var(--color-accent)' : 'var(--color-foreground-muted)', margin: '0 auto 0.75rem' }} />
        <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-foreground)', marginBottom: '0.25rem' }}>
          {dragOver ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}>
          JPEG, PNG, WebP, GIF, SVG, PDF — max 10MB per file
        </p>
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
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-foreground-muted)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
          No files uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} style={{ borderRadius: '0.875rem', border: '1px solid var(--color-border)', overflow: 'hidden', backgroundColor: 'var(--color-surface)' }}>
              <div style={{ position: 'relative', height: '9rem', backgroundColor: 'var(--color-background-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isImage(item.mime_type) ? (
                  <Image src={item.url} alt={item.alt_text_en ?? item.original_name} fill className="object-cover" sizes="200px" />
                ) : (
                  <FileText size={32} style={{ color: 'var(--color-foreground-muted)' }} />
                )}
              </div>

              <div style={{ padding: '0.75rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.original_name}>
                  {item.original_name}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-foreground-muted)', marginTop: '0.125rem' }}>
                  {item.human_size}
                </p>

                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.625rem' }}>
                  <button
                    onClick={() => handleCopy(item.url, item.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.375rem', borderRadius: 6, border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-foreground-muted)' }}
                  >
                    {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />}
                    {copiedId === item.id ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.original_name)}
                    disabled={deleteMedia.isPending && deleteMedia.variables === item.id}
                    style={{ padding: '0.375rem 0.5rem', borderRadius: 6, border: '1px solid var(--color-border)', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--color-error)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
