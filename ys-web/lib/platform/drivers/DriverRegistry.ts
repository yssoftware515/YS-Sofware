export type DriverCategory = 'cache' | 'storage' | 'mail' | 'search' | 'notification' | 'logger'

export interface DriverInfo {
  category: DriverCategory
  name: string
  instance: unknown
  moduleId?: string
  version?: string
  state: 'implemented' | 'mock' | 'pending' | 'unavailable' | 'deprecated'
}

export class DriverRegistry {
  private drivers = new Map<string, DriverInfo>()

  private key(category: DriverCategory, name: string): string {
    return `${category}:${name}`
  }

  register(category: DriverCategory, name: string, instance: unknown, moduleId?: string): void {
    const k = this.key(category, name)
    if (this.drivers.has(k)) throw new Error(`Driver already registered: ${k}`)
    this.drivers.set(k, {
      category, name, instance, moduleId,
      version: '1.0.0',
      state: 'implemented',
    })
  }

  replace(category: DriverCategory, name: string, instance: unknown, moduleId?: string): void {
    const k = this.key(category, name)
    this.drivers.set(k, {
      category, name, instance, moduleId,
      version: '1.0.0',
      state: 'implemented',
    })
  }

  remove(category: DriverCategory, name: string): void {
    this.drivers.delete(this.key(category, name))
  }

  get<T>(category: DriverCategory, name: string): T | undefined {
    const info = this.drivers.get(this.key(category, name))
    return info?.instance as T | undefined
  }

  getInfo(category: DriverCategory, name: string): DriverInfo | undefined {
    return this.drivers.get(this.key(category, name))
  }

  discover(category?: DriverCategory): DriverInfo[] {
    const all = Array.from(this.drivers.values())
    if (category) return all.filter(d => d.category === category)
    return all
  }

  getCategories(): DriverCategory[] {
    return [...new Set(Array.from(this.drivers.values()).map(d => d.category))]
  }

  count(): number {
    return this.drivers.size
  }

  clear(): void {
    this.drivers.clear()
  }
}
