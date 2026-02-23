import { runRegistryAudit } from './registry-audit'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function hasMessage(messages: string[], prefix: string): boolean {
  return messages.some((message) => message.startsWith(prefix))
}

function main(): void {
  const full = runRegistryAudit({ includeCoverageWarnings: true })
  const focused = runRegistryAudit({ includeCoverageWarnings: false })

  const fullMessages = full.issues.map((issue) => issue.message)
  const focusedMessages = focused.issues.map((issue) => issue.message)

  const hasClassCoverageWarning = hasMessage(fullMessages, 'IDs missing class implementations:')
  const hasComponentCoverageWarning = hasMessage(fullMessages, 'IDs missing component implementations:')

  assert(
    hasClassCoverageWarning === (full.idsMissingClass.length > 0),
    'Full audit class-coverage warning should match idsMissingClass presence'
  )
  assert(
    hasComponentCoverageWarning === (full.idsMissingComponent.length > 0),
    'Full audit component-coverage warning should match idsMissingComponent presence'
  )

  const focusedHasClassCoverageWarning = hasMessage(
    focusedMessages,
    'IDs missing class implementations:'
  )
  const focusedHasComponentCoverageWarning = hasMessage(
    focusedMessages,
    'IDs missing component implementations:'
  )

  assert(!focusedHasClassCoverageWarning, 'Focused audit should omit class coverage warning')
  assert(!focusedHasComponentCoverageWarning, 'Focused audit should omit component coverage warning')

  const fullHasCompositeWarning = hasMessage(fullMessages, 'Spec units reference composite specs')
  const focusedHasCompositeWarning = hasMessage(
    focusedMessages,
    'Spec units reference composite specs'
  )

  assert(
    fullHasCompositeWarning === (full.compositeSpecRefUniqueCount > 0),
    'Full audit composite warning should match compositeSpecRefUniqueCount presence'
  )
  assert(
    focusedHasCompositeWarning === (focused.compositeSpecRefUniqueCount > 0),
    'Focused audit should preserve composite warning behavior'
  )

  const fullErrorCount = full.issues.filter((issue) => issue.level === 'error').length
  const focusedErrorCount = focused.issues.filter((issue) => issue.level === 'error').length
  const fullWarnCount = full.issues.filter((issue) => issue.level === 'warn').length
  const focusedWarnCount = focused.issues.filter((issue) => issue.level === 'warn').length

  assert(fullErrorCount === focusedErrorCount, 'Focused audit must not alter error counts')
  assert(fullWarnCount >= focusedWarnCount, 'Focused audit should not increase warning counts')

  const fullHasSpecExportWarning = hasMessage(fullMessages, 'Spec IDs not exported from _ids.ts:')
  const focusedHasSpecExportWarning = hasMessage(
    focusedMessages,
    'Spec IDs not exported from _ids.ts:'
  )

  assert(
    fullHasSpecExportWarning === focusedHasSpecExportWarning,
    'Focused audit should preserve spec-export warning behavior'
  )

  console.log('Registry audit option checks passed.')
}

main()
