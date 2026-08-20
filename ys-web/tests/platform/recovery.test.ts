import { describe, it, expect } from 'vitest'
import { RecoveryManager } from '@/lib/platform/recovery/RecoveryManager'

describe('RecoveryManager', () => {
  it('creates recovery plans', () => {
    const mgr = new RecoveryManager()
    const plan = mgr.createPlan({
      name: 'Full Recovery',
      description: 'Complete system recovery',
      steps: [{ name: 'Restore DB', description: 'Restore database from backup' }],
      estimatedRto: 3600,
      estimatedRpo: 300,
    })
    expect(plan.steps).toHaveLength(1)
    expect(mgr.getPlans()).toHaveLength(1)
  })

  it('simulates recovery', async () => {
    const mgr = new RecoveryManager()
    const plan = mgr.createPlan({ name: 'Test', description: '', steps: [{ name: 'Step 1', description: '' }], estimatedRto: 60, estimatedRpo: 60 })
    const execution = await mgr.simulate(plan.id)
    expect(execution.status).toBe('completed')
    expect(execution.verified).toBe(true)
  })
})
