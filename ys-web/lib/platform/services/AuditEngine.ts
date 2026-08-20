export interface AuditEntry {
  id: string
  actorId?: string
  actorName?: string
  action: string
  entityType: string
  entityId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  reason?: string
  ip?: string
  userAgent?: string
  moduleId: string
  correlationId?: string
  timestamp: string
}

export type AuditAction = 'created' | 'updated' | 'deleted' | 'restored' | 'enabled' | 'disabled' | 'installed' | 'uninstalled' | 'upgraded' | 'login' | 'logout' | 'exported' | 'imported' | 'custom'

export class AuditEngine {
  private entries: AuditEntry[] = []
  private maxEntries = 1000

  record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const full: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    }

    this.entries.push(full)
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }

    return full
  }

  findByEntity(entityType: string, entityId: string): AuditEntry[] {
    return this.entries.filter(e => e.entityType === entityType && e.entityId === entityId)
  }

  findByActor(actorId: string): AuditEntry[] {
    return this.entries.filter(e => e.actorId === actorId)
  }

  findByModule(moduleId: string): AuditEntry[] {
    return this.entries.filter(e => e.moduleId === moduleId)
  }

  findByAction(action: string): AuditEntry[] {
    return this.entries.filter(e => e.action === action)
  }

  findByCorrelationId(correlationId: string): AuditEntry[] {
    return this.entries.filter(e => e.correlationId === correlationId)
  }

  getAll(): AuditEntry[] {
    return [...this.entries]
  }

  count(): number {
    return this.entries.length
  }

  clear(): void {
    this.entries = []
  }

  private generateId(): string {
    return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }
}
