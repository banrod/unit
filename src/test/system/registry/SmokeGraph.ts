import * as assert from 'assert'
import { fromSpec } from '../../../spec/fromSpec'
import _classes from '../../../system/_classes'
import _specs from '../../../system/_specs'
import { GraphSpec } from '../../../types/GraphSpec'
import { system } from '../../util/system'

const INCREMENT_ID = 'fafeadd7-06a8-4bb0-9fa5-2149d1b5208e'
const TAN_ID = '682c1419-d2cc-489d-b95f-a8b7dacada6c'
const IF_ELSE_ID = '92760dd2-ecd9-46db-851f-70950a5b6bc3'

const ensureUnitResolvable = (spec: GraphSpec) => {
  const units = spec.units || {}

  for (const unitId in units) {
    const unitSpec = units[unitId]

    if (!unitSpec?.id) {
      continue
    }

    assert.ok(
      _classes[unitSpec.id] || _specs[unitSpec.id],
      `missing class or composite spec for unit ${unitSpec.id} used by ${spec.name}`
    )
  }
}

const incrementSpec = _specs[INCREMENT_ID] as GraphSpec

assert.ok(incrementSpec, 'increment spec missing in registry')
ensureUnitResolvable(incrementSpec)

const Increment = fromSpec<{ a: number }, { 'a + 1': number }>(
  incrementSpec,
  _specs,
  _classes
)

const increment = new Increment(system)

increment.play()

increment.push('a', 4)
assert.equal(increment.take('a + 1'), 5)
assert.equal(increment.take('a + 1'), undefined)

increment.push('a', -1)
assert.equal(increment.take('a + 1'), 0)
assert.equal(increment.take('a + 1'), undefined)

const tanSpec = _specs[TAN_ID] as GraphSpec

assert.ok(tanSpec, 'tan spec missing in registry')
assert.ok(_classes[TAN_ID], 'tan class missing in registry')

const Tan = _classes[TAN_ID] as any

const tan = new Tan(system)

tan.play()

tan.push('a', Math.PI / 4)
assert.ok(Math.abs(tan.take('tan(a)') - Math.tan(Math.PI / 4)) < 1e-12)
assert.equal(tan.take('tan(a)'), undefined)

const ifElseSpec = _specs[IF_ELSE_ID] as GraphSpec

assert.ok(ifElseSpec, 'if/else spec missing in registry')
ensureUnitResolvable(ifElseSpec)

const IfElse = fromSpec<{ a: any; b: boolean }, { if: any; else: any }>(
  ifElseSpec,
  _specs,
  _classes
)

const ifElse = new IfElse(system)

ifElse.play()

ifElse.push('a', 'left')
ifElse.push('b', true)
assert.equal(ifElse.take('if'), 'left')
assert.equal(ifElse.take('else'), undefined)

ifElse.push('a', 'right')
ifElse.push('b', false)
assert.equal(ifElse.take('else'), 'right')
assert.equal(ifElse.take('if'), undefined)
