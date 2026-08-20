export interface PermissionCheck {
  permission: string
  moduleId?: string
  resource?: string
}

export interface RoleDefinition {
  id: string
  name: string
  permissions: string[]
}

export class SecurityManager {
  private roles: RoleDefinition[] = []
  private permissionCache = new Map<string, boolean>()
  private maxCacheSize = 1000

  registerRole(role: RoleDefinition): void {
    const existing = this.roles.findIndex(r => r.id === role.id)
    if (existing >= 0) {
      this.roles[existing] = role
    } else {
      this.roles.push(role)
    }
  }

  hasPermission(userPermissions: string[], permission: string): boolean {
    const sorted = [...userPermissions].sort()
    const cacheKey = `${sorted.join(',')}|${permission}`
    const cached = this.permissionCache.get(cacheKey)
    if (cached !== undefined) return cached

    const result = userPermissions.includes('*') || userPermissions.includes(permission)
    if (this.permissionCache.size >= this.maxCacheSize) {
      const firstKey = this.permissionCache.keys().next().value
      if (firstKey !== undefined) this.permissionCache.delete(firstKey)
    }
    this.permissionCache.set(cacheKey, result)
    return result
  }

  hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(userPermissions, p))
  }

  hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(userPermissions, p))
  }

  getRole(id: string): RoleDefinition | undefined {
    return this.roles.find(r => r.id === id)
  }

  getRoles(): RoleDefinition[] {
    return [...this.roles]
  }

  clearCache(): void {
    this.permissionCache.clear()
  }
}
