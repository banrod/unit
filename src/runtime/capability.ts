import {
  Capability,
  CapabilityDecision,
  CapabilityManifest,
} from '../types/Capability'
import { normalizeCapabilityClass } from './capability-calculus'

function assertPlainRecord(
  value: unknown,
  label: string
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a plain object`)
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} must be a plain object`)
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string
): void {
  const allowedKeys = new Set(allowed)

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${label} contains unknown key: ${key}`)
    }
  }
}

function uniqueSorted(values: Iterable<Capability>, label: string): Capability[] {
  let array: Capability[]

  try {
    array = Array.from(values)
  } catch {
    throw new Error(`${label} must be iterable`)
  }

  return Array.from(new Set(array.map(normalizeCapabilityClass))).sort()
}

export function normalizeCapabilityManifest(
  manifest: CapabilityManifest = {}
): Required<CapabilityManifest> {
  assertPlainRecord(manifest, 'capability manifest')
  assertExactKeys(manifest, ['required', 'optional'], 'capability manifest')

  if (manifest.required !== undefined && !Array.isArray(manifest.required)) {
    throw new Error('required capabilities must be an array')
  }
  if (manifest.optional !== undefined && !Array.isArray(manifest.optional)) {
    throw new Error('optional capabilities must be an array')
  }

  const required = uniqueSorted(manifest.required ?? [], 'required capabilities')
  const optionalCandidates = uniqueSorted(
    manifest.optional ?? [],
    'optional capabilities'
  )
  const optional = optionalCandidates.filter(
    (capability) => !required.includes(capability)
  )

  return { required, optional }
}

export function evaluateCapabilityManifest(
  manifest: CapabilityManifest,
  available: Iterable<Capability>
): CapabilityDecision {
  const normalized = normalizeCapabilityManifest(manifest)
  const availableCapabilities = uniqueSorted(available, 'available capabilities')
  const availableSet = new Set(availableCapabilities)
  const deniedRequired = normalized.required.filter(
    (capability) => !availableSet.has(capability)
  )
  const deniedOptional = normalized.optional.filter(
    (capability) => !availableSet.has(capability)
  )

  return {
    granted: uniqueSorted(
      [...normalized.required, ...normalized.optional].filter((capability) =>
        availableSet.has(capability)
      ),
      'granted capabilities'
    ),
    deniedRequired,
    deniedOptional,
    allowed: deniedRequired.length === 0,
  }
}

export function assertCapabilities(
  manifest: CapabilityManifest,
  available: Iterable<Capability>
): CapabilityDecision {
  const decision = evaluateCapabilityManifest(manifest, available)

  if (!decision.allowed) {
    throw new Error(
      `missing required capabilities: ${decision.deniedRequired.join(', ')}`
    )
  }

  return decision
}
