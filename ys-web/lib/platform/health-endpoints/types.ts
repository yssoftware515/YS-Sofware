export type EndpointType = 'live' | 'ready' | 'startup' | 'deep'

export interface HealthEndpointResponse {
  status: 'ok' | 'degraded' | 'fail'
  version: string
  timestamp: string
  duration: number
  checks: HealthEndpointCheck[]
}

export interface HealthEndpointCheck {
  name: string
  status: 'ok' | 'degraded' | 'fail'
  duration: number
  error?: string
  metadata?: Record<string, unknown>
}

export type HealthCheckFn = () => Promise<HealthEndpointCheck> | HealthEndpointCheck
