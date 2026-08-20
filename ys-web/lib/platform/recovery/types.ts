export type RecoveryStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'simulated'
export type RecoveryStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface RecoveryPlan {
  id: string
  name: string
  description: string
  steps: RecoveryPlanStep[]
  estimatedRto: number
  estimatedRpo: number
  createdAt: string
  updatedAt: string
}

export interface RecoveryPlanStep {
  name: string
  order: number
  description: string
  status: RecoveryStepStatus
  startedAt?: string
  completedAt?: string
  error?: string
}

export interface RecoveryExecution {
  id: string
  planId: string
  status: RecoveryStatus
  steps: RecoveryPlanStep[]
  startedAt: string
  completedAt?: string
  duration?: number
  verified: boolean
}

export interface BackupVerification {
  id: string
  backupId: string
  verified: boolean
  checksumMatch: boolean
  sizeMatch: boolean
  integrityPassed: boolean
  verifiedAt: string
  errors: string[]
}
