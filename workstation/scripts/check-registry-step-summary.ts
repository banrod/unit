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

function main(): void {
  const cwd = process.cwd()
  const reportPath = path.join(cwd, 'workstation', 'notes', 'registry-report.json')

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as RegistryReport

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-summary-'))
  const summaryPath = path.join(tempDir, 'summary.md')

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
      },
      encoding: 'utf8',
    }
  )

  assert(command.status === 0, `step summary script failed: ${command.stderr || command.stdout}`)
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

  console.log('Registry step summary checks passed.')
}

main()
