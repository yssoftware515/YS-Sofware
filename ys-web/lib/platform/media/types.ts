export type MediaVisibility = 'public' | 'private'

export interface MediaFolder {
  id: string
  name: string
  parentId?: string
  moduleId: string
  path: string
  createdAt: string
}

export interface MediaCollection {
  id: string
  name: string
  moduleId: string
  items: string[]
  createdAt: string
}

export interface MediaItem {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  width?: number
  height?: number
  folderId?: string
  moduleId: string
  tags: string[]
  metadata: Record<string, unknown>
  visibility: MediaVisibility
  variants: MediaVariant[]
  createdAt: string
  updatedAt: string
  url?: string
}

export interface MediaVariant {
  name: string
  width: number
  height: number
  path: string
  size: number
}

export interface UploadPolicy {
  maxSize: number
  allowedMimes: string[]
  allowedExtensions: string[]
  maxWidth?: number
  maxHeight?: number
  generateVariants: boolean
  variantSizes: Array<{ name: string; width: number; height: number }>
}

export interface MediaDriver {
  upload(item: MediaItem, content: Buffer): Promise<string>
  download(id: string): Promise<Buffer>
  delete(id: string): Promise<void>
  getUrl(id: string): Promise<string>
}
