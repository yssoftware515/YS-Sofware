interface Binding<T> {
  factory: () => T
  shared: boolean
  instance?: T
}

export class ServiceContainer {
  private bindings = new Map<string, Binding<any>>()

  register<T>(id: string, factory: () => T): void {
    this.bindings.set(id, { factory, shared: false })
  }

  singleton<T>(id: string, factory: () => T): void {
    this.bindings.set(id, { factory, shared: true })
  }

  transient<T>(id: string, factory: () => T): void {
    this.register(id, factory)
  }

  resolve<T>(id: string): T {
    const binding = this.bindings.get(id)
    if (!binding) throw new Error(`Service not registered: ${id}`)

    if (binding.shared) {
      if (!binding.instance) {
        binding.instance = binding.factory()
      }
      return binding.instance as T
    }

    return binding.factory() as T
  }

  has(id: string): boolean {
    return this.bindings.has(id)
  }

  remove(id: string): void {
    this.bindings.delete(id)
  }

  clear(): void {
    this.bindings.clear()
  }

  getRegisteredIds(): string[] {
    return Array.from(this.bindings.keys())
  }
}
