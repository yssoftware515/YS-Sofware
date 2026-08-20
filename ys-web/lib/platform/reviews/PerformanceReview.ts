import type { PerformanceCenter } from '../performance/PerformanceCenter'
import type { MonitoringCenter } from '../monitoring/MonitoringCenter'
import type { Logger } from '../services/Logger'
import type { PlatformConfig } from '../services/PlatformConfig'

export interface PerformanceFinding {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  recommendation: string
  metric?: { current: number; target: number; unit: string }
}

export class PerformanceReview {
  private logger: Logger
  private performanceCenter: PerformanceCenter
  private monitoringCenter: MonitoringCenter
  private config: PlatformConfig

  constructor(logger: Logger, performanceCenter: PerformanceCenter, monitoringCenter: MonitoringCenter, config: PlatformConfig) {
    this.logger = logger
    this.performanceCenter = performanceCenter
    this.monitoringCenter = monitoringCenter
    this.config = config
  }

  run(): PerformanceFinding[] {
    const findings: PerformanceFinding[] = []

    findings.push(...this.reviewCache())
    findings.push(...this.reviewBundle())
    findings.push(...this.reviewCdn())
    findings.push(...this.reviewMetrics())

    this.logger.info('PerformanceReview', `Review complete: ${findings.length} findings`)
    return findings
  }

  private reviewCache(): PerformanceFinding[] {
    const findings: PerformanceFinding[] = []
    const rules = this.performanceCenter.getCacheRules()

    if (rules.length === 0) {
      findings.push({
        category: 'Cache',
        severity: 'high',
        title: 'No cache rules configured',
        description: 'Response caching is not configured for any endpoint',
        recommendation: 'Add cache rules for frequently accessed endpoints',
      })
    }

    const stats = this.performanceCenter.getStats()
    if (stats.cachedFragments === 0) {
      findings.push({
        category: 'Cache',
        severity: 'medium',
        title: 'Fragment cache is empty',
        description: 'No fragments are currently cached',
        recommendation: 'Implement fragment caching for expensive view components',
      })
    }

    return findings
  }

  private reviewBundle(): PerformanceFinding[] {
    const findings: PerformanceFinding[] = []

    findings.push({
      category: 'Bundle',
      severity: 'info',
      title: 'Bundle size should be monitored',
      description: 'Track JavaScript bundle size to prevent bloat',
      recommendation: 'Run next-bundle-analyzer in CI and set size budgets',
    })

    return findings
  }

  private reviewCdn(): PerformanceFinding[] {
    const findings: PerformanceFinding[] = []
    const endpoints = this.performanceCenter.getCdnEndpoints()

    if (endpoints.length === 0) {
      findings.push({
        category: 'CDN',
        severity: 'low',
        title: 'No CDN endpoints configured',
        description: 'Content delivery network is not set up',
        recommendation: 'Configure CDN for static assets and media files',
      })
    }

    return findings
  }

  private reviewMetrics(): PerformanceFinding[] {
    const findings: PerformanceFinding[] = []
    const names = this.monitoringCenter.getMetricNames()

    if (names.length === 0) {
      findings.push({
        category: 'Metrics',
        severity: 'medium',
        title: 'No performance metrics collected',
        description: 'MonitoringCenter has no metric data points',
        recommendation: 'Ensure HTTP and system metrics are being recorded',
      })
    }

    const httpDuration = this.monitoringCenter.getSeries('http.duration')
    if (httpDuration && httpDuration.avg > 500) {
      findings.push({
        category: 'Response Time',
        severity: 'high',
        title: 'High average response time',
        description: `Average HTTP duration is ${httpDuration.avg.toFixed(0)}ms`,
        recommendation: 'Investigate slow endpoint performance and database queries',
        metric: { current: Math.round(httpDuration.avg), target: 200, unit: 'ms' },
      })
    }

    return findings
  }

  generateReport(findings: PerformanceFinding[]): string {
    let report = '=== PERFORMANCE REVIEW REPORT ===\n\n'
    report += `Date: ${new Date().toISOString()}\n`
    report += `Total Findings: ${findings.length}\n\n`

    const byCategory: Record<string, PerformanceFinding[]> = {}
    for (const f of findings) {
      if (!byCategory[f.category]) byCategory[f.category] = []
      byCategory[f.category].push(f)
    }

    for (const [category, items] of Object.entries(byCategory)) {
      report += `--- ${category} ---\n`
      for (const f of items) {
        report += `  [${f.severity.toUpperCase()}] ${f.title}\n`
        report += `    ${f.description}\n`
        report += `    Recommendation: ${f.recommendation}\n`
        if (f.metric) report += `    Metric: ${f.metric.current}${f.metric.unit} (target: ${f.metric.target}${f.metric.unit})\n`
      }
      report += '\n'
    }

    return report
  }
}
