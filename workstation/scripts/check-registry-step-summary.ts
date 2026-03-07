import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { spawnSync } from 'child_process'

type RegistryReport = {
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
    idsWithClasses: { matched: number; total: number }
    idsWithComponents: { matched: number; total: number }
    specsPresentInIds: { matched: number; total: number }
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function runWriter(summaryPath: string, reportPath?: string): void {
  const cwd = process.cwd()
  const command = spawnSync(
    process.execPath,
    [
      require.resolve('ts-node/dist/bin.js'),
      '-T',
      path.join(cwd, 'workstation', 'scripts', 'write-registry-step-summary.ts'),
    ],
    {
      cwd,
      env: {
        ...process.env,
        GITHUB_STEP_SUMMARY: summaryPath,
        ...(reportPath ? { REGISTRY_REPORT_JSON_PATH: reportPath } : {}),
      },
      encoding: 'utf8',
    }
  )

  assert(command.status === 0, `step summary script failed: ${command.stderr || command.stdout}`)
}

function main(): void {
  const cwd = process.cwd()
  const reportPath = path.join(cwd, 'workstation', 'notes', 'registry-report.json')
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as RegistryReport

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-summary-'))

  try {
    const summaryPath = path.join(tempDir, 'summary.md')
    runWriter(summaryPath)

    assert(fs.existsSync(summaryPath), 'summary output file was not created')

    const summary = fs.readFileSync(summaryPath, 'utf8')

    assert(summary.includes('## Registry Data Quality Report'), 'summary missing title')
    assert(
      summary.includes(`Issue summary: **${report.issueSummary.errors} errors**, **${report.issueSummary.warnings} warnings**`),
      'summary issue totals do not match JSON report'
    )
    assert(
      summary.includes(`| ID exports (unique) | ${report.counts.idExports} (${report.counts.uniqueIdExports}) |`),
      'summary id export count row does not match JSON report'
    )
    assert(
      summary.includes(`| IDs with classes | ${report.coverage.idsWithClasses.matched}/${report.coverage.idsWithClasses.total} |`),
      'summary class coverage row does not match JSON report'
    )
    assert(
      summary.includes(
        `| Specs present in _ids.ts | ${report.coverage.specsPresentInIds.matched}/${report.coverage.specsPresentInIds.total} |`
      ),
      'summary spec coverage row does not match JSON report'
    )

    const missingReportSummaryPath = path.join(tempDir, 'summary-missing-report.md')
    const missingReportPath = path.join(tempDir, 'missing-registry-report.json')
    runWriter(missingReportSummaryPath, missingReportPath)

    const missingSummary = fs.readFileSync(missingReportSummaryPath, 'utf8')
    assert(
      missingSummary.includes('Registry report not generated.'),
      'missing report fallback message not written to summary'
    )

    const invalidReportSummaryPath = path.join(tempDir, 'summary-invalid-report.md')
    const invalidReportPath = path.join(tempDir, 'invalid-registry-report.json')
    fs.writeFileSync(invalidReportPath, '{not valid json')
    runWriter(invalidReportSummaryPath, invalidReportPath)

    const invalidSummary = fs.readFileSync(invalidReportSummaryPath, 'utf8')
    assert(
      invalidSummary.includes(`Registry report could not be read: ${invalidReportPath}`),
      'invalid report parse fallback message not written to summary'
    )

    const schemaMismatchSummaryPath = path.join(tempDir, 'summary-schema-mismatch.md')
    const schemaMismatchReportPath = path.join(tempDir, 'schema-mismatch-registry-report.json')
    fs.writeFileSync(
      schemaMismatchReportPath,
      JSON.stringify({ generatedAt: '2026-01-01T00:00:00.000Z', issueSummary: { errors: 0, warnings: 0 } })
    )
    runWriter(schemaMismatchSummaryPath, schemaMismatchReportPath)

    const schemaMismatchSummary = fs.readFileSync(schemaMismatchSummaryPath, 'utf8')
    assert(
      schemaMismatchSummary.includes(`Registry report is invalid (schema mismatch): ${schemaMismatchReportPath}`),
      'schema mismatch fallback message not written to summary'
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }

  console.log('Registry step summary checks passed.')
}

main()
