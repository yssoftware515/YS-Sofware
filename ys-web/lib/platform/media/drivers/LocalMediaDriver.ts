import type { MediaDriver, MediaItem } from '../types'

export class LocalDriver implements MediaDriver {
  private store = new Map<string, Buffer>()

  async upload(item: MediaItem, content: Buffer): Promise<string> {
    this.store.set(item.id, content)
    return `/media/${item.filename}`
  }

  async download(id: string): Promise<Buffer> {
    const buf = this.store.get(id)
    if (!buf) throw new Error(`Media not found: ${id}`)
    return buf
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  async getUrl(id: string): Promise<string> {
    return `/media/${id}`
  }
}
