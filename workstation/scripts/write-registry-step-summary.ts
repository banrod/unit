import { DEFAULT_REPORT_PATH, writeStepSummary } from './registry-step-summary'

export function main(): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY

  if (!summaryPath) {
    throw new Error('GITHUB_STEP_SUMMARY is not set.')
  }

  const reportPath = process.env.REGISTRY_REPORT_JSON_PATH ?? DEFAULT_REPORT_PATH
  writeStepSummary(summaryPath, reportPath)
}

if (require.main === module) {
  main()
}
