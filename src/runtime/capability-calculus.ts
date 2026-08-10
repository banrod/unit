import {
  Capability,
  CapabilityAuthorizationContext,
  CapabilityConflictRule,
  CapabilityGrant,
  CapabilityProof,
  CapabilityRequest,
  CapabilityScope,
  ResourceBudget,
  ScopedCapability,
} from '../types/Capability'

const CANONICAL_CAPABILITIES = new Set<string>([
  'dom.render',
  'filesystem.read',
  'filesystem.write',
  'media.camera',
  'media.microphone',
  'network.http',
  'network.tcp',
  'process.spawn',
  'storage.local',
])

const EXTENSION_CAPABILITY = /^extension\.[a-z0-9][a-z0-9._-]*$/

const RESERVED_MAP_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
])

const EXPLICIT_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

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

function normalizeMapKey(value: string, label: string): string {
  const normalized = normalizeToken(value, label)

  if (RESERVED_MAP_KEYS.has(normalized)) {
    throw new Error(`${label} is reserved: ${normalized}`)
  }

  return normalized
}

export function normalizeCapabilityClass(value: Capability): Capability {
  const normalized = normalizeToken(value, 'capability class')

  if (CANONICAL_CAPABILITIES.has(normalized)) {
    return normalized as Capability
  }

  if (EXTENSION_CAPABILITY.test(normalized)) {
    return normalized as Capability
  }

  throw new Error(`unsupported capability class: ${normalized}`)
}

function uniqueSorted(values: string[], label: string): string[] {
  if (!Array.isArray(values)) {
    throw new Error(`${label} must be an array`)
  }

  const normalized = values.map((value, index) => {
    if (typeof value !== 'string') {
      throw new Error(`${label}[${index}] must be a string`)
    }
    return value.trim()
  })

  return Array.from(new Set(normalized.filter(Boolean))).sort()
}

function normalizeStringMap(
  values?: Record<string, string[]>
): Record<string, string[]> | undefined {
  if (values === undefined) {
    return undefined
  }

  assertPlainRecord(values, 'capability selectors')
  const normalized: Record<string, string[]> = {}

  for (const key of Object.keys(values).sort()) {
    const normalizedKey = normalizeMapKey(key, 'capability selector key')
    const allowed = uniqueSorted(
      values[key] as string[],
      `capability selector ${normalizedKey}`
    )

    if (!allowed.length) {
      throw new Error(`capability selector must allow at least one value: ${normalizedKey}`)
    }

    normalized[normalizedKey] = allowed
  }

  return Object.keys(normalized).length ? normalized : undefined
}

function normalizeNumberMap(
  values?: Record<string, number>
): Record<string, number> | undefined {
  if (values === undefined) {
    return undefined
  }

  assertPlainRecord(values, 'capability limits')
  const normalized: Record<string, number> = {}

  for (const key of Object.keys(values).sort()) {
    const normalizedKey = normalizeMapKey(key, 'capability limit key')
    const value = values[key] as number

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`capability limit must be a non-negative finite number: ${key}`)
    }

    normalized[normalizedKey] = value
  }

  return Object.keys(normalized).length ? normalized : undefined
}

function normalizeBooleanMap(
  values?: Record<string, boolean>
): Record<string, boolean> | undefined {
  if (values === undefined) {
    return undefined
  }

  assertPlainRecord(values, 'capability permissions')
  const normalized: Record<string, boolean> = {}

  for (const key of Object.keys(values).sort()) {
    const normalizedKey = normalizeMapKey(key, 'capability permission key')
    const value = values[key] as boolean

    if (typeof value !== 'boolean') {
      throw new Error(`capability permission must be boolean: ${normalizedKey}`)
    }

    normalized[normalizedKey] = value
  }

  return Object.keys(normalized).length ? normalized : undefined
}

export function normalizeCapabilityScope(
  scope?: CapabilityScope
): CapabilityScope | undefined {
  if (scope === undefined) {
    return undefined
  }

  assertPlainRecord(scope, 'capability scope')
  assertExactKeys(
    scope,
    ['resources', 'selectors', 'limits', 'permissions'],
    'capability scope'
  )

  const resources =
    scope.resources === undefined
      ? undefined
      : uniqueSorted(scope.resources, 'capability resources')

  if (resources !== undefined && !resources.length) {
    throw new Error('capability resources must contain at least one resource')
  }

  const selectors = normalizeStringMap(scope.selectors)
  const limits = normalizeNumberMap(scope.limits)
  const permissions = normalizeBooleanMap(scope.permissions)

  if (
    resources === undefined &&
    selectors === undefined &&
    limits === undefined &&
    permissions === undefined
  ) {
    return undefined
  }

  return {
    ...(resources !== undefined ? { resources } : {}),
    ...(selectors ? { selectors } : {}),
    ...(limits ? { limits } : {}),
    ...(permissions ? { permissions } : {}),
  }
}

export function normalizeScopedCapability(
  value: ScopedCapability
): ScopedCapability {
  assertPlainRecord(value, 'scoped capability')
  assertExactKeys(value, ['capability', 'scope'], 'scoped capability')

  const capability = normalizeCapabilityClass(value.capability)
  const scope = normalizeCapabilityScope(value.scope)

  return {
    capability,
    ...(scope ? { scope } : {}),
  }
}

function normalizeCapabilityList(
  values: ScopedCapability[],
  label: string
): ScopedCapability[] {
  if (!Array.isArray(values)) {
    throw new Error(`${label} must be an array`)
  }

  const seen = new Set<Capability>()
  const normalized = values.map(normalizeScopedCapability)

  for (const value of normalized) {
    if (seen.has(value.capability)) {
      throw new Error(`${label} contains duplicate capability: ${value.capability}`)
    }
    seen.add(value.capability)
  }

  return normalized.sort((a, b) => a.capability.localeCompare(b.capability))
}

export function normalizeCapabilityRequest(
  request: CapabilityRequest = {}
): Required<CapabilityRequest> {
  assertPlainRecord(request, 'capability request')
  assertExactKeys(request, ['required', 'optional'], 'capability request')

  const required = normalizeCapabilityList(request.required ?? [], 'required capabilities')
  const requiredClasses = new Set(required.map(({ capability }) => capability))
  const optional = normalizeCapabilityList(request.optional ?? [], 'optional capabilities')

  for (const value of optional) {
    if (requiredClasses.has(value.capability)) {
      throw new Error(
        `capability cannot be both required and optional: ${value.capability}`
      )
    }
  }

  return { required, optional }
}

function intersectStrings(a?: string[], b?: string[]): string[] | undefined | null {
  if (a === undefined) {
    return b === undefined ? undefined : [...b]
  }
  if (b === undefined) {
    return [...a]
  }

  const bSet = new Set(b)
  const intersection = a.filter((value) => bSet.has(value))

  return intersection.length ? uniqueSorted(intersection, 'capability intersection') : null
}

function unionStrings(a?: string[], b?: string[]): string[] | undefined {
  if (a === undefined || b === undefined) {
    return undefined
  }

  return uniqueSorted([...a, ...b], 'capability union')
}

function meetSelectors(
  a?: Record<string, string[]>,
  b?: Record<string, string[]>
): Record<string, string[]> | undefined | null {
  if (!a && !b) {
    return undefined
  }

  const result: Record<string, string[]> = {}
  const keys = uniqueSorted(
    [...Object.keys(a ?? {}), ...Object.keys(b ?? {})],
    'capability selector keys'
  )

  for (const key of keys) {
    const intersection = intersectStrings(a?.[key], b?.[key])
    if (intersection === null) {
      return null
    }
    if (intersection !== undefined) {
      result[key] = intersection
    }
  }

  return Object.keys(result).length ? result : undefined
}

function joinSelectors(
  a?: Record<string, string[]>,
  b?: Record<string, string[]>
): Record<string, string[]> | undefined {
  if (!a || !b) {
    return undefined
  }

  const result: Record<string, string[]> = {}
  const keys = uniqueSorted(
    [...Object.keys(a), ...Object.keys(b)],
    'capability selector keys'
  )

  for (const key of keys) {
    if (a[key] === undefined || b[key] === undefined) {
      continue
    }
    result[key] = uniqueSorted(
      [...a[key], ...b[key]],
      `capability selector ${key}`
    )
  }

  return Object.keys(result).length ? result : undefined
}

function meetLimits(
  a?: Record<string, number>,
  b?: Record<string, number>
): Record<string, number> | undefined {
  if (!a && !b) {
    return undefined
  }

  const result: Record<string, number> = {}
  const keys = uniqueSorted(
    [...Object.keys(a ?? {}), ...Object.keys(b ?? {})],
    'capability limit keys'
  )

  for (const key of keys) {
    const av = a?.[key]
    const bv = b?.[key]
    result[key] = av === undefined ? bv! : bv === undefined ? av : Math.min(av, bv)
  }

  return result
}

function joinLimits(
  a?: Record<string, number>,
  b?: Record<string, number>
): Record<string, number> | undefined {
  if (!a || !b) {
    return undefined
  }

  const result: Record<string, number> = {}

  for (const key of uniqueSorted(
    [...Object.keys(a), ...Object.keys(b)],
    'capability limit keys'
  )) {
    if (a[key] === undefined || b[key] === undefined) {
      continue
    }
    result[key] = Math.max(a[key], b[key])
  }

  return Object.keys(result).length ? result : undefined
}

function meetPermissions(
  a?: Record<string, boolean>,
  b?: Record<string, boolean>
): Record<string, boolean> | undefined {
  if (!a && !b) {
    return undefined
  }

  const result: Record<string, boolean> = {}
  const keys = uniqueSorted(
    [...Object.keys(a ?? {}), ...Object.keys(b ?? {})],
    'capability permission keys'
  )

  for (const key of keys) {
    const av = a?.[key]
    const bv = b?.[key]
    result[key] = av === undefined ? bv! : bv === undefined ? av : av && bv
  }

  return result
}

function joinPermissions(
  a?: Record<string, boolean>,
  b?: Record<string, boolean>
): Record<string, boolean> | undefined {
  if (!a || !b) {
    return undefined
  }

  const result: Record<string, boolean> = {}

  for (const key of uniqueSorted(
    [...Object.keys(a), ...Object.keys(b)],
    'capability permission keys'
  )) {
    if (a[key] === undefined || b[key] === undefined) {
      continue
    }
    result[key] = a[key] || b[key]
  }

  return Object.keys(result).length ? result : undefined
}

function meetScopes(
  a?: CapabilityScope,
  b?: CapabilityScope
): CapabilityScope | undefined | null {
  if (!a && !b) {
    return undefined
  }

  const resources = intersectStrings(a?.resources, b?.resources)
  if (resources === null) {
    return null
  }

  const selectors = meetSelectors(a?.selectors, b?.selectors)
  if (selectors === null) {
    return null
  }

  const limits = meetLimits(a?.limits, b?.limits)
  const permissions = meetPermissions(a?.permissions, b?.permissions)

  return normalizeCapabilityScope({
    ...(resources !== undefined ? { resources } : {}),
    ...(selectors ? { selectors } : {}),
    ...(limits ? { limits } : {}),
    ...(permissions ? { permissions } : {}),
  })
}

function joinScopes(
  a?: CapabilityScope,
  b?: CapabilityScope
): CapabilityScope | undefined {
  if (!a || !b) {
    return undefined
  }

  return normalizeCapabilityScope({
    ...(unionStrings(a.resources, b.resources) !== undefined
      ? { resources: unionStrings(a.resources, b.resources)! }
      : {}),
    ...(joinSelectors(a.selectors, b.selectors)
      ? { selectors: joinSelectors(a.selectors, b.selectors)! }
      : {}),
    ...(joinLimits(a.limits, b.limits)
      ? { limits: joinLimits(a.limits, b.limits)! }
      : {}),
    ...(joinPermissions(a.permissions, b.permissions)
      ? { permissions: joinPermissions(a.permissions, b.permissions)! }
      : {}),
  })
}

export function meetScopedCapabilities(
  a: ScopedCapability,
  b: ScopedCapability
): ScopedCapability | null {
  const left = normalizeScopedCapability(a)
  const right = normalizeScopedCapability(b)

  if (left.capability !== right.capability) {
    return null
  }

  const scope = meetScopes(left.scope, right.scope)
  if (scope === null) {
    return null
  }

  return {
    capability: left.capability,
    ...(scope ? { scope } : {}),
  }
}

export function joinScopedCapabilities(
  a: ScopedCapability,
  b: ScopedCapability
): ScopedCapability | null {
  const left = normalizeScopedCapability(a)
  const right = normalizeScopedCapability(b)

  if (left.capability !== right.capability) {
    return null
  }

  const scope = joinScopes(left.scope, right.scope)

  return {
    capability: left.capability,
    ...(scope ? { scope } : {}),
  }
}

function isStringSubset(child?: string[], parent?: string[]): boolean {
  if (parent === undefined) {
    return true
  }
  if (child === undefined) {
    return false
  }

  const parentSet = new Set(parent)
  return child.every((value) => parentSet.has(value))
}

function isScopeAtMost(child?: CapabilityScope, parent?: CapabilityScope): boolean {
  if (!parent) {
    return true
  }
  if (!child) {
    return false
  }

  if (!isStringSubset(child.resources, parent.resources)) {
    return false
  }

  for (const key of Object.keys(parent.selectors ?? {})) {
    if (!isStringSubset(child.selectors?.[key], parent.selectors?.[key])) {
      return false
    }
  }

  for (const key of Object.keys(parent.limits ?? {})) {
    const childLimit = child.limits?.[key]
    if (childLimit === undefined || childLimit > parent.limits![key]) {
      return false
    }
  }

  for (const key of Object.keys(parent.permissions ?? {})) {
    if (parent.permissions![key] === false && child.permissions?.[key] !== false) {
      return false
    }
  }

  return true
}

export function isScopedCapabilityAtMost(
  child: ScopedCapability,
  parent: ScopedCapability
): boolean {
  const normalizedChild = normalizeScopedCapability(child)
  const normalizedParent = normalizeScopedCapability(parent)

  return (
    normalizedChild.capability === normalizedParent.capability &&
    isScopeAtMost(normalizedChild.scope, normalizedParent.scope)
  )
}

function normalizeBudgetValue(value: number | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number`)
  }
  return value
}

function normalizeResourceBudget(budget?: ResourceBudget): ResourceBudget | undefined {
  if (budget === undefined) {
    return undefined
  }

  assertPlainRecord(budget, 'resource budget')
  assertExactKeys(
    budget,
    [
      'wallTimeMs',
      'cpuTimeMs',
      'memoryBytes',
      'processCount',
      'graphSteps',
      'inputBytes',
      'outputBytes',
      'networkBytes',
      'filesystemBytes',
      'toolCalls',
    ],
    'resource budget'
  )

  const normalized: ResourceBudget = {
    wallTimeMs: normalizeBudgetValue(budget.wallTimeMs, 'wallTimeMs'),
    cpuTimeMs: normalizeBudgetValue(budget.cpuTimeMs, 'cpuTimeMs'),
    memoryBytes: normalizeBudgetValue(budget.memoryBytes, 'memoryBytes'),
    processCount: normalizeBudgetValue(budget.processCount, 'processCount'),
    graphSteps: normalizeBudgetValue(budget.graphSteps, 'graphSteps'),
    inputBytes: normalizeBudgetValue(budget.inputBytes, 'inputBytes'),
    outputBytes: normalizeBudgetValue(budget.outputBytes, 'outputBytes'),
    networkBytes: normalizeBudgetValue(budget.networkBytes, 'networkBytes'),
    filesystemBytes: normalizeBudgetValue(
      budget.filesystemBytes,
      'filesystemBytes'
    ),
    toolCalls: normalizeBudgetValue(budget.toolCalls, 'toolCalls'),
  }

  for (const key of Object.keys(normalized) as (keyof ResourceBudget)[]) {
    if (normalized[key] === undefined) {
      delete normalized[key]
    }
  }

  return Object.keys(normalized).length ? normalized : undefined
}

function minDefined(...values: (number | undefined)[]): number | undefined {
  const defined = values.filter((value): value is number => value !== undefined)
  return defined.length ? Math.min(...defined) : undefined
}

export function meetResourceBudgets(
  budgets: (ResourceBudget | undefined)[]
): ResourceBudget | undefined {
  if (!Array.isArray(budgets)) {
    throw new Error('resource budgets must be an array')
  }

  const normalized = budgets.map(normalizeResourceBudget).filter(Boolean) as ResourceBudget[]

  if (!normalized.length) {
    return undefined
  }

  return normalizeResourceBudget({
    wallTimeMs: minDefined(...normalized.map(({ wallTimeMs }) => wallTimeMs)),
    cpuTimeMs: minDefined(...normalized.map(({ cpuTimeMs }) => cpuTimeMs)),
    memoryBytes: minDefined(...normalized.map(({ memoryBytes }) => memoryBytes)),
    processCount: minDefined(...normalized.map(({ processCount }) => processCount)),
    graphSteps: minDefined(...normalized.map(({ graphSteps }) => graphSteps)),
    inputBytes: minDefined(...normalized.map(({ inputBytes }) => inputBytes)),
    outputBytes: minDefined(...normalized.map(({ outputBytes }) => outputBytes)),
    networkBytes: minDefined(...normalized.map(({ networkBytes }) => networkBytes)),
    filesystemBytes: minDefined(
      ...normalized.map(({ filesystemBytes }) => filesystemBytes)
    ),
    toolCalls: minDefined(...normalized.map(({ toolCalls }) => toolCalls)),
  })
}

function parseTimestamp(value: string, label: string): number {
  const normalized = normalizeToken(value, label)

  if (!EXPLICIT_TIMESTAMP.test(normalized)) {
    throw new Error(`${label} must include an explicit UTC or numeric timezone offset`)
  }

  const timestamp = Date.parse(normalized)
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label} must be a valid timestamp`)
  }
  return timestamp
}

function normalizeGrant(
  grant: CapabilityGrant,
  context: CapabilityAuthorizationContext,
  now: number
): CapabilityGrant {
  assertPlainRecord(grant, 'capability grant')
  assertExactKeys(
    grant,
    [
      'version',
      'grantId',
      'principalId',
      'requestId',
      'operationId',
      'capabilities',
      'issuedAt',
      'expiresAt',
      'budget',
    ],
    'capability grant'
  )

  if (grant.version !== 'unit.capability-grant/1') {
    throw new Error(`unsupported capability grant version: ${String(grant.version)}`)
  }

  const grantId = normalizeToken(grant.grantId, 'capability grant id')
  const principalId = normalizeToken(grant.principalId, 'capability grant principal id')
  const requestId = normalizeToken(grant.requestId, 'capability grant request id')
  const operationId = normalizeToken(grant.operationId, 'capability grant operation id')

  if (principalId !== context.principalId) {
    throw new Error(`capability grant principal mismatch: ${grantId}`)
  }
  if (requestId !== context.requestId) {
    throw new Error(`capability grant request mismatch: ${grantId}`)
  }
  if (operationId !== context.operationId) {
    throw new Error(`capability grant operation mismatch: ${grantId}`)
  }

  const issuedAt = parseTimestamp(grant.issuedAt, 'capability grant issuedAt')
  const expiresAt = parseTimestamp(grant.expiresAt, 'capability grant expiresAt')

  if (expiresAt <= issuedAt) {
    throw new Error(`capability grant expiry must follow issuance: ${grantId}`)
  }
  if (now < issuedAt) {
    throw new Error(`capability grant is not active yet: ${grantId}`)
  }
  if (now >= expiresAt) {
    throw new Error(`capability grant is expired: ${grantId}`)
  }

  return {
    version: 'unit.capability-grant/1',
    grantId,
    principalId,
    requestId,
    operationId,
    capabilities: normalizeCapabilityList(
      grant.capabilities,
      `capability grant ${grantId}`
    ),
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    ...(normalizeResourceBudget(grant.budget)
      ? { budget: normalizeResourceBudget(grant.budget)! }
      : {}),
  }
}

function attenuateOne(
  requested: ScopedCapability,
  layers: CapabilityGrant[]
): ScopedCapability | null {
  if (!layers.length) {
    return null
  }

  let effective: ScopedCapability | null = normalizeScopedCapability(requested)

  for (const layer of layers) {
    const ceiling = layer.capabilities.find(
      ({ capability }) => capability === requested.capability
    )

    if (!ceiling || !effective) {
      return null
    }

    effective = meetScopedCapabilities(effective, ceiling)
  }

  return effective
}

function sameScopedCapability(a: ScopedCapability, b: ScopedCapability): boolean {
  return JSON.stringify(normalizeScopedCapability(a)) === JSON.stringify(normalizeScopedCapability(b))
}

function normalizeConflictRules(
  rules?: CapabilityConflictRule[]
): CapabilityConflictRule[] {
  if (rules === undefined) {
    return []
  }
  if (!Array.isArray(rules)) {
    throw new Error('capability conflict rules must be an array')
  }

  const seenIds = new Set<string>()

  return rules
    .map((rule) => {
      assertPlainRecord(rule, 'capability conflict rule')
      assertExactKeys(rule, ['id', 'allOf'], 'capability conflict rule')

      const id = normalizeToken(rule.id, 'capability conflict rule id')
      if (seenIds.has(id)) {
        throw new Error(`duplicate capability conflict rule id: ${id}`)
      }
      seenIds.add(id)

      if (!Array.isArray(rule.allOf) || !rule.allOf.length) {
        throw new Error(`capability conflict rule must name at least one capability: ${id}`)
      }

      const allOf = Array.from(
        new Set(rule.allOf.map(normalizeCapabilityClass))
      ).sort()

      return { id, allOf }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function compileLeastAuthority(
  request: CapabilityRequest,
  context: CapabilityAuthorizationContext
): CapabilityProof {
  assertPlainRecord(context, 'capability authorization context')
  assertExactKeys(
    context,
    ['principalId', 'requestId', 'operationId', 'layers', 'conflictRules', 'now'],
    'capability authorization context'
  )

  const principalId = normalizeToken(context.principalId, 'authorization principal id')
  const requestId = normalizeToken(context.requestId, 'authorization request id')
  const operationId = normalizeToken(context.operationId, 'authorization operation id')
  const now =
    context.now !== undefined
      ? parseTimestamp(context.now, 'authorization time')
      : Date.now()
  const normalizedRequest = normalizeCapabilityRequest(request)

  if (!Array.isArray(context.layers)) {
    throw new Error('capability authorization layers must be an array')
  }

  const normalizedContext: CapabilityAuthorizationContext = {
    principalId,
    requestId,
    operationId,
    layers: context.layers,
    ...(context.conflictRules !== undefined
      ? { conflictRules: context.conflictRules }
      : {}),
    ...(context.now !== undefined ? { now: context.now } : {}),
  }
  const layers = context.layers.map((grant) =>
    normalizeGrant(grant, normalizedContext, now)
  )
  const seenGrantIds = new Set<string>()

  for (const layer of layers) {
    if (seenGrantIds.has(layer.grantId)) {
      throw new Error(`duplicate capability grant id: ${layer.grantId}`)
    }
    seenGrantIds.add(layer.grantId)
  }

  const effective: ScopedCapability[] = []
  const deniedRequired: ScopedCapability[] = []
  const deniedOptional: ScopedCapability[] = []

  for (const requested of normalizedRequest.required) {
    const attenuated = attenuateOne(requested, layers)
    if (attenuated) {
      effective.push(attenuated)
    } else {
      deniedRequired.push(requested)
    }
  }

  for (const requested of normalizedRequest.optional) {
    const attenuated = attenuateOne(requested, layers)
    if (attenuated) {
      effective.push(attenuated)
    } else {
      deniedOptional.push(requested)
    }
  }

  effective.sort((a, b) => a.capability.localeCompare(b.capability))

  const requestedAll = [...normalizedRequest.required, ...normalizedRequest.optional]
  const residue = requestedAll.filter((requested) => {
    const granted = effective.find(
      ({ capability }) => capability === requested.capability
    )
    return !granted || !sameScopedCapability(requested, granted)
  })

  const effectiveClasses = new Set(effective.map(({ capability }) => capability))
  const conflicts = normalizeConflictRules(context.conflictRules)
    .filter((rule) => rule.allOf.every((capability) => effectiveClasses.has(capability)))
    .map(({ id }) => id)

  const monotonic = effective.every((value) => {
    const requested = requestedAll.find(
      ({ capability }) => capability === value.capability
    )

    return (
      requested !== undefined &&
      isScopedCapabilityAtMost(value, requested) &&
      layers.every((layer) => {
        const ceiling = layer.capabilities.find(
          ({ capability }) => capability === value.capability
        )
        return ceiling !== undefined && isScopedCapabilityAtMost(value, ceiling)
      })
    )
  })
  const budget = meetResourceBudgets(layers.map(({ budget: layerBudget }) => layerBudget))

  return {
    version: 'unit.capability-proof/1',
    requestId,
    operationId,
    principalId,
    grantIds: layers.map(({ grantId }) => grantId),
    requested: normalizedRequest,
    effective,
    deniedRequired,
    deniedOptional,
    residue,
    conflicts,
    monotonic,
    allowed: deniedRequired.length === 0 && conflicts.length === 0 && monotonic,
    ...(budget ? { budget } : {}),
  }
}
