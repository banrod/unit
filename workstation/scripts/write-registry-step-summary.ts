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

const TITLE = '## Registry Data Quality Report'
const DEFAULT_REPORT_PATH = path.join(process.cwd(), 'workstation', 'notes', 'registry-report.json')

function formatCoverage(label: string, metric: CoverageMetric): string {
  return `| ${label} | ${metric.matched}/${metric.total} |`
}

function describeCompositeRef(ref: CompositeRef): string {
  const namePrefix = ref.names && ref.names.length > 0 ? `${ref.names.join('|')} ` : ''
  return `- ${namePrefix}(${ref.id}) ×${ref.count}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCoverageMetric(value: unknown): value is CoverageMetric {
  if (!isObject(value)) {
    return false
  }

  const { matched, total } = value
  return (
    Number.isInteger(matched) &&
    (matched as number) >= 0 &&
    Number.isInteger(total) &&
    (total as number) >= 0 &&
    (matched as number) <= (total as number)
  )
}

function isRegistryReport(value: unknown): value is RegistryReport {
  if (!isObject(value)) {
    return false
  }

  if (typeof value.generatedAt !== 'string') {
    return false
  }

  if (!isObject(value.issueSummary) || !Number.isInteger(value.issueSummary.errors) || !Number.isInteger(value.issueSummary.warnings)) {
    return false
  }

  if (
    !isObject(value.counts) ||
    !Number.isInteger(value.counts.idExports) ||
    !Number.isInteger(value.counts.uniqueIdExports) ||
    !Number.isInteger(value.counts.classImplementations) ||
    !Number.isInteger(value.counts.componentImplementations) ||
    !Number.isInteger(value.counts.specs) ||
    !Number.isInteger(value.counts.specUnits)
  ) {
    return false
  }

  if (!isObject(value.coverage)) {
    return false
  }

  return (
    isCoverageMetric(value.coverage.idsWithClasses) &&
    isCoverageMetric(value.coverage.idsWithComponents) &&
    isCoverageMetric(value.coverage.specsPresentInIds)
  )
}

function buildSummary(report: RegistryReport): string {
  const lines = [
    TITLE,
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

function appendSummary(summaryPath: string, lines: string[]): void {
  fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`)
}

function main(): void {
  const reportPath = process.env.REGISTRY_REPORT_JSON_PATH ?? DEFAULT_REPORT_PATH
  const summaryPath = process.env.GITHUB_STEP_SUMMARY

  if (!summaryPath) {
    throw new Error('GITHUB_STEP_SUMMARY is not set.')
  }

  if (!fs.existsSync(reportPath)) {
    appendSummary(summaryPath, [TITLE, '', 'Registry report not generated.'])
    return
  }

  try {
    const parsedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as unknown

    if (!isRegistryReport(parsedReport)) {
      appendSummary(summaryPath, [TITLE, '', `Registry report is invalid (schema mismatch): ${reportPath}`])
      return
    }

    fs.appendFileSync(summaryPath, buildSummary(parsedReport))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Registry report read failed for ${reportPath}: ${message}`)
    appendSummary(summaryPath, [TITLE, '', `Registry report could not be read: ${reportPath}`])
  }
}

main()
