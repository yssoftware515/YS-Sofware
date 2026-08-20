export interface FeatureFlagDefinition {
  key: string
  moduleId: string
  labelEn: string
  labelAr: string
  defaultValue: boolean
}

export class FeatureFlagRegistry {
  private flags: FeatureFlagDefinition[] = []

  registerFlag(flag: FeatureFlagDefinition): void {
    const existing = this.flags.findIndex(f => f.key === flag.key)
    if (existing >= 0) {
      this.flags[existing] = flag
      return
    }
    this.flags.push(flag)
  }

  getFlags(): FeatureFlagDefinition[] {
    return [...this.flags]
  }

  findByModule(moduleId: string): FeatureFlagDefinition[] {
    return this.flags.filter(f => f.moduleId === moduleId)
  }

  clear(): void {
    this.flags = []
  }
}
