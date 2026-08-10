import { hashGraphSpec } from '../spec/identity'
import { Capability, CapabilityManifest } from '../types/Capability'
import { GraphSpec } from '../types/GraphSpec'
import {
  assertCapabilities,
  normalizeCapabilityManifest,
} from './capability'
import {
  GraphRuntime,
  RuntimeGraphId,
  RuntimeSnapshot,
} from './contract'

export type RuntimeSourceModality =
  | 'audio'
  | 'binary'
  | 'image'
  | 'structured'
  | 'text'
  | 'video'
  | `extension.${string}`

export type RuntimeSourceKind =
  | 'file'
  | 'inline'
  | 'stream'
  | 'uri'
  | `extension.${string}`

export type RuntimeSource = {
  id: string
  kind: RuntimeSourceKind
  modality?: RuntimeSourceModality
  mediaType?: string
  locator?: string
  digest?: string
}

export type RuntimeInvocationInput = {
  pinId: string
  data: unknown
  sourceId?: string
}

export type RuntimeInvocationOutput = {
  pinId: string
}

export type RuntimeInvocation = {
  requestId: string
  spec: GraphSpec
  sources?: RuntimeSource[]
  inputs?: RuntimeInvocationInput[]
  outputs?: RuntimeInvocationOutput[]
  manifest?: CapabilityManifest
  availableCapabilities?: Capability[]
}

export type RuntimeEvidenceSource = {
  id: string
  kind: RuntimeSourceKind
  modality: RuntimeSourceModality
  mediaType?: string
  locator?: string
  digest?: string
}

export type RuntimeEvidenceManifest = {
  version: 'unit.runtime-evidence/1'
  requestId: string
  graphId: RuntimeGraphId
  graphHash: string
  sources: RuntimeEvidenceSource[]
  outputPins: string[]
  snapshot: {
    graphId: RuntimeGraphId
    graphHash: string
    sequence: number
  }
}

export type RuntimeInvocationResult = {
  outputs: Record<string, unknown>
  snapshot: RuntimeSnapshot
  evidence: RuntimeEvidenceManifest
}

function normalizeToken(value: string, label: string): string {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`${label} must not be empty`)
  }

  return normalized
}

export function classifyRuntimeSourceModality(
  mediaType?: string
): RuntimeSourceModality {
  const normalized = mediaType?.trim().toLowerCase()

  if (!normalized) {
    return 'binary'
  }

  if (normalized === 'application/json' || normalized.endsWith('+json')) {
    return 'structured'
  }

  const family = normalized.split('/')[0]

  if (
    family === 'audio' ||
    family === 'image' ||
    family === 'text' ||
    family === 'video'
  ) {
    return family
  }

  return 'binary'
}

export function normalizeRuntimeSources(
  sources: RuntimeSource[] = []
): RuntimeEvidenceSource[] {
  const seen = new Set<string>()

  const normalized = sources.map((source) => {
    const id = normalizeToken(source.id, 'runtime source id')

    if (seen.has(id)) {
      throw new Error(`duplicate runtime source id: ${id}`)
    }

    seen.add(id)

    const mediaType = source.mediaType?.trim().toLowerCase() || undefined
    const locator = source.locator?.trim() || undefined
    const digest = source.digest?.trim().toLowerCase() || undefined

    return {
      id,
      kind: source.kind,
      modality: source.modality ?? classifyRuntimeSourceModality(mediaType),
      ...(mediaType ? { mediaType } : {}),
      ...(locator ? { locator } : {}),
      ...(digest ? { digest } : {}),
    }
  })

  return normalized.sort((a, b) => a.id.localeCompare(b.id))
}

export async function runRuntimeInvocation(
  runtime: GraphRuntime,
  invocation: RuntimeInvocation
): Promise<RuntimeInvocationResult> {
  const requestId = normalizeToken(invocation.requestId, 'runtime request id')
  const sources = normalizeRuntimeSources(invocation.sources)
  const sourceIds = new Set(sources.map(({ id }) => id))
  const inputs = (invocation.inputs ?? []).map((input) => {
    const pinId = normalizeToken(input.pinId, 'runtime input pin id')
    const sourceId = input.sourceId
      ? normalizeToken(input.sourceId, 'runtime input source id')
      : undefined

    if (sourceId && !sourceIds.has(sourceId)) {
      throw new Error(`runtime input references unknown source: ${sourceId}`)
    }

    return { ...input, pinId, sourceId }
  })
  const outputPins = (invocation.outputs ?? []).map(({ pinId }) =>
    normalizeToken(pinId, 'runtime output pin id')
  )

  if (new Set(outputPins).size !== outputPins.length) {
    throw new Error('runtime output pin ids must be unique')
  }

  const manifest = normalizeCapabilityManifest(invocation.manifest)
  const availableCapabilities = invocation.availableCapabilities ?? []
  assertCapabilities(manifest, availableCapabilities)

  const graphHash = await hashGraphSpec(invocation.spec)
  await runtime.validate(invocation.spec)
  const graphId = await runtime.instantiate(invocation.spec, {
    capabilities: availableCapabilities,
    manifest,
  })

  await runtime.start(graphId)

  for (const input of inputs) {
    await runtime.push(graphId, input.pinId, input.data)
  }

  const outputs: Record<string, unknown> = {}
  for (const pinId of outputPins) {
    outputs[pinId] = await runtime.take(graphId, pinId)
  }

  const snapshot = await runtime.snapshot(graphId)
  await runtime.stop(graphId)

  if (snapshot.graphHash !== graphHash) {
    throw new Error(
      `runtime snapshot hash mismatch: expected ${graphHash}, received ${snapshot.graphHash}`
    )
  }

  return {
    outputs,
    snapshot,
    evidence: {
      version: 'unit.runtime-evidence/1',
      requestId,
      graphId,
      graphHash,
      sources,
      outputPins,
      snapshot: {
        graphId: snapshot.graphId,
        graphHash: snapshot.graphHash,
        sequence: snapshot.sequence,
      },
    },
  }
}
