export type EnvironmentName = 'development' | 'testing' | 'staging' | 'production'

export interface EnvVariableDefinition {
  key: string
  required: boolean
  secret: boolean
  defaultValue?: string
  description: string
  validator?: (value: string | undefined) => string | null
  deprecated?: boolean
  deprecatedSince?: string
  validValues?: string[]
}

export interface EnvValidationIssue {
  key: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface EnvValidationReport {
  environment: EnvironmentName
  timestamp: string
  total: number
  errors: number
  warnings: number
  infos: number
  issues: EnvValidationIssue[]
  passed: boolean
}
