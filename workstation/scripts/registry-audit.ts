import * as ids from '../../src/system/_ids'
import classes from '../../src/system/_classes'
import components from '../../src/system/_components'
import specs from '../../src/system/_specs'

export type IssueLevel = 'error' | 'warn'

export type Issue = {
  level: IssueLevel
  message: string
  count?: number
}

export type RegistryAuditOptions = {
  includeCoverageWarnings?: boolean
}

export type RegistryAuditResult = {
  generatedAt: string
  idValues: string[]
  idSet: Set<string>
  classIds: Set<string>
  componentIds: Set<string>
  specEntries: Array<[string, any]>
  unitCount: number
  idsMissingClass: string[]
  idsMissingComponent: string[]
  specsMissingFromIds: string[]
  duplicateIds: string[]
  unresolvedUnitRefFrequency: Array<[string, number]>
  compositeSpecRefFrequency: Array<[string, number]>
  unresolvedUnitRefUniqueCount: number
  compositeSpecRefUniqueCount: number
  issues: Issue[]
  idNameIndex: Record<string, string[]>
}

export const MAX_LIST_PREVIEW = 20

export function buildIdNameIndex(): Record<string, string[]> {
  const idEntries = Object.entries(ids) as Array<[string, string]>
  const index: Record<string, string[]> = {}

  for (const [name, value] of idEntries) {
    if (!index[value]) {
      index[value] = []
    }

    index[value].push(name)
  }

  return index
}

export function describeId(id: string, idNameIndex: Record<string, string[]>): string {
  const names = idNameIndex[id]
  if (!names || names.length === 0) {
    return id
  }

  return `${names.join('|')} (${id})`
}

export function describeIds(values: string[], idNameIndex: Record<string, string[]>): string[] {
  return values.map((id) => describeId(id, idNameIndex))
}

export function formatList(values: string[]): string {
  if (values.length === 0) {
    return ''
  }

  const preview = values.slice(0, MAX_LIST_PREVIEW)
  const suffix = values.length > MAX_LIST_PREVIEW ? ` …(+${values.length - MAX_LIST_PREVIEW} more)` : ''
  return `${preview.join(', ')}${suffix}`
}

export function sortByFrequency(values: string[]): Array<[string, number]> {
  return Object.entries(
    values.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1
      return acc
    }, {})
  ).sort(([, aCount], [, bCount]) => bCount - aCount)
}

export function runRegistryAudit(options: RegistryAuditOptions = {}): RegistryAuditResult {
  const { includeCoverageWarnings = true } = options

  const generatedAt = new Date().toISOString()
  const idNameIndex = buildIdNameIndex()

  const idValues = Object.values(ids)
  const idSet = new Set(idValues)
  const classIds = new Set(Object.keys(classes))
  const componentIds = new Set(Object.keys(components))
  const specEntries = Object.entries(specs as Record<string, any>)
  const specIds = new Set(specEntries.map(([id]) => id))

  const duplicateIds = Array.from(new Set(idValues.filter((id, idx) => idValues.indexOf(id) !== idx)))
  const idsMissingClass = Array.from(idSet).filter((id) => !classIds.has(id))
  const idsMissingComponent = Array.from(idSet).filter((id) => !componentIds.has(id))

  const unresolvedUnitRefs: string[] = []
  const compositeSpecRefs: string[] = []
  const specsMissingFromIds = new Set<string>()
  let unitCount = 0

  for (const [specId, spec] of specEntries) {
    if (!idSet.has(specId)) {
      specsMissingFromIds.add(specId)
    }

    const units = spec.units ?? {}
    const unitValues = Object.values<any>(units)
    unitCount += unitValues.length

    for (const unit of unitValues) {
      const unitId: string | undefined = unit?.id
      if (!unitId || classIds.has(unitId)) {
        continue
      }

      if (specIds.has(unitId)) {
        compositeSpecRefs.push(unitId)
      } else {
        unresolvedUnitRefs.push(unitId)
      }
    }
  }

  const unresolvedUnitRefFrequency = sortByFrequency(unresolvedUnitRefs)
  const compositeSpecRefFrequency = sortByFrequency(compositeSpecRefs)

  const issues: Issue[] = []

  if (duplicateIds.length > 0) {
    issues.push({
      level: 'error',
      count: duplicateIds.length,
      message: `Duplicate ID values detected: ${formatList(describeIds(duplicateIds, idNameIndex))}`,
    })
  }

  if (includeCoverageWarnings && idsMissingClass.length > 0) {
    issues.push({
      level: 'warn',
      count: idsMissingClass.length,
      message: `IDs missing class implementations: ${formatList(describeIds(idsMissingClass, idNameIndex))}`,
    })
  }

  if (includeCoverageWarnings && idsMissingComponent.length > 0) {
    issues.push({
      level: 'warn',
      count: idsMissingComponent.length,
      message: `IDs missing component implementations: ${formatList(describeIds(idsMissingComponent, idNameIndex))}`,
    })
  }

  if (unresolvedUnitRefFrequency.length > 0) {
    issues.push({
      level: 'error',
      count: unresolvedUnitRefFrequency.length,
      message: `Spec units reference IDs missing from both class and spec registries: ${formatList(
        unresolvedUnitRefFrequency.map(([id, count]) => `${describeId(id, idNameIndex)} ×${count}`)
      )}`,
    })
  }

  if (compositeSpecRefFrequency.length > 0) {
    issues.push({
      level: 'warn',
      count: compositeSpecRefFrequency.length,
      message: `Spec units reference composite specs (no class mapping required): ${formatList(
        compositeSpecRefFrequency.map(([id, count]) => `${describeId(id, idNameIndex)} ×${count}`)
      )}`,
    })
  }

  if (specsMissingFromIds.size > 0) {
    issues.push({
      level: 'warn',
      count: specsMissingFromIds.size,
      message: `Spec IDs not exported from _ids.ts: ${formatList(
        describeIds(Array.from(specsMissingFromIds), idNameIndex)
      )}`,
    })
  }

  return {
    generatedAt,
    idValues,
    idSet,
    classIds,
    componentIds,
    specEntries,
    unitCount,
    idsMissingClass,
    idsMissingComponent,
    specsMissingFromIds: Array.from(specsMissingFromIds),
    duplicateIds,
    unresolvedUnitRefFrequency,
    compositeSpecRefFrequency,
    unresolvedUnitRefUniqueCount: new Set(unresolvedUnitRefs).size,
    compositeSpecRefUniqueCount: new Set(compositeSpecRefs).size,
    issues,
    idNameIndex,
  }
}
