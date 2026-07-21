import { GraphSpec } from '../types/GraphSpec'
import { Capability, CapabilityManifest } from '../types/Capability'

export type RuntimeGraphId = string
export type RuntimePinDirection = 'input' | 'output'

export type RuntimeEvent = {
  sequence: number
  timestamp: number
  type:
    | 'capability.requested'
    | 'error.raised'
    | 'graph.created'
    | 'graph.started'
    | 'graph.stopped'
    | 'merge.propagated'
    | 'pin.emitted'
    | 'pin.received'
    | 'snapshot.created'
    | 'unit.activated'
  graphId: RuntimeGraphId
  unitId?: string
  pinId?: string
  data?: unknown
}

export type RuntimeSnapshot = {
  graphId: RuntimeGraphId
  graphHash: string
  sequence: number
  state: unknown
}

export type InstantiateGraphOptions = {
  capabilities?: Capability[]
  manifest?: CapabilityManifest
}

export interface GraphRuntime {
  validate(spec: GraphSpec): Promise<void> | void
  instantiate(
    spec: GraphSpec,
    options?: InstantiateGraphOptions
  ): Promise<RuntimeGraphId> | RuntimeGraphId
  start(graphId: RuntimeGraphId): Promise<void> | void
  push(
    graphId: RuntimeGraphId,
    pinId: string,
    data: unknown
  ): Promise<void> | void
  take(graphId: RuntimeGraphId, pinId: string): Promise<unknown> | unknown
  snapshot(graphId: RuntimeGraphId): Promise<RuntimeSnapshot> | RuntimeSnapshot
  restore(snapshot: RuntimeSnapshot): Promise<RuntimeGraphId> | RuntimeGraphId
  stop(graphId: RuntimeGraphId): Promise<void> | void
  events(graphId: RuntimeGraphId): AsyncIterable<RuntimeEvent>
}
