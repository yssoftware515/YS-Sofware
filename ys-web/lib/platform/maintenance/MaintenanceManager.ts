import type { MaintenanceState, MaintenanceScope } from './types'

export class MaintenanceManager {
  private state: MaintenanceState = {
    enabled: false,
    message: 'System is under scheduled maintenance. Please check back shortly.',
    scope: 'all',
    allowedRoles: ['admin', 'superadmin'],
    allowedUsers: [],
    allowedIps: [],
    updatedAt: new Date().toISOString(),
  }

  private history: Array<{ action: string; timestamp: string; user?: string }> = []

  enable(options?: { message?: string; scope?: MaintenanceScope; scheduledStart?: string; scheduledEnd?: string }): void {
    this.state.enabled = true
    if (options?.message) this.state.message = options.message
    if (options?.scope) this.state.scope = options.scope
    if (options?.scheduledStart) this.state.scheduledStart = options.scheduledStart
    if (options?.scheduledEnd) this.state.scheduledEnd = options.scheduledEnd
    this.state.updatedAt = new Date().toISOString()
    this.history.push({ action: 'enable', timestamp: this.state.updatedAt })
  }

  disable(): void {
    this.state.enabled = false
    this.state.scheduledStart = undefined
    this.state.scheduledEnd = undefined
    this.state.updatedAt = new Date().toISOString()
    this.history.push({ action: 'disable', timestamp: this.state.updatedAt })
  }

  getState(): MaintenanceState {
    return { ...this.state }
  }

  isActive(): boolean {
    if (!this.state.enabled) return false
    if (this.state.scheduledEnd && new Date() > new Date(this.state.scheduledEnd)) {
      this.disable()
      return false
    }
    if (this.state.scheduledStart && new Date() < new Date(this.state.scheduledStart)) {
      return false
    }
    return true
  }

  isAllowed(role: string, userId?: string, ip?: string): boolean {
    if (!this.isActive()) return true
    if (this.state.allowedRoles.includes(role)) return true
    if (userId && this.state.allowedUsers.includes(userId)) return true
    if (ip && this.state.allowedIps.includes(ip)) return true
    return false
  }

  setAllowedRoles(roles: string[]): void {
    this.state.allowedRoles = roles
    this.state.updatedAt = new Date().toISOString()
  }

  setAllowedUsers(users: string[]): void {
    this.state.allowedUsers = users
    this.state.updatedAt = new Date().toISOString()
  }

  setAllowedIps(ips: string[]): void {
    this.state.allowedIps = ips
    this.state.updatedAt = new Date().toISOString()
  }

  schedule(start: string, end: string, message?: string): void {
    this.state.scheduledStart = start
    this.state.scheduledEnd = end
    if (message) this.state.message = message
    this.state.updatedAt = new Date().toISOString()
    this.history.push({ action: `scheduled: ${start} to ${end}`, timestamp: this.state.updatedAt })
  }

  getHistory(): Array<{ action: string; timestamp: string; user?: string }> {
    return [...this.history]
  }

  clear(): void {
    this.state = {
      enabled: false,
      message: 'System is under scheduled maintenance.',
      scope: 'all',
      allowedRoles: ['admin', 'superadmin'],
      allowedUsers: [],
      allowedIps: [],
      updatedAt: new Date().toISOString(),
    }
    this.history = []
  }
}
