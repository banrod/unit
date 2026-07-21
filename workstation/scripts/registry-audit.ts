import { SELF } from '../../src/constant/SELF'
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

export type InvalidPinReference = {
  specId: string
  specName?: string
  location: string
  message: string
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
  invalidPinRefs: InvalidPinReference[]
  issues: Issue[]
  idNameIndex: Record<string, string[]>
}

export const MAX_LIST_PREVIEW = 20

type PinDirection = 'input' | 'output'

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

function hasOwn(value: unknown, key: string): boolean {
  return typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, key)
}

function ownerLabel(specId: string, spec: any): string {
  return spec?.name ? `${spec.name} (${specId})` : specId
}

export function runRegistryAudit(options: RegistryAuditOptions = {}): RegistryAuditResult {
  const { includeCoverageWarnings = true } = options

  const generatedAt = new Date().toISOString()
  const idNameIndex = buildIdNameIndex()

  const idValues = Object.values(ids)
  const idSet = new Set(idValues)
  const classIds = new Set(Object.keys(classes))
  const componentIds = new Set(Object.keys(components))
  const specMap = specs as Record<string, any>
  const specEntries = Object.entries(specMap)
  const specIds = new Set(specEntries.map(([id]) => id))

  const duplicateIds = Array.from(new Set(idValues.filter((id, idx) => idValues.indexOf(id) !== idx)))
  const idsMissingClass = Array.from(idSet).filter((id) => !classIds.has(id))
  const idsMissingComponent = Array.from(idSet).filter((id) => !componentIds.has(id))

  const unresolvedUnitRefs: string[] = []
  const compositeSpecRefs: string[] = []
  const invalidPinRefRecords: InvalidPinReference[] = []
  const specsMissingFromIds = new Set<string>()
  let unitCount = 0

  const recordInvalidPinRef = (specId: string, spec: any, location: string, detail: string): void => {
    invalidPinRefRecords.push({
      specId,
      specName: spec?.name,
      location,
      message: `${ownerLabel(specId, spec)} ${location}: ${detail}`,
    })
  }

  const validateUnitPin = (
    ownerSpecId: string,
    ownerSpec: any,
    units: Record<string, any>,
    unitInstanceId: string,
    direction: PinDirection,
    pinId: string,
    location: string
  ): void => {
    if (pinId === SELF) {
      return
    }

    const unit = units[unitInstanceId]

    if (!unit) {
      recordInvalidPinRef(
        ownerSpecId,
        ownerSpec,
        location,
        `references missing unit instance ${unitInstanceId}`
      )
      return
    }

    const referencedSpecId: string | undefined = unit.id
    if (!referencedSpecId) {
      recordInvalidPinRef(ownerSpecId, ownerSpec, location, `unit ${unitInstanceId} has no spec id`)
      return
    }

    const referencedSpec = specMap[referencedSpecId]
    if (!referencedSpec) {
      return
    }

    const pins = direction === 'input' ? referencedSpec.inputs : referencedSpec.outputs
    if (!hasOwn(pins ?? {}, pinId)) {
      recordInvalidPinRef(
        ownerSpecId,
        ownerSpec,
        location,
        `references missing ${direction} pin ${unitInstanceId}.${pinId} on ${ownerLabel(
          referencedSpecId,
          referencedSpec
        )}`
      )
    }
  }

  for (const [specId, spec] of specEntries) {
    if (!idSet.has(specId)) {
      specsMissingFromIds.add(specId)
    }

    const units = (spec.units ?? {}) as Record<string, any>
    const merges = (spec.merges ?? {}) as Record<string, any>
    const unitEntries = Object.entries<any>(units)
    unitCount += unitEntries.length

    for (const [unitInstanceId, unit] of unitEntries) {
      const unitId: string | undefined = unit?.id
      if (unitId && !classIds.has(unitId)) {
        if (specIds.has(unitId)) {
          compositeSpecRefs.push(unitId)
        } else {
          unresolvedUnitRefs.push(unitId)
        }
      }

      for (const direction of ['input', 'output'] as PinDirection[]) {
        const configuredPins = unit?.[direction] ?? {}
        for (const pinId of Object.keys(configuredPins)) {
          validateUnitPin(
            specId,
            spec,
            units,
            unitInstanceId,
            direction,
            pinId,
            `units.${unitInstanceId}.${direction}.${pinId}`
          )
        }
      }
    }

    for (const [mergeId, merge] of Object.entries<any>(merges)) {
      for (const [unitInstanceId, pinGroups] of Object.entries<any>(merge ?? {})) {
        for (const direction of ['input', 'output'] as PinDirection[]) {
          const pins = pinGroups?.[direction] ?? {}
          for (const pinId of Object.keys(pins)) {
            validateUnitPin(
              specId,
              spec,
              units,
              unitInstanceId,
              direction,
              pinId,
              `merges.${mergeId}.${unitInstanceId}.${direction}.${pinId}`
            )
          }
        }
      }
    }

    for (const outerDirection of ['input', 'output'] as PinDirection[]) {
      const outerPins = spec[`${outerDirection}s`] ?? {}

      for (const [outerPinId, outerPin] of Object.entries<any>(outerPins)) {
        const plugs = outerPin?.plug ?? {}

        for (const [plugId, plug] of Object.entries<any>(plugs)) {
          const location = `${outerDirection}s.${outerPinId}.plug.${plugId}`

          if (plug?.mergeId !== undefined && !hasOwn(merges, String(plug.mergeId))) {
            recordInvalidPinRef(
              specId,
              spec,
              location,
              `references missing merge ${String(plug.mergeId)}`
            )
          }

          if (plug?.unitId !== undefined || plug?.pinId !== undefined) {
            if (!plug?.unitId || !plug?.pinId) {
              recordInvalidPinRef(specId, spec, location, 'contains an incomplete unit pin reference')
              continue
            }

            const direction: PinDirection =
              plug.kind === 'input' || plug.kind === 'output' ? plug.kind : outerDirection

            validateUnitPin(
              specId,
              spec,
              units,
              plug.unitId,
              direction,
              plug.pinId,
              location
            )
          }
        }
      }
    }
  }

  const unresolvedUnitRefFrequency = sortByFrequency(unresolvedUnitRefs)
  const compositeSpecRefFrequency = sortByFrequency(compositeSpecRefs)
  const invalidPinRefs = Array.from(
    new Map(invalidPinRefRecords.map((reference) => [reference.message, reference])).values()
  )

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

  if (invalidPinRefs.length > 0) {
    issues.push({
      level: 'error',
      count: invalidPinRefs.length,
      message: `Invalid graph pin references: ${formatList(
        invalidPinRefs.map((reference) => reference.message)
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
    invalidPinRefs,
    issues,
    idNameIndex,
  }
}
