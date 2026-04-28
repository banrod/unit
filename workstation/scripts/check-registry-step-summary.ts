import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {
  TITLE,
  buildSummary,
  invalidSchemaSummary,
  missingReportSummary,
  readSummaryContent,
  type RegistryReport,
  unreadableReportSummary,
  writeStepSummary,
} from './write-registry-step-summary'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function main(): void {
  const cwd = process.cwd()
  const reportPath = path.join(cwd, 'workstation', 'notes', 'registry-report.json')
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as RegistryReport

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-summary-'))

  try {
    const summaryPath = path.join(tempDir, 'summary.md')
    writeStepSummary(summaryPath, reportPath)

    assert(fs.existsSync(summaryPath), 'summary output file was not created')

    const summary = fs.readFileSync(summaryPath, 'utf8')
    const expectedSummary = buildSummary(report)

    assert(summary === expectedSummary, 'summary output should exactly match the expected rendered summary')
    assert(summary.includes(TITLE), 'summary missing title')
    assert(
      summary.includes(`Issue summary: **${report.issueSummary.errors} errors**, **${report.issueSummary.warnings} warnings**`),
      'summary issue totals do not match JSON report'
    )

    const missingReportPath = path.join(tempDir, 'missing-registry-report.json')
    assert(readSummaryContent(missingReportPath) === missingReportSummary(), 'missing report summary should use the fallback template')

    const invalidWarnings: string[] = []
    const invalidReportPath = path.join(tempDir, 'invalid-registry-report.json')
    fs.writeFileSync(invalidReportPath, '{not valid json')
    assert(
      readSummaryContent(invalidReportPath, { onWarning: (message) => invalidWarnings.push(message) }) ===
        unreadableReportSummary(invalidReportPath),
      'invalid report summary should use the unreadable-report template'
    )
    assert(invalidWarnings.length === 1, 'invalid report should emit exactly one warning')
    assert(
      invalidWarnings[0].includes(`Registry report read failed for ${invalidReportPath}:`),
      'invalid report warning should mention the unreadable report path'
    )

    const schemaMismatchReportPath = path.join(tempDir, 'schema-mismatch-registry-report.json')
    fs.writeFileSync(
      schemaMismatchReportPath,
      JSON.stringify({ generatedAt: '2026-01-01T00:00:00.000Z', issueSummary: { errors: 0, warnings: 0 } })
    )
    assert(
      readSummaryContent(schemaMismatchReportPath) === invalidSchemaSummary(schemaMismatchReportPath),
      'schema mismatch summary should use the invalid-schema template'
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  console.log('Registry step summary checks passed.')
}

main()
