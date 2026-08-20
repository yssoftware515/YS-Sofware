import type { CacheDriver, CacheStats } from './types'

export class CacheManager implements CacheDriver {
  private driver: CacheDriver

  constructor(driver?: CacheDriver) {
    this.driver = driver ?? new (require('./drivers/MemoryDriver').MemoryDriver)()
  }

  setDriver(driver: CacheDriver): void {
    this.driver = driver
  }

  getDriver(): CacheDriver {
    return this.driver
  }

  async get(key: string): Promise<unknown | null> {
    return this.driver.get(key)
  }

  async set(key: string, value: unknown, ttl: number): Promise<void> {
    await this.driver.set(key, value, ttl)
  }

  async forget(key: string): Promise<void> {
    await this.driver.forget(key)
  }

  async clear(): Promise<void> {
    await this.driver.clear()
  }

  async has(key: string): Promise<boolean> {
    return this.driver.has(key)
  }

  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    const cached = await this.driver.get(key)
    if (cached !== null) return cached as T
    const value = await callback()
    await this.driver.set(key, value, ttl)
    return value
  }

  async pull<T>(key: string): Promise<T | null> {
    const value = await this.driver.get(key) as T | null
    if (value !== null) await this.driver.forget(key)
    return value
  }

  async add(key: string, value: unknown, ttl: number): Promise<boolean> {
    const exists = await this.driver.has(key)
    if (exists) return false
    await this.driver.set(key, value, ttl)
    return true
  }

  statistics(): CacheStats {
    return this.driver.statistics()
  }
}
