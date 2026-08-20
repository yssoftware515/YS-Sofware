import type { StorageDriver, FileVisibility, StorageConfig } from './types'

export class StorageManager {
  private disks = new Map<string, StorageDriver>()
  private defaultDisk: string

  constructor(defaultDisk = 'local') {
    this.defaultDisk = defaultDisk
  }

  registerDisk(name: string, driver: StorageDriver): void {
    if (this.disks.has(name)) throw new Error(`Storage disk already registered: ${name}`)
    this.disks.set(name, driver)
  }

  replaceDisk(name: string, driver: StorageDriver): void {
    this.disks.set(name, driver)
  }

  disk(name?: string): StorageDriver {
    const diskName = name ?? this.defaultDisk
    const driver = this.disks.get(diskName)
    if (!driver) throw new Error(`Storage disk not found: ${diskName}`)
    return driver
  }

  setDefaultDisk(name: string): void {
    if (!this.disks.has(name)) throw new Error(`Cannot set default to unregistered disk: ${name}`)
    this.defaultDisk = name
  }

  getDefaultDisk(): string {
    return this.defaultDisk
  }

  getDisks(): string[] {
    return Array.from(this.disks.keys())
  }

  async upload(path: string, content: Buffer | string, visibility?: FileVisibility): Promise<string> {
    return this.disk().upload(path, content, visibility)
  }

  async download(path: string): Promise<Buffer> {
    return this.disk().download(path)
  }

  async delete(path: string): Promise<void> {
    return this.disk().delete(path)
  }

  async move(from: string, to: string): Promise<void> {
    return this.disk().move(from, to)
  }

  async copy(from: string, to: string): Promise<void> {
    return this.disk().copy(from, to)
  }

  async exists(path: string): Promise<boolean> {
    return this.disk().exists(path)
  }

  async temporaryUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    return this.disk().temporaryUrl(path, expiresInSeconds)
  }

  configure(config: StorageConfig): void {
    if (config.defaultDriver) this.defaultDisk = config.defaultDriver
  }

  clear(): void {
    this.disks.clear()
  }
}
