import * as assert from 'assert'
import { fromSpec } from '../../../spec/fromSpec'
import _classes from '../../../system/_classes'
import _specs from '../../../system/_specs'
import { GraphSpec } from '../../../types/GraphSpec'
import { system } from '../../util/system'

const INCREMENT_ID = 'fafeadd7-06a8-4bb0-9fa5-2149d1b5208e'
const TAN_ID = '682c1419-d2cc-489d-b95f-a8b7dacada6c'

const ensureUnitClasses = (spec: GraphSpec) => {
  const units = spec.units || {}

  for (const unitId in units) {
    const unitSpec = units[unitId]

    if (!unitSpec?.id) {
      continue
    }

    assert.ok(
      _classes[unitSpec.id],
      `missing class for unit ${unitSpec.id} used by ${spec.name}`
    )
  }
}

const incrementSpec = _specs[INCREMENT_ID] as GraphSpec

assert.ok(incrementSpec, 'increment spec missing in registry')
ensureUnitClasses(incrementSpec)

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
