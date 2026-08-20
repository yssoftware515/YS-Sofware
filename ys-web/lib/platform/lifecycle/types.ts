export type LifecycleStage =
  | 'booting'
  | 'initializing'
  | 'loading_config'
  | 'loading_drivers'
  | 'loading_services'
  | 'loading_modules'
  | 'loading_sdk'
  | 'ready'
  | 'running'
  | 'maintenance'
  | 'shutting_down'
  | 'shutdown'

export type LifecycleEventName =
  | 'lifecycle.stage.entered'
  | 'lifecycle.stage.completed'
  | 'lifecycle.error'

export interface LifecycleTransition {
  from: LifecycleStage | null
  to: LifecycleStage
  timestamp: string
  duration: number
}

export interface LifecycleError {
  stage: LifecycleStage
  error: string
  timestamp: string
}
