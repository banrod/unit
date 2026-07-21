import * as assert from 'assert'
import {
  assertCapabilities,
  evaluateCapabilityManifest,
  normalizeCapabilityManifest,
} from '../../runtime/capability'

const manifest = normalizeCapabilityManifest({
  required: ['network.http', 'network.http'],
  optional: ['media.microphone', 'network.http'],
})

assert.deepEqual(manifest, {
  required: ['network.http'],
  optional: ['media.microphone'],
})

assert.deepEqual(evaluateCapabilityManifest(manifest, ['network.http']), {
  granted: ['network.http'],
  deniedRequired: [],
  deniedOptional: ['media.microphone'],
  allowed: true,
})

assert.throws(
  () => assertCapabilities(manifest, ['media.microphone']),
  /network\.http/
)
