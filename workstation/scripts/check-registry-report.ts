import * as fs from 'fs'
import * as path from 'path'

type PreviewList<T> = {
  total: number
  preview: T[]
}

type RegistryReport = {
  schemaVersion: number
  generatedAt: string
  counts: {
    idExports: number
    uniqueIdExports: number
    classImplementations: number
    componentImplementations: number
    specs: number
    specUnits: number
  }
  coverage: {
    idsWithClasses: { matched: number; total: number }
    idsWithComponents: { matched: number; total: number }
    specsPresentInIds: { matched: number; total: number }
  }
  issueSummary: {
    errors: number
    warnings: number
  }
  gaps: {
    idsMissingClass: PreviewList<string>
    idsMissingComponent: PreviewList<string>
    specsMissingFromIds: PreviewList<string>
    unresolvedUnitRefs: PreviewList<{ id: string; names: string[]; count: number }>
    compositeSpecRefs: PreviewList<{ id: string; names: string[]; count: number }>
  }
  issues: Array<{ level: 'error' | 'warn'; count?: number; message: string }>
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertPreview<T>(value: PreviewList<T>, label: string): void {
  assert(Number.isInteger(value.total) && value.total >= 0, `${label}.total must be a non-negative integer`)
  assert(Array.isArray(value.preview), `${label}.preview must be an array`)
  assert(value.preview.length <= 25, `${label}.preview must contain at most 25 entries`)
  assert(value.preview.length <= value.total, `${label}.preview length must be <= total`)
}

function main(): void {
  const reportPath = path.join(process.cwd(), 'workstation', 'notes', 'registry-report.json')
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as RegistryReport

  assert(report.schemaVersion === 2, 'schemaVersion must be 2')
  assert(typeof report.generatedAt === 'string' && report.generatedAt.length > 0, 'generatedAt must be a non-empty string')

  assert(report.counts.idExports >= report.counts.uniqueIdExports, 'idExports must be >= uniqueIdExports')
  assert(report.coverage.idsWithClasses.matched <= report.coverage.idsWithClasses.total, 'idsWithClasses matched must be <= total')
  assert(report.coverage.idsWithComponents.matched <= report.coverage.idsWithComponents.total, 'idsWithComponents matched must be <= total')
  assert(report.coverage.specsPresentInIds.matched <= report.coverage.specsPresentInIds.total, 'specsPresentInIds matched must be <= total')

  const errorIssues = report.issues.filter((issue) => issue.level === 'error').length
  const warningIssues = report.issues.filter((issue) => issue.level === 'warn').length
  assert(report.issueSummary.errors === errorIssues, 'issueSummary.errors must match issues array')
  assert(report.issueSummary.warnings === warningIssues, 'issueSummary.warnings must match issues array')

  assertPreview(report.gaps.idsMissingClass, 'gaps.idsMissingClass')
  assertPreview(report.gaps.idsMissingComponent, 'gaps.idsMissingComponent')
  assertPreview(report.gaps.specsMissingFromIds, 'gaps.specsMissingFromIds')
  assertPreview(report.gaps.unresolvedUnitRefs, 'gaps.unresolvedUnitRefs')
  assertPreview(report.gaps.compositeSpecRefs, 'gaps.compositeSpecRefs')

  for (const entry of report.gaps.unresolvedUnitRefs.preview.concat(report.gaps.compositeSpecRefs.preview)) {
    assert(typeof entry.id === 'string' && entry.id.length > 0, 'gap preview entry id must be a non-empty string')
    assert(Array.isArray(entry.names), 'gap preview entry names must be an array')
    assert(Number.isInteger(entry.count) && entry.count > 0, 'gap preview entry count must be a positive integer')
  }

  console.log('Registry report schema checks passed.')
}

main()
