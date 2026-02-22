import { runRegistryAudit } from './registry-audit'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function main(): void {
  const full = runRegistryAudit({ includeCoverageWarnings: true })
  const focused = runRegistryAudit({ includeCoverageWarnings: false })

  const fullMessages = full.issues.map((issue) => issue.message)
  const focusedMessages = focused.issues.map((issue) => issue.message)

  const hasClassCoverageWarning = fullMessages.some((message) =>
    message.startsWith('IDs missing class implementations:')
  )
  const hasComponentCoverageWarning = fullMessages.some((message) =>
    message.startsWith('IDs missing component implementations:')
  )

  assert(hasClassCoverageWarning, 'Expected full audit to include class coverage warning')
  assert(hasComponentCoverageWarning, 'Expected full audit to include component coverage warning')

  const focusedHasClassCoverageWarning = focusedMessages.some((message) =>
    message.startsWith('IDs missing class implementations:')
  )
  const focusedHasComponentCoverageWarning = focusedMessages.some((message) =>
    message.startsWith('IDs missing component implementations:')
  )

  assert(!focusedHasClassCoverageWarning, 'Focused audit should omit class coverage warning')
  assert(!focusedHasComponentCoverageWarning, 'Focused audit should omit component coverage warning')

  const fullHasCompositeWarning = fullMessages.some((message) =>
    message.startsWith('Spec units reference composite specs')
  )
  const focusedHasCompositeWarning = focusedMessages.some((message) =>
    message.startsWith('Spec units reference composite specs')
  )

  assert(fullHasCompositeWarning, 'Expected full audit to include composite spec warning')
  assert(focusedHasCompositeWarning, 'Expected focused audit to retain composite spec warning')

  const fullErrorCount = full.issues.filter((issue) => issue.level === 'error').length
  const focusedErrorCount = focused.issues.filter((issue) => issue.level === 'error').length
  const fullWarnCount = full.issues.filter((issue) => issue.level === 'warn').length
  const focusedWarnCount = focused.issues.filter((issue) => issue.level === 'warn').length

  assert(fullErrorCount === focusedErrorCount, 'Focused audit must not alter error counts')
  assert(fullWarnCount >= focusedWarnCount, 'Focused audit should not increase warning counts')

  const fullHasSpecExportWarning = fullMessages.some((message) =>
    message.startsWith('Spec IDs not exported from _ids.ts:')
  )
  const focusedHasSpecExportWarning = focusedMessages.some((message) =>
    message.startsWith('Spec IDs not exported from _ids.ts:')
  )

  assert(
    fullHasSpecExportWarning === focusedHasSpecExportWarning,
    'Focused audit should preserve spec-export warning behavior'
  )

  console.log('Registry audit option checks passed.')
}

main()
