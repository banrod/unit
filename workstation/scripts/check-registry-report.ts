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


function parseMdCount(lines: string[], label: string): number {
  const line = lines.find((entry) => entry.startsWith(`- ${label}:`))
  if (!line) {
    throw new Error(`Markdown report missing count line for ${label}`)
  }

  const match = line.match(/: (\d+)/)
  if (!match) {
    throw new Error(`Could not parse numeric count for ${label}`)
  }

  return Number(match[1])
}


function parseTopCompositeLines(lines: string[]): string[] {
  const headingIndex = lines.findIndex((entry) => entry.trim() === '## Top Composite Spec References')
  if (headingIndex === -1) {
    throw new Error('Markdown report missing "Top Composite Spec References" section')
  }

  const output: string[] = []
  for (const line of lines.slice(headingIndex + 1)) {
    const trimmed = line.trim()

    if (trimmed === '') {
      if (output.length > 0) {
        break
      }
      continue
    }

    if (!trimmed.startsWith('- ')) {
      break
    }

    output.push(trimmed.slice(2))
  }

  return output
}

function parseMdCoverage(lines: string[], label: string): { matched: number; total: number } {
  const line = lines.find((entry) => entry.startsWith(`- ${label}:`))
  if (!line) {
    throw new Error(`Markdown report missing coverage line for ${label}`)
  }

  const match = line.match(/: (\d+)\/(\d+)/)
  if (!match) {
    throw new Error(`Could not parse coverage ratio for ${label}`)
  }

  return {
    matched: Number(match[1]),
    total: Number(match[2]),
  }
}

function main(): void {
  const reportPath = path.join(process.cwd(), 'workstation', 'notes', 'registry-report.json')
  const markdownReportPath = path.join(process.cwd(), 'workstation', 'notes', 'registry-report.md')

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as RegistryReport
  const markdownLines = fs.readFileSync(markdownReportPath, 'utf8').split(/\r?\n/)

  assert(report.schemaVersion === 2, 'schemaVersion must be 2')
  assert(typeof report.generatedAt === 'string' && report.generatedAt.length > 0, 'generatedAt must be a non-empty string')

  assert(report.counts.idExports >= report.counts.uniqueIdExports, 'idExports must be >= uniqueIdExports')
  assert(report.coverage.idsWithClasses.matched <= report.coverage.idsWithClasses.total, 'idsWithClasses matched must be <= total')
  assert(report.coverage.idsWithComponents.matched <= report.coverage.idsWithComponents.total, 'idsWithComponents matched must be <= total')
  assert(report.coverage.specsPresentInIds.matched <= report.coverage.specsPresentInIds.total, 'specsPresentInIds matched must be <= total')

  const mdIdExports = parseMdCount(markdownLines, 'ID exports')
  const mdClassImplementations = parseMdCount(markdownLines, 'Class implementations')
  const mdComponentImplementations = parseMdCount(markdownLines, 'Component implementations')
  const mdSpecs = parseMdCount(markdownLines, 'Specs')
  const mdSpecUnits = parseMdCount(markdownLines, 'Spec units')

  assert(mdIdExports === report.counts.idExports, 'Markdown and JSON idExports counts must match')
  assert(
    mdClassImplementations === report.counts.classImplementations,
    'Markdown and JSON class implementation counts must match'
  )
  assert(
    mdComponentImplementations === report.counts.componentImplementations,
    'Markdown and JSON component implementation counts must match'
  )
  assert(mdSpecs === report.counts.specs, 'Markdown and JSON specs counts must match')
  assert(mdSpecUnits === report.counts.specUnits, 'Markdown and JSON spec units counts must match')

  const mdIdsWithClasses = parseMdCoverage(markdownLines, 'IDs with classes')
  const mdIdsWithComponents = parseMdCoverage(markdownLines, 'IDs with components')
  const mdSpecsPresentInIds = parseMdCoverage(markdownLines, 'Specs present in _ids.ts')

  assert(
    mdIdsWithClasses.matched === report.coverage.idsWithClasses.matched &&
      mdIdsWithClasses.total === report.coverage.idsWithClasses.total,
    'Markdown and JSON idsWithClasses coverage must match'
  )
  assert(
    mdIdsWithComponents.matched === report.coverage.idsWithComponents.matched &&
      mdIdsWithComponents.total === report.coverage.idsWithComponents.total,
    'Markdown and JSON idsWithComponents coverage must match'
  )
  assert(
    mdSpecsPresentInIds.matched === report.coverage.specsPresentInIds.matched &&
      mdSpecsPresentInIds.total === report.coverage.specsPresentInIds.total,
    'Markdown and JSON specsPresentInIds coverage must match'
  )

  const errorIssues = report.issues.filter((issue) => issue.level === 'error').length
  const warningIssues = report.issues.filter((issue) => issue.level === 'warn').length
  assert(report.issueSummary.errors === errorIssues, 'issueSummary.errors must match issues array')
  assert(report.issueSummary.warnings === warningIssues, 'issueSummary.warnings must match issues array')

  assertPreview(report.gaps.idsMissingClass, 'gaps.idsMissingClass')
  assertPreview(report.gaps.idsMissingComponent, 'gaps.idsMissingComponent')
  assertPreview(report.gaps.specsMissingFromIds, 'gaps.specsMissingFromIds')
  assertPreview(report.gaps.unresolvedUnitRefs, 'gaps.unresolvedUnitRefs')
  assertPreview(report.gaps.compositeSpecRefs, 'gaps.compositeSpecRefs')


  const topCompositeLines = parseTopCompositeLines(markdownLines)
  const expectedTopComposite = report.gaps.compositeSpecRefs.preview
    .slice(0, 10)
    .map((entry) => {
      const displayName = entry.names.length > 0 ? entry.names.join('|') : entry.id
      return `${displayName} (${entry.id}) ×${entry.count}`
    })

  if (report.gaps.compositeSpecRefs.total === 0) {
    assert(topCompositeLines.length === 1 && topCompositeLines[0] === 'None detected.', 'Markdown top composite section should report none detected when total is zero')
  } else {
    assert(
      topCompositeLines.length === expectedTopComposite.length,
      'Markdown top composite section length must match JSON preview slice length'
    )
    for (let i = 0; i < expectedTopComposite.length; i++) {
      assert(
        topCompositeLines[i] === expectedTopComposite[i],
        `Markdown top composite entry mismatch at index ${i}`
      )
    }
  }

  for (const entry of report.gaps.unresolvedUnitRefs.preview.concat(report.gaps.compositeSpecRefs.preview)) {
    assert(typeof entry.id === 'string' && entry.id.length > 0, 'gap preview entry id must be a non-empty string')
    assert(Array.isArray(entry.names), 'gap preview entry names must be an array')
    assert(Number.isInteger(entry.count) && entry.count > 0, 'gap preview entry count must be a positive integer')
  }

  console.log('Registry report schema checks passed.')
}

main()
