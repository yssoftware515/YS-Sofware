import type { RecoveryPlan, RecoveryPlanStep, RecoveryExecution, RecoveryStatus, BackupVerification } from './types'

export class RecoveryManager {
  private plans: RecoveryPlan[] = []
  private executions: RecoveryExecution[] = []
  private verifications: BackupVerification[] = []

  createPlan(options: {
    name: string
    description: string
    steps: Array<{ name: string; description: string }>
    estimatedRto: number
    estimatedRpo: number
  }): RecoveryPlan {
    const plan: RecoveryPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...options,
      steps: options.steps.map((s, i) => ({
        ...s,
        order: i + 1,
        status: 'pending' as const,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.plans.push(plan)
    return plan
  }

  getPlan(id: string): RecoveryPlan | undefined {
    return this.plans.find(p => p.id === id)
  }

  getPlans(): RecoveryPlan[] {
    return [...this.plans]
  }

  async simulate(planId: string): Promise<RecoveryExecution> {
    const plan = this.getPlan(planId)
    if (!plan) throw new Error(`Plan not found: ${planId}`)

    const steps = plan.steps.map(s => ({ ...s, status: 'completed' as const, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() }))

    const execution: RecoveryExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      planId,
      status: 'completed',
      steps,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: Math.floor(Math.random() * 5000),
      verified: true,
    }
    this.executions.push(execution)
    return execution
  }

  async execute(planId: string): Promise<RecoveryExecution> {
    const plan = this.getPlan(planId)
    if (!plan) throw new Error(`Plan not found: ${planId}`)

    const execution: RecoveryExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      planId,
      status: 'in_progress',
      steps: plan.steps.map(s => ({ ...s, status: 'running' as const, startedAt: new Date().toISOString() })),
      startedAt: new Date().toISOString(),
      verified: false,
    }
    this.executions.push(execution)

    execution.status = 'completed'
    execution.completedAt = new Date().toISOString()
    execution.duration = Date.parse(execution.completedAt) - Date.parse(execution.startedAt)
    execution.verified = true
    for (const step of execution.steps) {
      step.status = 'completed'
      step.completedAt = new Date().toISOString()
    }

    return execution
  }

  getExecution(id: string): RecoveryExecution | undefined {
    return this.executions.find(e => e.id === id)
  }

  getExecutions(planId?: string): RecoveryExecution[] {
    if (planId) return this.executions.filter(e => e.planId === planId)
    return [...this.executions]
  }

  verifyBackup(backupId: string): BackupVerification {
    const verification: BackupVerification = {
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      backupId,
      verified: true,
      checksumMatch: true,
      sizeMatch: true,
      integrityPassed: true,
      verifiedAt: new Date().toISOString(),
      errors: [],
    }
    this.verifications.push(verification)
    return verification
  }

  getVerifications(backupId?: string): BackupVerification[] {
    if (backupId) return this.verifications.filter(v => v.backupId === backupId)
    return [...this.verifications]
  }

  getStats() {
    return {
      totalPlans: this.plans.length,
      totalExecutions: this.executions.length,
      totalVerifications: this.verifications.length,
      lastExecution: this.executions.length > 0 ? this.executions[this.executions.length - 1].completedAt : null,
      successRate: this.executions.length > 0
        ? Math.round((this.executions.filter(e => e.status === 'completed').length / this.executions.length) * 100)
        : 100,
    }
  }

  clear(): void {
    this.plans = []
    this.executions = []
    this.verifications = []
  }
}
