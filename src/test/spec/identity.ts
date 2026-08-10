import * as assert from 'assert'
import {
  canonicalGraphString,
  canonicalizeGraphSpec,
  hashGraphSpec,
} from '../../spec/identity'
import { GraphSpec } from '../../types/GraphSpec'

const left: GraphSpec = {
  id: 'graph',
  system: true,
  name: 'identity fixture',
  metadata: {
    description: 'stable',
    position: { x: 10, y: 20 },
  } as any,
  units: {
    b: { id: 'b' },
    a: { id: 'a' },
  },
}

const right: GraphSpec = {
  units: {
    a: { id: 'a' },
    b: { id: 'b' },
  },
  metadata: {
    position: { x: 999, y: 999 },
    description: 'stable',
  } as any,
  name: 'identity fixture',
  id: 'graph',
}

assert.equal(canonicalGraphString(left), canonicalGraphString(right))
assert.equal(canonicalGraphString({ id: 'x', value: -0 } as any), '{"id":"x","value":0}')
assert.throws(
  () => canonicalGraphString({ id: 'x', value: Infinity } as any),
  /non-finite/
)

const protoInput = JSON.parse('{"id":"proto","__proto__":{"polluted":true}}') as GraphSpec
const protoCanonical = canonicalizeGraphSpec(protoInput, {
  omitMetadataKeys: [],
  omitRootKeys: [],
}) as GraphSpec & Record<string, unknown>

assert.equal(Object.getPrototypeOf(protoCanonical), Object.prototype)
assert.equal(Object.prototype.hasOwnProperty.call(protoCanonical, '__proto__'), true)
assert.deepEqual(protoCanonical['__proto__'], { polluted: true })
assert.equal(({} as { polluted?: boolean }).polluted, undefined)
assert.equal(
  canonicalGraphString(protoInput, {
    omitMetadataKeys: [],
    omitRootKeys: [],
  }),
  '{"__proto__":{"polluted":true},"id":"proto"}'
)

assert.throws(
  () => canonicalGraphString({ id: 'date', value: new Date() } as any),
  /plain JSON objects/
)
assert.throws(
  () => canonicalGraphString({ id: 'map', value: new Map() } as any),
  /plain JSON objects/
)

class GraphLike {
  id = 'class-instance'
}

assert.throws(
  () => canonicalGraphString(new GraphLike() as unknown as GraphSpec),
  /plain JSON objects/
)

const symbolGraph = { id: 'symbol' } as GraphSpec & Record<PropertyKey, unknown>
symbolGraph[Symbol('hidden')] = true
assert.throws(() => canonicalGraphString(symbolGraph), /symbol keys/)

const accessorGraph: Record<string, unknown> = { id: 'accessor' }
Object.defineProperty(accessorGraph, 'danger', {
  enumerable: true,
  get() {
    throw new Error('getter must not execute')
  },
})
assert.throws(
  () => canonicalGraphString(accessorGraph as GraphSpec),
  /accessor properties/
)

void Promise.all([hashGraphSpec(left), hashGraphSpec(right)])
  .then(([leftHash, rightHash]) => {
    assert.equal(leftHash, rightHash)
    assert.match(leftHash, /^[a-f0-9]{64}$/)
  })
  .catch((error) => {
    setImmediate(() => {
      throw error
    })
  })
