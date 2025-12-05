import * as ids from '../../src/system/_ids'
import classes from '../../src/system/_classes'
import components from '../../src/system/_components'
import specs from '../../src/system/_specs'

type RegistryMap = Record<string, unknown>

type CheckResult = {
  label: string
  missing: string[]
  total: number
}

const idValues = Object.values(ids) as string[]
const idSet = new Set<string>(idValues)

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const value of values) {
    if (seen.has(value) && !duplicates.includes(value)) {
      duplicates.push(value)
    }
    seen.add(value)
  }
  return duplicates
}

function checkRegistry(label: string, registry: RegistryMap): CheckResult {
  const keys = Object.keys(registry)
  const missing = keys.filter((key) => !idSet.has(key))
  return { label, missing, total: keys.length }
}

const duplicates = findDuplicates(idValues as string[])
const registryChecks = [
  checkRegistry('classes', classes as RegistryMap),
  checkRegistry('components', components as RegistryMap),
  checkRegistry('specs', specs as RegistryMap),
]

let hasError = false

if (duplicates.length) {
  console.error('Duplicate identifiers detected:', duplicates)
  hasError = true
} else {
  console.log(`No duplicate identifiers found across ${idValues.length} entries.`)
}

for (const check of registryChecks) {
  if (check.missing.length) {
    console.error(`Registry '${check.label}' contains keys missing from _ids:`, check.missing)
    hasError = true
  } else {
    console.log(`Registry '${check.label}' is aligned with _ids (${check.total} entries).`)
  }
}

if (hasError) {
  process.exit(1)
}

console.log('Registry validation completed successfully.')
