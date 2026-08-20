import type { Release, Deployment, DeploymentStatus, DeploymentStep } from './types'

export class DeploymentCenter {
  private releases: Release[] = []
  private deployments: Deployment[] = []

  createRelease(options: {
    version: string; buildNumber: string; gitSha: string; gitBranch: string
    description: string; changelog: string; author: string; artifacts?: string[]
  }): Release {
    const release: Release = {
      id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...options,
      artifacts: options.artifacts ?? [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    this.releases.push(release)
    return release
  }

  deploy(releaseId: string, environment: string): Deployment {
    const release = this.releases.find(r => r.id === releaseId)
    if (!release) throw new Error(`Release not found: ${releaseId}`)

    const steps: DeploymentStep[] = [
      { name: 'Backup', status: 'pending' },
      { name: 'Extract', status: 'pending' },
      { name: 'Verify', status: 'pending' },
      { name: 'Migrate', status: 'pending' },
      { name: 'Activate', status: 'pending' },
    ]

    const deployment: Deployment = {
      id: `deploy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      releaseId, environment,
      status: 'deploying',
      steps,
      startedAt: new Date().toISOString(),
    }

    this.deployments.push(deployment)
    release.status = 'deploying'

    for (const step of steps) {
      step.status = 'running'
      step.startedAt = new Date().toISOString()
    }

    release.status = 'completed'
    release.deployedAt = new Date().toISOString()
    deployment.status = 'completed'
    deployment.completedAt = new Date().toISOString()
    for (const step of steps) {
      step.status = 'completed'
      step.completedAt = new Date().toISOString()
    }

    return deployment
  }

  rollback(deploymentId: string): Deployment {
    const original = this.deployments.find(d => d.id === deploymentId)
    if (!original) throw new Error(`Deployment not found: ${deploymentId}`)

    const steps: DeploymentStep[] = [
      { name: 'Restore backup', status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
      { name: 'Verify rollback', status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    ]

    const rollback: Deployment = {
      id: `deploy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      releaseId: original.releaseId,
      environment: original.environment,
      status: 'completed',
      steps,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      rollbackId: deploymentId,
    }

    this.deployments.push(rollback)
    original.status = 'rolled_back'

    const release = this.releases.find(r => r.id === original.releaseId)
    if (release) release.status = 'rolled_back'

    return rollback
  }

  getRelease(id: string): Release | undefined {
    return this.releases.find(r => r.id === id)
  }

  getReleases(environment?: string): Release[] {
    if (environment) {
      const deployReleases = this.deployments.filter(d => d.environment === environment).map(d => d.releaseId)
      return this.releases.filter(r => deployReleases.includes(r.id))
    }
    return [...this.releases]
  }

  getDeployment(id: string): Deployment | undefined {
    return this.deployments.find(d => d.id === id)
  }

  getDeployments(environment?: string): Deployment[] {
    if (environment) return this.deployments.filter(d => d.environment === environment)
    return [...this.deployments]
  }

  getStats() {
    return {
      totalReleases: this.releases.length,
      totalDeployments: this.deployments.length,
      environments: [...new Set(this.deployments.map(d => d.environment))],
      successful: this.deployments.filter(d => d.status === 'completed').length,
      failed: this.deployments.filter(d => d.status === 'failed').length,
      rolledBack: this.deployments.filter(d => d.status === 'rolled_back').length,
    }
  }

  clear(): void {
    this.releases = []
    this.deployments = []
  }
}
