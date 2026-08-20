export type MaintenanceScope = 'all' | 'admin' | 'api' | 'frontend'

export interface MaintenanceState {
  enabled: boolean
  message: string
  scope: MaintenanceScope
  scheduledStart?: string
  scheduledEnd?: string
  allowedRoles: string[]
  allowedUsers: string[]
  allowedIps: string[]
  updatedAt: string
}
