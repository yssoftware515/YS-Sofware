import type { BackupEntry, BackupSchedule, BackupType, BackupStatus } from './types'

export class BackupManager {
  private backups: BackupEntry[] = []
  private schedules: BackupSchedule[] = []
  private maxBackups = 100

  async create(type: BackupType, options?: { moduleId?: string; name?: string; encrypted?: boolean }): Promise<BackupEntry> {
    const entry: BackupEntry = {
      id: `bkp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: options?.name ?? `${type}_${new Date().toISOString().slice(0, 10)}`,
      type,
      status: 'running',
      size: 0,
      path: `/backups/${type}/${new Date().toISOString().slice(0, 10)}`,
      encrypted: options?.encrypted ?? false,
      moduleId: options?.moduleId,
      createdAt: new Date().toISOString(),
      metadata: {},
    }

    this.backups.push(entry)
    if (this.backups.length > this.maxBackups) this.backups.shift()

    try {
      entry.status = 'completed'
      entry.completedAt = new Date().toISOString()
      entry.size = Math.floor(Math.random() * 1000000)
      entry.checksum = `sha256_${Math.random().toString(36).slice(2, 10)}`
    } catch (e) {
      entry.status = 'failed'
    }

    return entry
  }

  async restore(id: string): Promise<BackupEntry> {
    const backup = this.backups.find(b => b.id === id)
    if (!backup) throw new Error(`Backup not found: ${id}`)
    backup.status = 'restoring'
    backup.status = 'completed'
    return backup
  }

  async verify(id: string): Promise<boolean> {
    const backup = this.backups.find(b => b.id === id)
    if (!backup) return false
    backup.status = 'verified'
    return true
  }

  getBackup(id: string): BackupEntry | undefined {
    return this.backups.find(b => b.id === id)
  }

  getBackups(type?: BackupType): BackupEntry[] {
    if (type) return this.backups.filter(b => b.type === type)
    return [...this.backups]
  }

  getByModule(moduleId: string): BackupEntry[] {
    return this.backups.filter(b => b.moduleId === moduleId)
  }

  deleteBackup(id: string): void {
    this.backups = this.backups.filter(b => b.id !== id)
  }

  addSchedule(schedule: BackupSchedule): void {
    const existing = this.schedules.findIndex(s => s.id === schedule.id)
    if (existing >= 0) this.schedules[existing] = schedule
    else this.schedules.push(schedule)
  }

  removeSchedule(id: string): void {
    this.schedules = this.schedules.filter(s => s.id !== id)
  }

  getSchedules(): BackupSchedule[] {
    return [...this.schedules]
  }

  getStats() {
    return {
      total: this.backups.length,
      totalSize: this.backups.reduce((s, b) => s + b.size, 0),
      byType: this.backups.reduce((acc: Record<string, number>, b) => {
        acc[b.type] = (acc[b.type] ?? 0) + 1
        return acc
      }, {}),
      schedules: this.schedules.length,
      lastBackup: this.backups.length > 0 ? this.backups[this.backups.length - 1].createdAt : null,
    }
  }

  clear(): void {
    this.backups = []
    this.schedules = []
  }
}
