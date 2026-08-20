export type FileVisibility = 'public' | 'private'

export interface StorageDriver {
  upload(path: string, content: Buffer | string, visibility?: FileVisibility): Promise<string>
  download(path: string): Promise<Buffer>
  delete(path: string): Promise<void>
  move(from: string, to: string): Promise<void>
  copy(from: string, to: string): Promise<void>
  exists(path: string): Promise<boolean>
  temporaryUrl(path: string, expiresInSeconds: number): Promise<string>
  setVisibility(path: string, visibility: FileVisibility): Promise<void>
  getVisibility(path: string): Promise<FileVisibility>
}

export interface StorageConfig {
  defaultDriver: string
  disks: Record<string, { driver: string; config: Record<string, string> }>
}
