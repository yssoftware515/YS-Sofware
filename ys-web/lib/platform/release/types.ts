export type ReleaseStatus = 'draft' | 'released' | 'deployed' | 'rolled_back' | 'failed'

export interface ReleaseEntry {
  id: string
  version: string
  buildNumber: string
  gitSha: string
  gitTag?: string
  gitBranch: string
  releaseNotes: string
  changelog: string
  author: string
  status: ReleaseStatus
  migrations: string[]
  rollbackTarget?: string
  deploymentDate?: string
  createdAt: string
}

export interface ReleaseMigration {
  id: string
  version: string
  name: string
  appliedAt?: string
  duration?: number
  status: 'pending' | 'applied' | 'failed' | 'rolled_back'
}
