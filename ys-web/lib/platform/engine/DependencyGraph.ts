export interface Dependency {
  moduleId: string
  version?: string
  optional?: boolean
}

export interface ValidationError {
  type: 'missing' | 'circular' | 'version_mismatch' | 'disabled_required'
  message: string
  source: string
  target?: string
}

export interface GraphNode {
  id: string
  version?: string
  enabled: boolean
  dependencies: Dependency[]
}

export class DependencyGraph {
  private nodes = new Map<string, GraphNode>()
  private dependentIndex = new Map<string, Set<string>>()

  private rebuildDependentIndex(): void {
    this.dependentIndex.clear()
    for (const [nodeId, node] of this.nodes) {
      for (const dep of node.dependencies) {
        if (!this.dependentIndex.has(dep.moduleId)) {
          this.dependentIndex.set(dep.moduleId, new Set())
        }
        this.dependentIndex.get(dep.moduleId)!.add(nodeId)
      }
    }
  }

  addNode(id: string, dependencies: Dependency[], enabled = true, version?: string): void {
    this.nodes.set(id, { id, version, enabled, dependencies })
    this.rebuildDependentIndex()
  }

  removeNode(id: string): void {
    this.nodes.delete(id)
    this.rebuildDependentIndex()
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id)
  }

  getDependencies(id: string): Dependency[] {
    return this.nodes.get(id)?.dependencies ?? []
  }

  getDependents(id: string): string[] {
    return Array.from(this.dependentIndex.get(id) ?? [])
  }

  getLeafNodes(): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.dependencies.length === 0)
  }

  getRootNodes(): GraphNode[] {
    const allDeps = new Set<string>()
    for (const node of this.nodes.values()) {
      for (const dep of node.dependencies) {
        allDeps.add(dep.moduleId)
      }
    }
    return Array.from(this.nodes.values()).filter(n => !allDeps.has(n.id))
  }

  getTopologicalOrder(): string[] {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const order: string[] = []

    const visit = (id: string): boolean => {
      if (visiting.has(id)) return false
      if (visited.has(id)) return true

      visiting.add(id)
      const node = this.nodes.get(id)
      if (node) {
        for (const dep of node.dependencies) {
          if (!visit(dep.moduleId)) return false
        }
      }
      visiting.delete(id)
      visited.add(id)
      order.push(id)
      return true
    }

    for (const id of this.nodes.keys()) {
      if (!visited.has(id)) {
        visit(id)
      }
    }

    return order
  }

  validate(): ValidationError[] {
    const errors: ValidationError[] = []

    const visited = new Set<string>()
    const inStack = new Set<string>()

    const detectCycle = (id: string, path: string[]): boolean => {
      if (inStack.has(id)) {
        const loop = [...path.slice(path.indexOf(id)), id].join(' -> ')
        errors.push({
          type: 'circular',
          message: `Circular dependency detected: ${loop}`,
          source: id,
          target: path[path.length - 1],
        })
        return true
      }
      if (visited.has(id)) return false

      visited.add(id)
      inStack.add(id)
      path.push(id)

      const node = this.nodes.get(id)
      if (node) {
        for (const dep of node.dependencies) {
          if (detectCycle(dep.moduleId, path)) return true
        }
      }

      path.pop()
      inStack.delete(id)
      return false
    }

    for (const id of this.nodes.keys()) {
      detectCycle(id, [])
    }

    for (const [id, node] of this.nodes) {
      for (const dep of node.dependencies) {
        const depNode = this.nodes.get(dep.moduleId)
        if (!depNode) {
          errors.push({
            type: 'missing',
            message: `Module "${id}" depends on "${dep.moduleId}" which is not registered`,
            source: id,
            target: dep.moduleId,
          })
          continue
        }

        if (dep.version && depNode.version && dep.version !== depNode.version) {
          errors.push({
            type: 'version_mismatch',
            message: `Module "${id}" requires ${dep.moduleId}@${dep.version} but installed is ${depNode.version}`,
            source: id,
            target: dep.moduleId,
          })
        }

        if (!dep.optional && !depNode.enabled) {
          errors.push({
            type: 'disabled_required',
            message: `Module "${id}" requires "${dep.moduleId}" which is disabled`,
            source: id,
            target: dep.moduleId,
          })
        }
      }
    }

    return errors
  }

  canEnable(id: string): { allowed: boolean; reason?: string } {
    const node = this.nodes.get(id)
    if (!node) return { allowed: false, reason: 'Module not registered' }

    const errors = this.validate()
    const relevant = errors.filter(e => e.source === id && e.type !== 'circular')
    if (relevant.length > 0) {
      return { allowed: false, reason: relevant[0].message }
    }

    const deps = node.dependencies.filter(d => !d.optional)
    for (const dep of deps) {
      const depNode = this.nodes.get(dep.moduleId)
      if (!depNode || !depNode.enabled) {
        return { allowed: false, reason: `Required dependency "${dep.moduleId}" is not enabled` }
      }
    }

    return { allowed: true }
  }

  getNodeCount(): number {
    return this.nodes.size
  }

  clear(): void {
    this.nodes.clear()
    this.dependentIndex.clear()
  }
}
