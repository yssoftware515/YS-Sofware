export type InstallStep = 'platform_info' | 'database' | 'redis' | 'mail' | 'storage' | 'admin_account' | 'localization' | 'confirmation'
export type InstallStatus = 'not_started' | 'in_progress' | 'completed' | 'failed'

export interface InstallState {
  started: boolean
  completed: boolean
  currentStep: InstallStep
  completedSteps: InstallStep[]
  status: InstallStatus
  data: InstallData
}

export interface InstallData {
  platformName: string
  platformUrl: string
  adminEmail: string
  adminPassword: string
  dbConnection: string
  redisHost: string
  redisPort: number
  mailHost: string
  mailPort: number
  mailUsername: string
  mailPassword: string
  storageDriver: string
  locale: string
  timezone: string
}
