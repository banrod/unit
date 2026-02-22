import * as fs from 'fs'
import * as path from 'path'

import { runRegistryAudit } from './registry-audit'

function writeMarkdownReport(lines: string[]): void {
  const reportPath = path.join(process.cwd(), 'workstation', 'notes', 'registry-report.md')
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`)
  console.log(`Registry data quality report written to ${reportPath}`)
}

function writeJsonReport(result: ReturnType<typeof runRegistryAudit>): void {
  const jsonReportPath = path.join(process.cwd(), 'workstation', 'notes', 'registry-report.json')

  const errorCount = result.issues.filter((issue) => issue.level === 'error').length
  const warningCount = result.issues.filter((issue) => issue.level === 'warn').length

  const jsonReport = {
    schemaVersion: 1,
    generatedAt: result.generatedAt,
    counts: {
      idExports: result.idValues.length,
      uniqueIdExports: result.idSet.size,
      classImplementations: result.classIds.size,
      componentImplementations: result.componentIds.size,
      specs: result.specEntries.length,
      specUnits: result.unitCount,
    },
    coverage: {
      idsWithClasses: {
        matched: result.idValues.length - result.idsMissingClass.length,
        total: result.idValues.length,
      },
      idsWithComponents: {
        matched: result.idValues.length - result.idsMissingComponent.length,
        total: result.idValues.length,
      },
      specsPresentInIds: {
        matched: result.specEntries.length - result.specsMissingFromIds.length,
        total: result.specEntries.length,
      },
    },
    issueSummary: {
      errors: errorCount,
      warnings: warningCount,
    },
    issues: result.issues,
  }

  fs.writeFileSync(jsonReportPath, `${JSON.stringify(jsonReport, null, 2)}\n`)
  console.log(`Registry data quality JSON report written to ${jsonReportPath}`)
}

function main(): void {
  const result = runRegistryAudit()

  const lines = [
    '# Registry Data Quality Report',
    '',
    `Generated: ${result.generatedAt}`,
    '',
    '## Counts',
    `- ID exports: ${result.idValues.length} (unique: ${result.idSet.size})`,
    `- Class implementations: ${result.classIds.size}`,
    `- Component implementations: ${result.componentIds.size}`,
    `- Specs: ${result.specEntries.length}`,
    `- Spec units: ${result.unitCount}`,
    '',
    '## Coverage Snapshots',
    `- IDs with classes: ${result.idValues.length - result.idsMissingClass.length}/${result.idValues.length}`,
    `- IDs with components: ${result.idValues.length - result.idsMissingComponent.length}/${result.idValues.length}`,
    `- Specs present in _ids.ts: ${result.specEntries.length - result.specsMissingFromIds.length}/${result.specEntries.length}`,
    '',
    '## Issues',
  ]

  if (result.issues.length === 0) {
    lines.push('- None detected.')
  } else {
    for (const issue of result.issues) {
      const bullet = issue.level === 'error' ? 'ERROR' : 'WARN'
      const countLabel = issue.count !== undefined ? ` (count: ${issue.count})` : ''
      lines.push(`- ${bullet}${countLabel}: ${issue.message}`)
    }
  }

  writeMarkdownReport(lines)
  writeJsonReport(result)
}

main()
