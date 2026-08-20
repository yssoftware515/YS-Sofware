import type { MailDriver, MailMessage } from './types'

export class MailManager {
  private drivers = new Map<string, MailDriver>()
  private defaultDriver: string | null = null

  registerDriver(name: string, driver: MailDriver, setAsDefault = false): void {
    if (this.drivers.has(name)) throw new Error(`Mail driver already registered: ${name}`)
    this.drivers.set(name, driver)
    if (setAsDefault || !this.defaultDriver) this.defaultDriver = name
  }

  replaceDriver(name: string, driver: MailDriver): void {
    this.drivers.set(name, driver)
  }

  driver(name?: string): MailDriver {
    const driverName = name ?? this.defaultDriver
    if (!driverName) throw new Error('No mail driver configured')
    const driver = this.drivers.get(driverName)
    if (!driver) throw new Error(`Mail driver not found: ${driverName}`)
    return driver
  }

  async send(message: MailMessage, driverName?: string): Promise<boolean> {
    return this.driver(driverName).send(message)
  }

  async sendTo(email: string, subject: string, html: string, driverName?: string): Promise<boolean> {
    return this.send({ from: { email: 'noreply@ysplatform.com' }, to: [{ email }], subject, html }, driverName)
  }

  getDrivers(): string[] {
    return Array.from(this.drivers.keys())
  }

  getDefaultDriver(): string | null {
    return this.defaultDriver
  }

  setDefaultDriver(name: string): void {
    if (!this.drivers.has(name)) throw new Error(`Mail driver not registered: ${name}`)
    this.defaultDriver = name
  }

  clear(): void {
    this.drivers.clear()
    this.defaultDriver = null
  }
}
