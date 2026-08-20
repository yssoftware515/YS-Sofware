import * as fs from 'fs'
import * as path from 'path'
import type { StorageDriver, FileVisibility } from '../types'

export class LocalDriver implements StorageDriver {
  private root: string
  private baseUrl: string

  constructor(root: string, baseUrl: string) {
    this.root = root
    this.baseUrl = baseUrl
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root, { recursive: true })
    }
  }

  private resolve(p: string): string {
    return path.join(this.root, p)
  }

  private ensureDir(p: string): void {
    const dir = path.dirname(this.resolve(p))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  async upload(filePath: string, content: Buffer | string, visibility: FileVisibility = 'public'): Promise<string> {
    this.ensureDir(filePath)
    fs.writeFileSync(this.resolve(filePath), content)
    return visibility === 'public' ? `${this.baseUrl}/${filePath}` : this.resolve(filePath)
  }

  async download(filePath: string): Promise<Buffer> {
    return fs.readFileSync(this.resolve(filePath))
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolve(filePath)
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
  }

  async move(from: string, to: string): Promise<void> {
    this.ensureDir(to)
    fs.renameSync(this.resolve(from), this.resolve(to))
  }

  async copy(from: string, to: string): Promise<void> {
    this.ensureDir(to)
    fs.copyFileSync(this.resolve(from), this.resolve(to))
  }

  async exists(filePath: string): Promise<boolean> {
    return fs.existsSync(this.resolve(filePath))
  }

  async temporaryUrl(filePath: string, expiresInSeconds: number): Promise<string> {
    const url = `${this.baseUrl}/${filePath}`
    if (expiresInSeconds > 0) return `${url}?expires=${Date.now() + expiresInSeconds * 1000}`
    return url
  }

  async setVisibility(filePath: string, visibility: FileVisibility): Promise<void> {
    // Local filesystem visibility is determined by URL presence
  }

  async getVisibility(filePath: string): Promise<FileVisibility> {
    return 'public'
  }
}
