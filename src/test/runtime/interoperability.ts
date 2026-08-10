import * as assert from 'assert'
import { hashGraphSpec } from '../../spec/identity'
import {
  classifyRuntimeSourceModality,
  normalizeRuntimeSources,
  runRuntimeInvocation,
  RuntimeInvocation,
} from '../../runtime/interoperability'
import {
  GraphRuntime,
  InstantiateGraphOptions,
  RuntimeEvent,
  RuntimeSnapshot,
} from '../../runtime/contract'
import { GraphSpec } from '../../types/GraphSpec'

assert.equal(classifyRuntimeSourceModality('image/png'), 'image')
assert.equal(classifyRuntimeSourceModality('application/ld+json'), 'structured')
assert.equal(classifyRuntimeSourceModality(undefined), 'binary')

assert.deepEqual(
  normalizeRuntimeSources([
    {
      id: 'source-b',
      kind: 'uri',
      mediaType: ' IMAGE/PNG ',
      locator: ' https://example.invalid/b.png ',
    },
    {
      id: 'source-a',
      kind: 'inline',
      mediaType: 'application/json',
      digest: ' ABC123 ',
    },
  ]),
  [
    {
      id: 'source-a',
      kind: 'inline',
      modality: 'structured',
      mediaType: 'application/json',
      digest: 'abc123',
    },
    {
      id: 'source-b',
      kind: 'uri',
      modality: 'image',
      mediaType: 'image/png',
      locator: 'https://example.invalid/b.png',
    },
  ]
)

assert.throws(
  () =>
    normalizeRuntimeSources([
      { id: 'duplicate', kind: 'inline' },
      { id: 'duplicate', kind: 'inline' },
    ]),
  /duplicate runtime source id/
)

class MemoryRuntime implements GraphRuntime {
  private data = new Map<string, Record<string, unknown>>()
  private hashes = new Map<string, string>()
  public stopped: string[] = []

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
      sequence: 7,
      state: { ...this.data.get(graphId) },
    }
  }

  restore(snapshot: RuntimeSnapshot): string {
    this.data.set(snapshot.graphId, snapshot.state as Record<string, unknown>)
    this.hashes.set(snapshot.graphId, snapshot.graphHash)
    return snapshot.graphId
  }

  stop(graphId: string): void {
    this.stopped.push(graphId)
  }

  async *events(_graphId: string): AsyncIterable<RuntimeEvent> {}
}

class PushFailureRuntime extends MemoryRuntime {
  push(_graphId: string, _pinId: string, _data: unknown): void {
    throw new Error('push failure')
  }
}

const invocation: RuntimeInvocation = {
  requestId: ' expression-route-1 ',
  spec: { id: 'interop-fixture', name: 'interoperability fixture' },
  manifest: {
    required: ['network.http'],
    optional: ['media.microphone'],
  },
  availableCapabilities: ['network.http'],
  sources: [
    {
      id: 'source-1',
      kind: 'inline',
      mediaType: 'text/plain',
      digest: 'ABCDEF',
    },
  ],
  inputs: [{ pinId: 'value', sourceId: 'source-1', data: 42 }],
  outputs: [{ pinId: 'value' }],
}

const runtime = new MemoryRuntime()

void runRuntimeInvocation(runtime, invocation)
  .then((result) => {
    assert.deepEqual(result.outputs, { value: 42 })
    assert.equal(result.evidence.requestId, 'expression-route-1')
    assert.equal(result.evidence.sources[0].modality, 'text')
    assert.equal(result.evidence.sources[0].digest, 'abcdef')
    assert.deepEqual(result.evidence.inputs, [
      { pinId: 'value', sourceId: 'source-1' },
    ])
    assert.deepEqual(result.evidence.capabilities, {
      required: ['network.http'],
      optional: ['media.microphone'],
      granted: ['network.http'],
      deniedRequired: [],
      deniedOptional: ['media.microphone'],
      allowed: true,
    })
    assert.equal(result.evidence.snapshot.sequence, 7)
    assert.equal(result.evidence.graphHash, result.snapshot.graphHash)
    assert.deepEqual(runtime.stopped, ['graph-0'])
  })
  .catch((error) => {
    setImmediate(() => {
      throw error
    })
  })

const failingRuntime = new PushFailureRuntime()

void runRuntimeInvocation(failingRuntime, {
  ...invocation,
  requestId: 'expression-route-failure',
})
  .then(
    () => {
      throw new Error('expected runtime invocation to fail')
    },
    (error) => {
      assert.match(String(error), /push failure/)
      assert.deepEqual(failingRuntime.stopped, ['graph-0'])
    }
  )
  .catch((error) => {
    setImmediate(() => {
      throw error
    })
  })
