import {
  Capability,
  CapabilityDecision,
  CapabilityManifest,
} from '../types/Capability'

function uniqueSorted(values: Iterable<Capability>): Capability[] {
  return Array.from(new Set(values)).sort()
}

export function normalizeCapabilityManifest(
  manifest: CapabilityManifest = {}
): Required<CapabilityManifest> {
  const required = uniqueSorted(manifest.required ?? [])
  const optional = uniqueSorted(
    (manifest.optional ?? []).filter((capability) => !required.includes(capability))
  )

  return { required, optional }
}

export function evaluateCapabilityManifest(
  manifest: CapabilityManifest,
  available: Iterable<Capability>
): CapabilityDecision {
  const normalized = normalizeCapabilityManifest(manifest)
  const availableSet = new Set(available)
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
      )
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
