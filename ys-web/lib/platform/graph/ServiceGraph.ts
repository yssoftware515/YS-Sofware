import type { ModuleKernel } from '../kernel/ModuleKernel'

export interface ServiceNode {
  id: string
  type: 'service' | 'driver' | 'registry' | 'command' | 'query'
  dependencies: string[]
  dependents: string[]
  shared: boolean
}

export interface ServiceGraphData {
  nodes: ServiceNode[]
  edges: Array<{ from: string; to: string; type: string }>
  singletonCount: number
  totalCount: number
  missingServices: string[]
  duplicateRegistrations: string[]
}

export class ServiceGraph {
  private kernel: ModuleKernel

  constructor(kernel: ModuleKernel) {
    this.kernel = kernel
  }

  build(): ServiceGraphData {
    const container = this.kernel.getContainer()
    const serviceIds = container.getRegisteredIds()
    const nodes: ServiceNode[] = []
    const edges: ServiceGraphData['edges'] = []

    for (const id of serviceIds) {
      const hasService = container.has(id)
      nodes.push({
        id,
        type: 'service',
        dependencies: [],
        dependents: [],
        shared: true,
      })
    }

    const commandBus = container.has('commandBus') ? container.resolve<any>('commandBus') : null
    const queryBus = container.has('queryBus') ? container.resolve<any>('queryBus') : null

    if (commandBus) {
      for (const type of commandBus.getRegisteredTypes()) {
        nodes.push({ id: `cmd:${type}`, type: 'command', dependencies: [], dependents: [], shared: false })
        edges.push({ from: `cmd:${type}`, to: 'commandBus', type: 'registered_on' })
      }
    }

    if (queryBus) {
      for (const type of queryBus.getRegisteredTypes()) {
        nodes.push({ id: `qry:${type}`, type: 'query', dependencies: [], dependents: [], shared: false })
        edges.push({ from: `qry:${type}`, to: 'queryBus', type: 'registered_on' })
      }
    }

    return {
      nodes,
      edges,
      singletonCount: nodes.filter(n => n.shared).length,
      totalCount: nodes.length,
      missingServices: [],
      duplicateRegistrations: [],
    }
  }
}
