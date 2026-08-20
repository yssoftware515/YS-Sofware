export interface VersionInfo {
  id: string
  version: string
  buildNumber: string
  releaseDate: string
  changelog: string
  compatibility: VersionCompatibility
  migrations: string[]
  required: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface VersionCompatibility {
  minPhp?: string
  minNode?: string
  minAppVersion?: string
  maxAppVersion?: string
  moduleVersions?: Record<string, string>
}

export interface UpdateResult {
  applied: boolean
  version?: string
  migrations: string[]
  errors: string[]
  rolledBack: boolean
}
