export type SecretProvider = 'env' | 'docker' | 'vault'

export interface SecretDefinition {
  key: string
  provider: SecretProvider
  description: string
  rotationRequired: boolean
  lastRotated?: string
  expiresAt?: string
}

export interface SecretEntry {
  key: string
  maskedValue: string
  provider: SecretProvider
  exists: boolean
  lastSet?: string
}
