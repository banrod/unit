import * as assert from 'assert'
import { hashGraphSpec } from '../../spec/identity'
import {
  runRuntimeConformanceFixture,
  RuntimeConformanceFixture,
} from '../../runtime/conformance'
import {
  GraphRuntime,
  InstantiateGraphOptions,
  RuntimeEvent,
  RuntimeSnapshot,
} from '../../runtime/contract'
import { GraphSpec } from '../../types/GraphSpec'

class MemoryRuntime implements GraphRuntime {
  private data = new Map<string, Record<string, unknown>>()
  private hashes = new Map<string, string>()

  validate(_spec: GraphSpec): void {}

  async instantiate(
    spec: GraphSpec,
    _options?: InstantiateGraphOptions
  ): Promise<string> {
    const graphId = `graph-${this.data.size}`
    this.data.set(graphId, {})
    this.hashes.set(graphId, await hashGraphSpec(spec))
    return graphId
  }

  start(_graphId: string): void {}

  push(graphId: string, pinId: string, data: unknown): void {
    this.data.get(graphId)![pinId] = data
  }

  take(graphId: string, pinId: string): unknown {
    return this.data.get(graphId)![pinId]
  }

  snapshot(graphId: string): RuntimeSnapshot {
    return {
      graphId,
      graphHash: this.hashes.get(graphId)!,
      sequence: 0,
      state: { ...this.data.get(graphId) },
    }
  }

  restore(snapshot: RuntimeSnapshot): string {
    this.data.set(snapshot.graphId, snapshot.state as Record<string, unknown>)
    this.hashes.set(snapshot.graphId, snapshot.graphHash)
    return snapshot.graphId
  }

  stop(_graphId: string): void {}

  async *events(_graphId: string): AsyncIterable<RuntimeEvent> {}
}

const fixture: RuntimeConformanceFixture = {
  name: 'memory passthrough',
  spec: { id: 'conformance-fixture', name: 'conformance fixture' },
  manifest: { required: ['network.http'] },
  availableCapabilities: ['network.http'],
  inputs: [{ pinId: 'value', data: 42 }],
  outputs: [{ pinId: 'value' }],
}

void runRuntimeConformanceFixture(new MemoryRuntime(), fixture)
  .then((result) => {
    assert.deepEqual(result.outputs, { value: 42 })
    assert.equal(result.snapshot.graphHash, result.graphHash)
  })
  .catch((error) => {
    setImmediate(() => {
      throw error
    })
  })
