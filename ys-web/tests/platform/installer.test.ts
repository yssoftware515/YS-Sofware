import { describe, it, expect } from 'vitest'
import { InstallationWizard } from '@/lib/platform/installer/InstallationWizard'

describe('InstallationWizard', () => {
  it('tracks installation steps', () => {
    const wizard = new InstallationWizard()
    expect(wizard.isCompleted()).toBe(false)
    wizard.start()
    expect(wizard.isStarted()).toBe(true)
    expect(wizard.getCurrentStep()).toBe('platform_info')
  })

  it('progresses through all steps', () => {
    const wizard = new InstallationWizard()
    wizard.start()
    wizard.submit('platform_info', { platformName: 'YS Platform', platformUrl: 'https://ys.com' })
    wizard.submit('database', { dbConnection: 'pgsql://...' })
    wizard.submit('redis', { redisHost: 'localhost', redisPort: 6379 })
    wizard.submit('mail', { mailHost: 'smtp.example.com', mailPort: 587 })
    wizard.submit('storage', { storageDriver: 'local' })
    wizard.submit('admin_account', { adminEmail: 'admin@ys.com', adminPassword: 'password' })
    wizard.submit('localization', { locale: 'en', timezone: 'UTC' })
    wizard.submit('confirmation', {})
    expect(wizard.isCompleted()).toBe(true)
    expect(wizard.getProgress().percent).toBe(100)
  })
})
