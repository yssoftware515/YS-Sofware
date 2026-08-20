export type DeploymentStatus = 'pending' | 'deploying' | 'completed' | 'failed' | 'rolled_back'

export interface Release {
  id: string
  version: string
  buildNumber: string
  gitSha: string
  gitBranch: string
  description: string
  changelog: string
  author: string
  artifacts: string[]
  status: DeploymentStatus
  deployedAt?: string
  createdAt: string
}

export interface Deployment {
  id: string
  releaseId: string
  environment: string
  status: DeploymentStatus
  steps: DeploymentStep[]
  startedAt: string
  completedAt?: string
  rollbackId?: string
}

export interface DeploymentStep {
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: string
  completedAt?: string
  error?: string
}
