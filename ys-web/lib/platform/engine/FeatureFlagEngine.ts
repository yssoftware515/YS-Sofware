export type FlagConditionType = 'environment' | 'role' | 'percentage' | 'dateRange' | 'country' | 'dependency' | 'userSegment'

export interface FlagCondition {
  type: FlagConditionType
  operator?: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte'
  value: string | number | boolean | string[]
}

export interface FeatureFlag {
  key: string
  label: string
  description?: string
  enabled: boolean
  moduleId: string
  conditions?: FlagCondition[]
  dependencies?: string[]
}

export interface FeatureFlagEngineContext {
  environment?: string
  roles?: string[]
  country?: string
  userSegments?: string[]
  now?: Date
  getFlag?: (key: string) => FeatureFlag | undefined
}

export class FeatureFlagEngine {
  private flags = new Map<string, FeatureFlag>()

  registerFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag)
  }

  registerFlags(flags: FeatureFlag[]): void {
    for (const flag of flags) {
      this.registerFlag(flag)
    }
  }

  isEnabled(key: string, context?: FeatureFlagEngineContext, visited?: Set<string>): boolean {
    const flag = this.flags.get(key)
    if (!flag) return false
    if (!flag.enabled) return false

    if (flag.dependencies && flag.dependencies.length > 0 && context?.getFlag) {
      const cycleGuard = visited ?? new Set<string>()
      if (cycleGuard.has(key)) return false
      cycleGuard.add(key)

      const allDepsEnabled = flag.dependencies.every(depKey => {
        const dep = context.getFlag!(depKey)
        if (!dep) return false
        return this.isEnabled(depKey, context, cycleGuard)
      })
      if (!allDepsEnabled) return false
    }

    if (flag.conditions && flag.conditions.length > 0 && context) {
      return this.evaluateConditions(flag.conditions, context)
    }

    return true
  }

  private evaluateConditions(conditions: FlagCondition[], context: FeatureFlagEngineContext): boolean {
    return conditions.every(c => this.evaluateCondition(c, context))
  }

  private evaluateCondition(condition: FlagCondition, context: FeatureFlagEngineContext): boolean {
    const { type, operator = 'eq', value } = condition

    switch (type) {
      case 'environment': {
        const env = context.environment
        return this.compare(env, operator, value)
      }
      case 'role': {
        const roles = context.roles ?? []
        if (operator === 'in') {
          const vals = Array.isArray(value) ? value : [value]
          return vals.some(v => roles.includes(String(v)))
        }
        if (operator === 'nin') {
          const vals = Array.isArray(value) ? value : [value]
          return !vals.some(v => roles.includes(String(v)))
        }
        return roles.includes(String(value))
      }
      case 'percentage': {
        const percent = Number(value)
        if (isNaN(percent)) return false
        const hash = this.simpleHash(JSON.stringify({ context, condition }))
        return hash % 100 < percent
      }
      case 'dateRange': {
        const now = context.now ?? new Date()
        if (operator === 'gt') return now > new Date(String(value))
        if (operator === 'gte') return now >= new Date(String(value))
        if (operator === 'lt') return now < new Date(String(value))
        if (operator === 'lte') return now <= new Date(String(value))
        return now >= new Date(String(value))
      }
      case 'country': {
        const country = context.country
        return this.compare(country, operator, value)
      }
      case 'userSegment': {
        const segments = context.userSegments ?? []
        if (operator === 'in') {
          const vals = Array.isArray(value) ? value : [value]
          return vals.some(v => segments.includes(String(v)))
        }
        if (operator === 'nin') {
          const vals = Array.isArray(value) ? value : [value]
          return !vals.some(v => segments.includes(String(v)))
        }
        return segments.includes(String(value))
      }
      case 'dependency': {
        const depKey = String(value)
        if (!context.getFlag) return false
        const depFlag = context.getFlag(depKey)
        if (!depFlag) return false
        return this.isEnabled(depKey, context)
      }
      default:
        return false
    }
  }

  private compare(actual: string | undefined | null, operator: string, expected: string | number | boolean | string[]): boolean {
    if (actual === undefined || actual === null) return false
    const vals = Array.isArray(expected) ? expected : [expected]

    switch (operator) {
      case 'eq': return actual === String(expected)
      case 'neq': return actual !== String(expected)
      case 'in': return vals.some(v => actual === String(v))
      case 'nin': return !vals.some(v => actual === String(v))
      default: return actual === String(expected)
    }
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key)
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }

  getFlagsByModule(moduleId: string): FeatureFlag[] {
    return this.getAllFlags().filter(f => f.moduleId === moduleId)
  }

  setEnabled(key: string, enabled: boolean): void {
    const flag = this.flags.get(key)
    if (flag) flag.enabled = enabled
  }

  removeFlag(key: string): void {
    this.flags.delete(key)
  }

  clear(): void {
    this.flags.clear()
  }
}
