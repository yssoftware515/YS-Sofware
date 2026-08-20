export type BackupType = 'full' | 'incremental' | 'database' | 'storage' | 'config' | 'modules'
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'restoring' | 'verified'

export interface BackupEntry {
  id: string
  name: string
  type: BackupType
  status: BackupStatus
  size: number
  moduleId?: string
  path: string
  encrypted: boolean
  checksum?: string
  createdAt: string
  completedAt?: string
  metadata: Record<string, unknown>
}

export interface BackupSchedule {
  id: string
  type: BackupType
  cron: string
  retention: number
  enabled: boolean
  lastRun?: string
  nextRun?: string
}
