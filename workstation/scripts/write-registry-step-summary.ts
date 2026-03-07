import * as fs from 'fs'
import * as path from 'path'

type CoverageMetric = {
  matched: number
  total: number
}

type CompositeRef = {
  id: string
  names?: string[]
  count: number
}

type RegistryReport = {
  generatedAt: string
  issueSummary: {
    errors: number
    warnings: number
  }
  counts: {
    idExports: number
    uniqueIdExports: number
    classImplementations: number
    componentImplementations: number
    specs: number
    specUnits: number
  }
  coverage: {
    idsWithClasses: CoverageMetric
    idsWithComponents: CoverageMetric
    specsPresentInIds: CoverageMetric
  }
  gaps?: {
    compositeSpecRefs?: {
      preview?: CompositeRef[]
    }
  }
}

const DEFAULT_REPORT_PATH = path.join(process.cwd(), 'workstation', 'notes', 'registry-report.json')

function formatCoverage(label: string, metric: CoverageMetric): string {
  return `| ${label} | ${metric.matched}/${metric.total} |`
}

function describeCompositeRef(ref: CompositeRef): string {
  const namePrefix = ref.names && ref.names.length > 0 ? `${ref.names.join('|')} ` : ''
  return `- ${namePrefix}(${ref.id}) ×${ref.count}`
}

function buildSummary(report: RegistryReport): string {
  const lines = [
    '## Registry Data Quality Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Issue summary: **${report.issueSummary.errors} errors**, **${report.issueSummary.warnings} warnings**`,
    '',
    '### Counts',
    '| Metric | Value |',
    '| --- | ---: |',
    `| ID exports (unique) | ${report.counts.idExports} (${report.counts.uniqueIdExports}) |`,
    `| Class implementations | ${report.counts.classImplementations} |`,
    `| Component implementations | ${report.counts.componentImplementations} |`,
    `| Specs | ${report.counts.specs} |`,
    `| Spec units | ${report.counts.specUnits} |`,
    '',
    '### Coverage',
    '| Metric | Coverage |',
    '| --- | ---: |',
    formatCoverage('IDs with classes', report.coverage.idsWithClasses),
    formatCoverage('IDs with components', report.coverage.idsWithComponents),
    formatCoverage('Specs present in _ids.ts', report.coverage.specsPresentInIds),
  ]

  const compositeRefs = report.gaps?.compositeSpecRefs?.preview ?? []
  if (compositeRefs.length > 0) {
    lines.push('', '### Top Composite Spec References (preview)')
    for (const ref of compositeRefs.slice(0, 5)) {
      lines.push(describeCompositeRef(ref))
    }
  }

  return `${lines.join('\n')}\n`
}

function main(): void {
  const reportPath = process.env.REGISTRY_REPORT_JSON_PATH ?? DEFAULT_REPORT_PATH
  const summaryPath = process.env.GITHUB_STEP_SUMMARY

  if (!summaryPath) {
    throw new Error('GITHUB_STEP_SUMMARY is not set.')
  }

  if (!fs.existsSync(reportPath)) {
    fs.appendFileSync(summaryPath, '## Registry Data Quality Report\n\nRegistry report not generated.\n')
    return
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as RegistryReport
  fs.appendFileSync(summaryPath, buildSummary(report))
}

main()
