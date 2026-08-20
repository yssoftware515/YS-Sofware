import type { MediaItem, MediaFolder, MediaCollection, UploadPolicy, MediaVisibility, MediaVariant, MediaDriver } from './types'
import { LocalDriver } from './drivers/LocalMediaDriver'

export class MediaManager {
  private driver: MediaDriver
  private folders: MediaFolder[] = []
  private collections: MediaCollection[] = []
  private items: MediaItem[] = []
  private policies = new Map<string, UploadPolicy>()
  private defaultPolicy: UploadPolicy = {
    maxSize: 10 * 1024 * 1024,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
    generateVariants: true,
    variantSizes: [
      { name: 'thumb', width: 150, height: 150 },
      { name: 'small', width: 300, height: 300 },
      { name: 'medium', width: 600, height: 600 },
    ],
  }

  constructor(driver?: MediaDriver) {
    this.driver = driver ?? new LocalDriver()
  }

  setDriver(driver: MediaDriver): void {
    this.driver = driver
  }

  setUploadPolicy(name: string, policy: UploadPolicy): void {
    this.policies.set(name, policy)
  }

  getUploadPolicy(name?: string): UploadPolicy {
    return this.policies.get(name ?? 'default') ?? this.defaultPolicy
  }

  async upload(item: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt' | 'variants' | 'url'>, content: Buffer): Promise<MediaItem> {
    const policy = this.getUploadPolicy()
    if (content.length > policy.maxSize) throw new Error(`File exceeds max size of ${policy.maxSize}`)
    if (policy.allowedMimes.length > 0 && !policy.allowedMimes.includes(item.mimeType)) {
      throw new Error(`MIME type ${item.mimeType} not allowed`)
    }

    const mediaItem: MediaItem = {
      ...item,
      id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mediaItem.url = await this.driver.upload(mediaItem, content)
    this.items.push(mediaItem)
    return mediaItem
  }

  async delete(id: string): Promise<void> {
    await this.driver.delete(id)
    this.items = this.items.filter(i => i.id !== id)
  }

  async getUrl(id: string): Promise<string> {
    return this.driver.getUrl(id)
  }

  getItem(id: string): MediaItem | undefined {
    return this.items.find(i => i.id === id)
  }

  getItems(folderId?: string): MediaItem[] {
    if (folderId) return this.items.filter(i => i.folderId === folderId)
    return [...this.items]
  }

  getItemsByModule(moduleId: string): MediaItem[] {
    return this.items.filter(i => i.moduleId === moduleId)
  }

  getItemsByTag(tag: string): MediaItem[] {
    return this.items.filter(i => i.tags.includes(tag))
  }

  searchItems(query: string): MediaItem[] {
    const q = query.toLowerCase()
    return this.items.filter(i => i.filename.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q)))
  }

  createFolder(name: string, moduleId: string, parentId?: string): MediaFolder {
    const folder: MediaFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      parentId,
      moduleId,
      path: parentId ? `${this.getFolder(parentId)?.path ?? ''}/${name}` : name,
      createdAt: new Date().toISOString(),
    }
    this.folders.push(folder)
    return folder
  }

  getFolder(id: string): MediaFolder | undefined {
    return this.folders.find(f => f.id === id)
  }

  getFolders(moduleId?: string): MediaFolder[] {
    if (moduleId) return this.folders.filter(f => f.moduleId === moduleId)
    return [...this.folders]
  }

  createCollection(name: string, moduleId: string): MediaCollection {
    const collection: MediaCollection = {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name, moduleId, items: [],
      createdAt: new Date().toISOString(),
    }
    this.collections.push(collection)
    return collection
  }

  addToCollection(collectionId: string, mediaId: string): void {
    const col = this.collections.find(c => c.id === collectionId)
    if (col && !col.items.includes(mediaId)) col.items.push(mediaId)
  }

  removeFromCollection(collectionId: string, mediaId: string): void {
    const col = this.collections.find(c => c.id === collectionId)
    if (col) col.items = col.items.filter(id => id !== mediaId)
  }

  getCollection(id: string): MediaCollection | undefined {
    return this.collections.find(c => c.id === id)
  }

  getCollections(moduleId?: string): MediaCollection[] {
    if (moduleId) return this.collections.filter(c => c.moduleId === moduleId)
    return [...this.collections]
  }

  getStats() {
    return {
      totalItems: this.items.length,
      totalFolders: this.folders.length,
      totalCollections: this.collections.length,
      totalSize: this.items.reduce((s, i) => s + i.size, 0),
      itemsByType: this.items.reduce((acc: Record<string, number>, i) => {
        acc[i.mimeType] = (acc[i.mimeType] ?? 0) + 1
        return acc
      }, {}),
    }
  }

  clear(): void {
    this.items = []
    this.folders = []
    this.collections = []
  }
}
