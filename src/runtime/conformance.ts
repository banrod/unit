import { hashGraphSpec } from '../spec/identity'
import { GraphSpec } from '../types/GraphSpec'
import { Capability, CapabilityManifest } from '../types/Capability'
import { assertCapabilities } from './capability'
import {
  GraphRuntime,
  RuntimeGraphId,
  RuntimeSnapshot,
} from './contract'

export type RuntimeConformanceInput = {
  data: unknown
  pinId: string
}

export type RuntimeConformanceOutput = {
  pinId: string
}

export type RuntimeConformanceFixture = {
  availableCapabilities?: Capability[]
  inputs?: RuntimeConformanceInput[]
  manifest?: CapabilityManifest
  name: string
  outputs?: RuntimeConformanceOutput[]
  spec: GraphSpec
}

export type RuntimeConformanceResult = {
  graphHash: string
  graphId: RuntimeGraphId
  outputs: Record<string, unknown>
  snapshot: RuntimeSnapshot
}

export async function runRuntimeConformanceFixture(
  runtime: GraphRuntime,
  fixture: RuntimeConformanceFixture
): Promise<RuntimeConformanceResult> {
  assertCapabilities(
    fixture.manifest ?? {},
    fixture.availableCapabilities ?? []
  )

  const graphHash = await hashGraphSpec(fixture.spec)
  await runtime.validate(fixture.spec)
  const graphId = await runtime.instantiate(fixture.spec, {
    capabilities: fixture.availableCapabilities,
    manifest: fixture.manifest,
  })

  await runtime.start(graphId)

  for (const input of fixture.inputs ?? []) {
    await runtime.push(graphId, input.pinId, input.data)
  }

  const outputs: Record<string, unknown> = {}
  for (const output of fixture.outputs ?? []) {
    outputs[output.pinId] = await runtime.take(graphId, output.pinId)
  }

  const snapshot = await runtime.snapshot(graphId)
  await runtime.stop(graphId)

  if (snapshot.graphHash !== graphHash) {
    throw new Error(
      `runtime snapshot hash mismatch: expected ${graphHash}, received ${snapshot.graphHash}`
    )
  }

  return { graphHash, graphId, outputs, snapshot }
}
