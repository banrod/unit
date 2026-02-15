import * as ids from '../../src/system/_ids'
import classes from '../../src/system/_classes'
import components from '../../src/system/_components'
import specs from '../../src/system/_specs'

type IssueLevel = 'error' | 'warn'

type Issue = {
  level: IssueLevel
  message: string
}

const MAX_LIST_PREVIEW = 20

function buildIdNameIndex(): Record<string, string[]> {
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

function describeId(id: string, idNameIndex: Record<string, string[]>): string {
  const names = idNameIndex[id]
  if (!names || names.length === 0) {
    return id
  }

  return `${names.join('|')} (${id})`
}

function describeIds(values: string[], idNameIndex: Record<string, string[]>): string[] {
  return values.map((id) => describeId(id, idNameIndex))
}

function formatList(values: string[]): string {
  if (values.length === 0) {
    return ''
  }

  const preview = values.slice(0, MAX_LIST_PREVIEW)
  const suffix = values.length > MAX_LIST_PREVIEW ? ` …(+${values.length - MAX_LIST_PREVIEW} more)` : ''
  return `${preview.join(', ')}${suffix}`
}

function sortByFrequency(values: string[]): Array<[string, number]> {
  return Object.entries(
    values.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1
      return acc
    }, {})
  ).sort(([, aCount], [, bCount]) => bCount - aCount)
}

function main(): void {
  const strict = process.argv.includes('--strict')
  const issues: Issue[] = []
  const idNameIndex = buildIdNameIndex()

  const idValues = Object.values(ids)
  const idSet = new Set(idValues)

  if (idValues.length !== idSet.size) {
    const duplicates = idValues.filter((id, idx) => idValues.indexOf(id) !== idx)
    issues.push({
      level: 'error',
      message: `Duplicate ID values detected in _ids.ts: ${formatList(
        describeIds(Array.from(new Set(duplicates)), idNameIndex)
      )}`,
    })
  }

  const classIds = new Set(Object.keys(classes))
  const componentIds = new Set(Object.keys(components))
  const specIds = new Set(Object.keys(specs as Record<string, any>))

  for (const classId of classIds) {
    if (!idSet.has(classId)) {
      issues.push({
        level: 'warn',
        message: `Class ID ${describeId(classId, idNameIndex)} missing from _ids.ts exports`,
      })
    }
  }

  for (const componentId of componentIds) {
    if (!idSet.has(componentId)) {
      issues.push({
        level: 'warn',
        message: `Component ID ${describeId(componentId, idNameIndex)} missing from _ids.ts exports`,
      })
    }
  }

  const missingUnits: string[] = []
  const specBackedMissingUnits: string[] = []
  const specsMissingFromIds: string[] = []

  for (const [specId, spec] of Object.entries(specs as Record<string, any>)) {
    if (!idSet.has(specId)) {
      specsMissingFromIds.push(specId)
    }

    const units = spec.units ?? {}
    for (const unit of Object.values<any>(units)) {
      const unitId: string | undefined = unit?.id
      if (!unitId || classIds.has(unitId)) {
        continue
      }

      if (specIds.has(unitId)) {
        specBackedMissingUnits.push(unitId)
      } else {
        missingUnits.push(unitId)
      }
    }
  }

  if (missingUnits.length > 0) {
    const missingUnitFrequency = sortByFrequency(missingUnits).map(
      ([id, count]) => `${describeId(id, idNameIndex)} ×${count}`
    )

    issues.push({
      level: 'error',
      message: `Spec units reference IDs missing from both class and spec registries: ${formatList(missingUnitFrequency)}`,
    })
  }

  if (specBackedMissingUnits.length > 0) {
    const specBackedFrequency = sortByFrequency(specBackedMissingUnits).map(
      ([id, count]) => `${describeId(id, idNameIndex)} ×${count}`
    )

    issues.push({
      level: 'warn',
      message: `Spec units reference composite specs (no class mapping required): ${formatList(specBackedFrequency)}`,
    })
  }

  if (specsMissingFromIds.length > 0) {
    issues.push({
      level: 'warn',
      message: `Spec IDs missing from _ids.ts exports: ${formatList(
        describeIds(Array.from(new Set(specsMissingFromIds)), idNameIndex)
      )}`,
    })
  }

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
