import { runRegistryAudit } from './registry-audit'

function main(): void {
  const strict = process.argv.includes('--strict')
  const { issues } = runRegistryAudit({ includeCoverageWarnings: false })

  const errors = issues.filter((issue) => issue.level === 'error')
  const warnings = issues.filter((issue) => issue.level === 'warn')

  if (issues.length === 0) {
    console.log('Registry validation passed: no issues detected.')
    return
  }

  for (const issue of issues) {
    const prefix = issue.level === 'error' ? 'ERROR' : 'WARN'
    console.log(`${prefix}: ${issue.message}`)
  }

  console.log(`\nSummary: ${errors.length} error(s), ${warnings.length} warning(s).`)

  if (errors.length > 0 && strict) {
    process.exit(1)
  }

  if (errors.length > 0 && !strict) {
    console.log('Strict mode disabled; returning success despite errors.')
  }
}

main()
