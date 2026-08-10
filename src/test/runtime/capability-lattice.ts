import * as assert from 'assert'
import {
  isScopedCapabilityAtMost,
  joinScopedCapabilities,
  meetScopedCapabilities,
} from '../../runtime/capability-calculus'
import { ScopedCapability } from '../../types/Capability'

const fixtures: ScopedCapability[] = [
  { capability: 'network.http' },
  {
    capability: 'network.http',
    scope: {
      resources: ['a', 'b'],
      selectors: { method: ['GET', 'POST'] },
      limits: { bytes: 1000 },
      permissions: { privateNetwork: true },
    },
  },
  {
    capability: 'network.http',
    scope: {
      resources: ['a'],
      selectors: { method: ['GET'] },
      limits: { bytes: 500 },
      permissions: { privateNetwork: false },
    },
  },
  {
    capability: 'network.http',
    scope: {
      resources: ['b'],
      selectors: { method: ['POST'] },
      limits: { bytes: 250 },
      permissions: { privateNetwork: false },
    },
  },
]

function same(
  a: ScopedCapability | null,
  b: ScopedCapability | null
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

for (const value of fixtures) {
  assert.deepEqual(meetScopedCapabilities(value, value), value)
  assert.deepEqual(joinScopedCapabilities(value, value), value)
}

for (const left of fixtures) {
  for (const right of fixtures) {
    const meetLR = meetScopedCapabilities(left, right)
    const meetRL = meetScopedCapabilities(right, left)
    const joinLR = joinScopedCapabilities(left, right)
    const joinRL = joinScopedCapabilities(right, left)

    assert.equal(same(meetLR, meetRL), true, 'meet must be commutative')
    assert.equal(same(joinLR, joinRL), true, 'join must be commutative')

    if (meetLR) {
      assert.equal(isScopedCapabilityAtMost(meetLR, left), true)
      assert.equal(isScopedCapabilityAtMost(meetLR, right), true)
    }

    if (joinLR) {
      assert.equal(isScopedCapabilityAtMost(left, joinLR), true)
      assert.equal(isScopedCapabilityAtMost(right, joinLR), true)
    }

    const absorbMeet = meetScopedCapabilities(left, joinLR!)
    assert.deepEqual(absorbMeet, left)

    if (meetLR) {
      const absorbJoin = joinScopedCapabilities(left, meetLR)
      assert.deepEqual(absorbJoin, left)
    }
  }
}

for (const a of fixtures) {
  for (const b of fixtures) {
    for (const c of fixtures) {
      const abMeet = meetScopedCapabilities(a, b)
      const bcMeet = meetScopedCapabilities(b, c)
      const leftMeet = abMeet ? meetScopedCapabilities(abMeet, c) : null
      const rightMeet = bcMeet ? meetScopedCapabilities(a, bcMeet) : null
      assert.equal(same(leftMeet, rightMeet), true, 'meet must be associative')

      const abJoin = joinScopedCapabilities(a, b)
      const bcJoin = joinScopedCapabilities(b, c)
      const leftJoin = abJoin ? joinScopedCapabilities(abJoin, c) : null
      const rightJoin = bcJoin ? joinScopedCapabilities(a, bcJoin) : null
      assert.equal(same(leftJoin, rightJoin), true, 'join must be associative')
    }
  }
}

assert.equal(
  meetScopedCapabilities(
    { capability: 'network.http', scope: { resources: ['a'] } },
    { capability: 'network.http', scope: { resources: ['b'] } }
  ),
  null
)

assert.equal(
  meetScopedCapabilities(
    { capability: 'network.http' },
    { capability: 'process.spawn' }
  ),
  null
)
