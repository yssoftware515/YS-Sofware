export interface PermissionDefinition {
  key: string
  group: string
  moduleId: string
  description?: string
}

export interface PermissionGroup {
  group: string
  moduleId: string
  permissions: string[]
}

export class PermissionRegistry {
  private definitions: PermissionDefinition[] = []

  registerPermissions(moduleId: string, group: string, keys: string[]): void {
    for (const key of keys) {
      const existing = this.definitions.findIndex(d => d.key === key)
      if (existing >= 0) {
        this.definitions[existing] = { key, group, moduleId }
      } else {
        this.definitions.push({ key, group, moduleId })
      }
    }
  }

  getGroups(): PermissionGroup[] {
    const map = new Map<string, PermissionGroup>()
    for (const def of this.definitions) {
      const key = `${def.moduleId}:${def.group}`
      if (!map.has(key)) {
        map.set(key, { group: def.group, moduleId: def.moduleId, permissions: [] })
      }
      map.get(key)!.permissions.push(def.key)
    }
    return Array.from(map.values())
  }

  getAllKeys(): string[] {
    return this.definitions.map(d => d.key)
  }

  hasKey(key: string): boolean {
    return this.definitions.some(d => d.key === key)
  }

  clear(): void {
    this.definitions = []
  }
}
