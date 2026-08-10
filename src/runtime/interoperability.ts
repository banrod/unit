import { canonicalizeGraphSpec, hashGraphSpec } from '../spec/identity'
import {
  Capability,
  CapabilityConflictRule,
  CapabilityGrant,
  CapabilityManifest,
  CapabilityProof,
  CapabilityRequest,
  ScopedCapability,
} from '../types/Capability'
import { GraphSpec } from '../types/GraphSpec'
import { compileLeastAuthority, normalizeCapabilityRequest } from './capability-calculus'
import { normalizeCapabilityManifest } from './capability'
import {
  GraphRuntime,
  RuntimeAuthorityEnforcement,
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
  operationId: string
  spec: GraphSpec
  sources?: RuntimeSource[]
  inputs?: RuntimeInvocationInput[]
  outputs?: RuntimeInvocationOutput[]
  capabilityRequest?: CapabilityRequest
}

export type RuntimeAuthorization = {
  principalId: string
  manifest: CapabilityManifest
  layers: CapabilityGrant[]
  conflictRules?: CapabilityConflictRule[]
  now?: string
}

export type RuntimeEvidenceSource = {
  id: string
  kind: RuntimeSourceKind
  modality: RuntimeSourceModality
  mediaType?: string
  locator?: string
  digest?: string
}

export type RuntimeEvidenceInput = {
  pinId: string
  sourceId?: string
}

export type RuntimeEvidenceCapabilities = CapabilityProof

export type RuntimeEvidenceEnforcement = {
  scopedCapabilities: 'none' | 'unit.scoped-capabilities/1'
  resourceBudgets: 'none' | 'unit.resource-budgets/1'
}

export type RuntimeEvidenceManifest = {
  version: 'unit.runtime-evidence/2'
  requestId: string
  operationId: string
  principalId: string
  graphId: RuntimeGraphId
  graphHash: string
  sources: RuntimeEvidenceSource[]
  inputs: RuntimeEvidenceInput[]
  outputPins: string[]
  capabilities: RuntimeEvidenceCapabilities
  enforcement: RuntimeEvidenceEnforcement
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

const SOURCE_KINDS = new Set(['file', 'inline', 'stream', 'uri'])
const SOURCE_MODALITIES = new Set([
  'audio',
  'binary',
  'image',
  'structured',
  'text',
  'video',
])
const EXTENSION_TOKEN = /^extension\.[a-z0-9][a-z0-9._-]*$/

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

function normalizeToken(value: string, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }

  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`${label} must not be empty`)
  }

  return normalized
}

function normalizeOptionalToken(
  value: string | undefined,
  label: string
): string | undefined {
  if (value === undefined) {
    return undefined
  }

  return normalizeToken(value, label)
}

function normalizeSourceKind(value: RuntimeSourceKind): RuntimeSourceKind {
  const normalized = normalizeToken(value, 'runtime source kind')

  if (SOURCE_KINDS.has(normalized) || EXTENSION_TOKEN.test(normalized)) {
    return normalized as RuntimeSourceKind
  }

  throw new Error(`unsupported runtime source kind: ${normalized}`)
}

function normalizeSourceModality(
  value: RuntimeSourceModality
): RuntimeSourceModality {
  const normalized = normalizeToken(value, 'runtime source modality')

  if (SOURCE_MODALITIES.has(normalized) || EXTENSION_TOKEN.test(normalized)) {
    return normalized as RuntimeSourceModality
  }

  throw new Error(`unsupported runtime source modality: ${normalized}`)
}

function optionalArray<T>(value: T[] | undefined, label: string): T[] {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value
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
  sources?: RuntimeSource[]
): RuntimeEvidenceSource[] {
  const values = optionalArray(sources, 'runtime sources')
  const seen = new Set<string>()

  const normalized = values.map((source) => {
    assertPlainRecord(source, 'runtime source')
    assertExactKeys(
      source,
      ['id', 'kind', 'modality', 'mediaType', 'locator', 'digest'],
      'runtime source'
    )

    const id = normalizeToken(source.id, 'runtime source id')

    if (seen.has(id)) {
      throw new Error(`duplicate runtime source id: ${id}`)
    }

    seen.add(id)

    const kind = normalizeSourceKind(source.kind)
    const mediaTypeValue = normalizeOptionalToken(
      source.mediaType,
      'runtime source media type'
    )
    const mediaType = mediaTypeValue?.toLowerCase()
    const locator = normalizeOptionalToken(source.locator, 'runtime source locator')
    const digest = normalizeOptionalToken(source.digest, 'runtime source digest')
    const modality =
      source.modality === undefined
        ? classifyRuntimeSourceModality(mediaType)
        : normalizeSourceModality(source.modality)

    return {
      id,
      kind,
      modality,
      ...(mediaType ? { mediaType } : {}),
      ...(locator ? { locator } : {}),
      ...(digest ? { digest } : {}),
    }
  })

  return normalized.sort((a, b) => a.id.localeCompare(b.id))
}

function bindCapabilityRequest(
  manifest: CapabilityManifest,
  request: CapabilityRequest = {}
): Required<CapabilityRequest> {
  const normalizedManifest = normalizeCapabilityManifest(manifest)
  const normalizedRequest = normalizeCapabilityRequest(request)
  const requiredClasses = new Set(normalizedManifest.required)
  const optionalClasses = new Set(normalizedManifest.optional)

  for (const value of normalizedRequest.required) {
    if (!requiredClasses.has(value.capability)) {
      throw new Error(
        `scoped required capability is not declared required by host: ${value.capability}`
      )
    }
  }

  for (const value of normalizedRequest.optional) {
    if (!optionalClasses.has(value.capability)) {
      throw new Error(
        `scoped optional capability is not declared optional by host: ${value.capability}`
      )
    }
  }

  const findScoped = (
    capability: Capability,
    values: ScopedCapability[]
  ): ScopedCapability =>
    values.find((value) => value.capability === capability) ?? { capability }

  return {
    required: normalizedManifest.required.map((capability) =>
      findScoped(capability, normalizedRequest.required)
    ),
    optional: normalizedManifest.optional.map((capability) =>
      findScoped(capability, normalizedRequest.optional)
    ),
  }
}

function describeAuthorizationFailure(proof: CapabilityProof): string {
  const reasons: string[] = []

  if (proof.deniedRequired.length) {
    reasons.push(
      `missing required capabilities: ${proof.deniedRequired
        .map(({ capability }) => capability)
        .join(', ')}`
    )
  }
  if (proof.conflicts.length) {
    reasons.push(`forbidden capability combinations: ${proof.conflicts.join(', ')}`)
  }
  if (!proof.monotonic) {
    reasons.push('capability attenuation proof is not monotonic')
  }

  return reasons.join('; ') || 'authorization proof rejected'
}

function requireAuthorityEnforcement(
  runtime: GraphRuntime,
  proof: CapabilityProof
): RuntimeEvidenceEnforcement {
  const support: RuntimeAuthorityEnforcement = runtime.authorityEnforcement ?? {}
  const requiresScopedCapabilities = proof.effective.some(
    ({ scope }) => scope !== undefined
  )
  const requiresResourceBudgets = proof.budget !== undefined

  if (
    requiresScopedCapabilities &&
    support.scopedCapabilities !== 'unit.scoped-capabilities/1'
  ) {
    throw new Error(
      'runtime authorization denied: scoped capability enforcement is required but unsupported'
    )
  }

  if (
    requiresResourceBudgets &&
    support.resourceBudgets !== 'unit.resource-budgets/1'
  ) {
    throw new Error(
      'runtime authorization denied: resource budget enforcement is required but unsupported'
    )
  }

  return {
    scopedCapabilities: support.scopedCapabilities ?? 'none',
    resourceBudgets: support.resourceBudgets ?? 'none',
  }
}

export async function runRuntimeInvocation(
  runtime: GraphRuntime,
  invocation: RuntimeInvocation,
  authorization: RuntimeAuthorization
): Promise<RuntimeInvocationResult> {
  assertPlainRecord(invocation, 'runtime invocation')
  assertExactKeys(
    invocation,
    [
      'requestId',
      'operationId',
      'spec',
      'sources',
      'inputs',
      'outputs',
      'capabilityRequest',
    ],
    'runtime invocation'
  )
  assertPlainRecord(authorization, 'runtime authorization')
  assertExactKeys(
    authorization,
    ['principalId', 'manifest', 'layers', 'conflictRules', 'now'],
    'runtime authorization'
  )
  assertPlainRecord(authorization.manifest, 'runtime capability manifest')
  assertExactKeys(
    authorization.manifest,
    ['required', 'optional'],
    'runtime capability manifest'
  )

  if (
    authorization.manifest.required !== undefined &&
    !Array.isArray(authorization.manifest.required)
  ) {
    throw new Error('runtime required capability manifest must be an array')
  }
  if (
    authorization.manifest.optional !== undefined &&
    !Array.isArray(authorization.manifest.optional)
  ) {
    throw new Error('runtime optional capability manifest must be an array')
  }

  const requestId = normalizeToken(invocation.requestId, 'runtime request id')
  const operationId = normalizeToken(invocation.operationId, 'runtime operation id')
  const principalId = normalizeToken(
    authorization.principalId,
    'runtime authorization principal id'
  )
  const spec = canonicalizeGraphSpec(invocation.spec, {
    omitMetadataKeys: [],
    omitRootKeys: [],
  })
  const sources = normalizeRuntimeSources(invocation.sources)
  const sourceIds = new Set(sources.map(({ id }) => id))
  const inputs = optionalArray(invocation.inputs, 'runtime inputs').map((input) => {
    assertPlainRecord(input, 'runtime input')
    assertExactKeys(input, ['pinId', 'data', 'sourceId'], 'runtime input')

    const pinId = normalizeToken(input.pinId, 'runtime input pin id')
    const sourceId = normalizeOptionalToken(
      input.sourceId,
      'runtime input source id'
    )

    if (sourceId && !sourceIds.has(sourceId)) {
      throw new Error(`runtime input references unknown source: ${sourceId}`)
    }

    return { ...input, pinId, sourceId }
  })
  const evidenceInputs: RuntimeEvidenceInput[] = inputs.map(
    ({ pinId, sourceId }) => ({
      pinId,
      ...(sourceId ? { sourceId } : {}),
    })
  )
  const outputPins = optionalArray(invocation.outputs, 'runtime outputs').map(
    (output) => {
      assertPlainRecord(output, 'runtime output')
      assertExactKeys(output, ['pinId'], 'runtime output')
      return normalizeToken(output.pinId, 'runtime output pin id')
    }
  )

  if (new Set(outputPins).size !== outputPins.length) {
    throw new Error('runtime output pin ids must be unique')
  }

  const manifest = normalizeCapabilityManifest(authorization.manifest)
  const capabilityRequest = bindCapabilityRequest(
    manifest,
    invocation.capabilityRequest
  )
  const capabilityProof = compileLeastAuthority(capabilityRequest, {
    principalId,
    requestId,
    operationId,
    layers: authorization.layers,
    conflictRules: authorization.conflictRules,
    now: authorization.now,
  })

  if (!capabilityProof.allowed) {
    throw new Error(
      `runtime authorization denied: ${describeAuthorizationFailure(capabilityProof)}`
    )
  }

  const enforcement = requireAuthorityEnforcement(runtime, capabilityProof)
  const capabilities = Array.from(
    new Set(capabilityProof.effective.map(({ capability }) => capability))
  ).sort() as Capability[]

  const graphHash = await hashGraphSpec(spec)
  await runtime.validate(spec)
  const graphId = await runtime.instantiate(spec, {
    capabilities,
    manifest,
    scopedCapabilities: capabilityProof.effective,
    capabilityProof,
  })

  let operationFailed = false
  let operationError: unknown
  let result: RuntimeInvocationResult | undefined

  try {
    await runtime.start(graphId)

    for (const input of inputs) {
      await runtime.push(graphId, input.pinId, input.data)
    }

    const outputEntries: [string, unknown][] = []
    for (const pinId of outputPins) {
      outputEntries.push([pinId, await runtime.take(graphId, pinId)])
    }
    const outputs = Object.fromEntries(outputEntries) as Record<string, unknown>

    const snapshot = await runtime.snapshot(graphId)

    if (snapshot.graphHash !== graphHash) {
      throw new Error(
        `runtime snapshot hash mismatch: expected ${graphHash}, received ${snapshot.graphHash}`
      )
    }

    result = {
      outputs,
      snapshot,
      evidence: {
        version: 'unit.runtime-evidence/2',
        requestId,
        operationId,
        principalId,
        graphId,
        graphHash,
        sources,
        inputs: evidenceInputs,
        outputPins,
        capabilities: capabilityProof,
        enforcement,
        snapshot: {
          graphId: snapshot.graphId,
          graphHash: snapshot.graphHash,
          sequence: snapshot.sequence,
        },
      },
    }
  } catch (error) {
    operationFailed = true
    operationError = error
  }

  let cleanupFailed = false
  let cleanupError: unknown

  try {
    await runtime.stop(graphId)
  } catch (error) {
    cleanupFailed = true
    cleanupError = error
  }

  if (operationFailed) {
    throw operationError
  }

  if (cleanupFailed) {
    throw cleanupError
  }

  if (!result) {
    throw new Error('runtime invocation completed without a result')
  }

  return result
}
