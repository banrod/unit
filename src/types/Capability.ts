export type Capability =
  | 'dom.render'
  | 'filesystem.read'
  | 'filesystem.write'
  | 'media.camera'
  | 'media.microphone'
  | 'network.http'
  | 'network.tcp'
  | 'process.spawn'
  | 'storage.local'
  | `extension.${string}`

export type CapabilityManifest = {
  required?: Capability[]
  optional?: Capability[]
}

export type CapabilityDecision = {
  granted: Capability[]
  deniedRequired: Capability[]
  deniedOptional: Capability[]
  allowed: boolean
}

export type CapabilityScope = {
  resources?: string[]
  selectors?: Record<string, string[]>
  limits?: Record<string, number>
  permissions?: Record<string, boolean>
}

export type ScopedCapability = {
  capability: Capability
  scope?: CapabilityScope
}

export type CapabilityRequest = {
  required?: ScopedCapability[]
  optional?: ScopedCapability[]
}

export type ResourceBudget = {
  wallTimeMs?: number
  cpuTimeMs?: number
  memoryBytes?: number
  processCount?: number
  graphSteps?: number
  inputBytes?: number
  outputBytes?: number
  networkBytes?: number
  filesystemBytes?: number
  toolCalls?: number
}

export type CapabilityGrant = {
  version: 'unit.capability-grant/1'
  grantId: string
  principalId: string
  requestId: string
  operationId: string
  capabilities: ScopedCapability[]
  issuedAt: string
  expiresAt: string
  budget?: ResourceBudget
}

export type CapabilityConflictRule = {
  id: string
  allOf: Capability[]
}

export type CapabilityAuthorizationContext = {
  principalId: string
  requestId: string
  operationId: string
  layers: CapabilityGrant[]
  conflictRules?: CapabilityConflictRule[]
  now?: string
}

export type CapabilityProof = {
  version: 'unit.capability-proof/1'
  requestId: string
  operationId: string
  principalId: string
  grantIds: string[]
  requested: Required<CapabilityRequest>
  effective: ScopedCapability[]
  deniedRequired: ScopedCapability[]
  deniedOptional: ScopedCapability[]
  residue: ScopedCapability[]
  conflicts: string[]
  monotonic: boolean
  allowed: boolean
  budget?: ResourceBudget
}
