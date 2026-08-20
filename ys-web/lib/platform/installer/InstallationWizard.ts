import type { InstallStep, InstallStatus, InstallState, InstallData } from './types'

export class InstallationWizard {
  private state: InstallState = this.defaultState()
  private steps: InstallStep[] = [
    'platform_info', 'database', 'redis', 'mail', 'storage',
    'admin_account', 'localization', 'confirmation',
  ]
  private onComplete?: () => void

  private defaultState(): InstallState {
    return {
      started: false,
      completed: false,
      currentStep: 'platform_info',
      completedSteps: [],
      status: 'not_started',
      data: {
        platformName: '',
        platformUrl: '',
        adminEmail: '',
        adminPassword: '',
        dbConnection: '',
        redisHost: '127.0.0.1',
        redisPort: 6379,
        mailHost: '',
        mailPort: 587,
        mailUsername: '',
        mailPassword: '',
        storageDriver: 'local',
        locale: 'en',
        timezone: 'UTC',
      },
    }
  }

  isCompleted(): boolean {
    return this.state.completed
  }

  isStarted(): boolean {
    return this.state.started
  }

  getState(): InstallState {
    return { ...this.state, data: { ...this.state.data } }
  }

  getCurrentStep(): InstallStep {
    return this.state.currentStep
  }

  getCompletedSteps(): InstallStep[] {
    return [...this.state.completedSteps]
  }

  getProgress(): { current: number; total: number; percent: number } {
    return {
      current: this.steps.indexOf(this.state.currentStep) + 1,
      total: this.steps.length,
      percent: Math.round((this.state.completedSteps.length / this.steps.length) * 100),
    }
  }

  start(): void {
    this.state.started = true
    this.state.status = 'in_progress'
    this.state.currentStep = this.steps[0]
  }

  submit(step: InstallStep, data: Partial<InstallData>): void {
    if (step !== this.state.currentStep) throw new Error(`Expected step "${this.state.currentStep}", got "${step}"`)

    Object.assign(this.state.data, data)
    this.state.completedSteps.push(step)

    const nextIndex = this.steps.indexOf(step) + 1
    if (nextIndex >= this.steps.length) {
      this.state.currentStep = 'confirmation'
      this.state.status = 'completed'
      this.state.completed = true
      if (this.onComplete) this.onComplete()
    } else {
      this.state.currentStep = this.steps[nextIndex]
    }
  }

  setOnComplete(cb: () => void): void {
    this.onComplete = cb
  }

  getSummary(): Record<string, string> {
    const data = this.state.data
    return {
      platformName: data.platformName,
      platformUrl: data.platformUrl,
      adminEmail: data.adminEmail,
      dbConnection: data.dbConnection ? 'configured' : 'not set',
      redis: `${data.redisHost}:${data.redisPort}`,
      mail: data.mailHost ? `${data.mailHost}:${data.mailPort}` : 'not set',
      storageDriver: data.storageDriver,
      locale: data.locale,
      timezone: data.timezone,
    }
  }

  reset(): void {
    this.state = this.defaultState()
  }

  getStats() {
    return {
      completed: this.state.completed,
      currentStep: this.state.currentStep,
      stepsCompleted: this.state.completedSteps.length,
      totalSteps: this.steps.length,
      status: this.state.status,
    }
  }
}
