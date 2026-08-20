export type ValidationVerdict = 'pass' | 'warning' | 'fail'

export interface ValidationCheck {
  name: string
  category: string
  verdict: ValidationVerdict
  message: string
  details?: string
}

export interface ValidationReport {
  overall: ValidationVerdict
  timestamp: string
  checks: ValidationCheck[]
  summary: { pass: number; warning: number; fail: number }
}

export interface ExtensionProposal {
  id: string
  name: string
  version: string
  sdkVersion?: string
  dependencies?: Array<{ moduleId: string; version?: string }>
  permissions?: string[]
  navigation?: string[]
  routes?: string[]
  featureFlags?: string[]
  commands?: string[]
  queries?: string[]
  events?: string[]
  drivers?: Array<{ category: string; name: string }>
}
