import * as assert from 'assert'
import { hashGraphSpec } from '../../spec/identity'
import {
  classifyRuntimeSourceModality,
  normalizeRuntimeSources,
  runRuntimeInvocation,
  RuntimeAuthorization,
  RuntimeInvocation,
} from '../../runtime/interoperability'
import {
  GraphRuntime,
  InstantiateGraphOptions,
  RuntimeAuthorityEnforcement,
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
      digest: 'ABC123',
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

assert.throws(
  () =>
    normalizeRuntimeSources([
      {
        id: 'bad-source',
        kind: 'uri',
        unexpected: true,
      } as unknown as never,
    ]),
  /runtime source contains unknown key/
)

class MemoryRuntime implements GraphRuntime {
  readonly authorityEnforcement: RuntimeAuthorityEnforcement = {
    scopedCapabilities: 'unit.scoped-capabilities/1',
    resourceBudgets: 'unit.resource-budgets/1',
  }
  private data = new Map<string, Record<string, unknown>>()
  private hashes = new Map<string, string>()
  public stopped: string[] = []
  public options: InstantiateGraphOptions[] = []

  validate(_spec: GraphSpec): void {}

  async instantiate(
    spec: GraphSpec,
    options: InstantiateGraphOptions = {}
  ): Promise<string> {
    const graphId = `graph-${this.data.size}`
    this.data.set(graphId, {})
    this.hashes.set(graphId, await hashGraphSpec(spec))
    this.options.push(options)
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

class UnsupportedAuthorityRuntime extends MemoryRuntime {
  override readonly authorityEnforcement: RuntimeAuthorityEnforcement = {}
}

class ScopeOnlyRuntime extends MemoryRuntime {
  override readonly authorityEnforcement: RuntimeAuthorityEnforcement = {
    scopedCapabilities: 'unit.scoped-capabilities/1',
  }
}

class PushFailureRuntime extends MemoryRuntime {
  push(_graphId: string, _pinId: string, _data: unknown): void {
    throw new Error('push failure')
  }
}

const invocation: RuntimeInvocation = {
  requestId: ' expression-route-1 ',
  operationId: ' render-expression ',
  spec: { id: 'interop-fixture', name: 'interoperability fixture' },
  capabilityRequest: {
    required: [
      {
        capability: 'network.http',
        scope: {
          resources: ['https://api.github.com', 'https://example.invalid'],
          selectors: { method: ['GET', 'POST'] },
        },
      },
    ],
    optional: [{ capability: 'media.microphone' }],
  },
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

function authorizationFor(
  requestId: string,
  operationId = 'render-expression'
): RuntimeAuthorization {
  return {
    principalId: 'principal-1',
    manifest: {
      required: ['network.http'],
      optional: ['media.microphone'],
    },
    now: '2026-08-10T12:00:00.000Z',
    layers: [
      {
        version: 'unit.capability-grant/1',
        grantId: `grant-${requestId}`,
        principalId: 'principal-1',
        requestId,
        operationId,
        capabilities: [
          {
            capability: 'network.http',
            scope: {
              resources: ['https://api.github.com'],
              selectors: { method: ['GET'] },
            },
          },
        ],
        issuedAt: '2026-08-10T00:00:00.000Z',
        expiresAt: '2026-08-11T00:00:00.000Z',
        budget: { networkBytes: 1000, toolCalls: 1 },
      },
    ],
  }
}

const runtime = new MemoryRuntime()

void runRuntimeInvocation(
  runtime,
  invocation,
  authorizationFor('expression-route-1')
)
  .then((result) => {
    assert.deepEqual(result.outputs, { value: 42 })
    assert.equal(result.evidence.version, 'unit.runtime-evidence/2')
    assert.equal(result.evidence.requestId, 'expression-route-1')
    assert.equal(result.evidence.operationId, 'render-expression')
    assert.equal(result.evidence.principalId, 'principal-1')
    assert.equal(result.evidence.sources[0].modality, 'text')
    assert.equal(result.evidence.sources[0].digest, 'ABCDEF')
    assert.deepEqual(result.evidence.inputs, [
      { pinId: 'value', sourceId: 'source-1' },
    ])
    assert.equal(result.evidence.capabilities.allowed, true)
    assert.equal(result.evidence.capabilities.monotonic, true)
    assert.deepEqual(result.evidence.capabilities.grantIds, [
      'grant-expression-route-1',
    ])
    assert.deepEqual(result.evidence.capabilities.deniedOptional, [
      { capability: 'media.microphone' },
    ])
    assert.deepEqual(result.evidence.capabilities.effective, [
      {
        capability: 'network.http',
        scope: {
          resources: ['https://api.github.com'],
          selectors: { method: ['GET'] },
        },
      },
    ])
    assert.deepEqual(result.evidence.capabilities.budget, {
      networkBytes: 1000,
      toolCalls: 1,
    })
    assert.deepEqual(result.evidence.enforcement, {
      scopedCapabilities: 'unit.scoped-capabilities/1',
      resourceBudgets: 'unit.resource-budgets/1',
    })
    assert.equal(result.evidence.snapshot.sequence, 7)
    assert.equal(result.evidence.graphHash, result.snapshot.graphHash)
    assert.deepEqual(runtime.stopped, ['graph-0'])
    assert.deepEqual(runtime.options[0].capabilities, ['network.http'])
    assert.deepEqual(runtime.options[0].manifest, {
      required: ['network.http'],
      optional: ['media.microphone'],
    })
    assert.deepEqual(
      runtime.options[0].scopedCapabilities,
      result.evidence.capabilities.effective
    )
  })
  .catch((error) => {
    setImmediate(() => {
      throw error
    })
  })

const forgedRuntime = new MemoryRuntime()
const forgedInvocation = {
  ...invocation,
  requestId: 'forged-request',
  availableCapabilities: ['process.spawn'],
  manifest: {
    required: ['process.spawn'],
  },
}

void runRuntimeInvocation(
  forgedRuntime,
  forgedInvocation,
  authorizationFor('forged-request')
)
  .then(
    () => {
      throw new Error('expected forged invocation schema to be rejected')
    },
    (error) => {
      assert.match(String(error), /runtime invocation contains unknown key/)
      assert.deepEqual(forgedRuntime.options, [])
      assert.deepEqual(forgedRuntime.stopped, [])
    }
  )
  .catch((error) => {
    setImmediate(() => {
      throw error
    })
  })

const unsupportedRuntime = new UnsupportedAuthorityRuntime()

void runRuntimeInvocation(
  unsupportedRuntime,
  {
    ...invocation,
    requestId: 'unsupported-scope',
  },
  authorizationFor('unsupported-scope')
)
  .then(
    () => {
      throw new Error('expected scoped capability enforcement refusal')
    },
    (error) => {
      assert.match(String(error), /scoped capability enforcement is required/)
      assert.deepEqual(unsupportedRuntime.options, [])
      assert.deepEqual(unsupportedRuntime.stopped, [])
    }
  )
  .catch((error) => {
    setImmediate(() => {
      throw error
    })
  })

const scopeOnlyRuntime = new ScopeOnlyRuntime()

void runRuntimeInvocation(
  scopeOnlyRuntime,
  {
    ...invocation,
    requestId: 'unsupported-budget',
  },
  authorizationFor('unsupported-budget')
)
  .then(
    () => {
      throw new Error('expected resource budget enforcement refusal')
    },
    (error) => {
      assert.match(String(error), /resource budget enforcement is required/)
      assert.deepEqual(scopeOnlyRuntime.options, [])
      assert.deepEqual(scopeOnlyRuntime.stopped, [])
    }
  )
  .catch((error) => {
    setImmediate(() => {
      throw error
    })
  })

const failingRuntime = new PushFailureRuntime()

void runRuntimeInvocation(
  failingRuntime,
  {
    ...invocation,
    requestId: 'expression-route-failure',
  },
  authorizationFor('expression-route-failure')
)
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
