import * as assert from 'assert'
import {
  canonicalGraphString,
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
