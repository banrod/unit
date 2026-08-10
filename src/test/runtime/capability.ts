import * as assert from 'assert'
import {
  assertCapabilities,
  evaluateCapabilityManifest,
  normalizeCapabilityManifest,
} from '../../runtime/capability'
import { CapabilityManifest } from '../../types/Capability'

const manifest = normalizeCapabilityManifest({
  required: ['network.http', 'network.http'],
  optional: ['media.microphone', 'network.http'],
})

assert.deepEqual(manifest, {
  required: ['network.http'],
  optional: ['media.microphone'],
})

assert.deepEqual(
  normalizeCapabilityManifest({
    required: [' network.http ' as 'network.http'],
    optional: ['network.http', ' media.microphone ' as 'media.microphone'],
  }),
  {
    required: ['network.http'],
    optional: ['media.microphone'],
  }
)

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

assert.throws(
  () =>
    normalizeCapabilityManifest({
      required: ['network.http'],
      availableCapabilities: ['process.spawn'],
    } as unknown as CapabilityManifest),
  /capability manifest contains unknown key/
)

assert.throws(
  () =>
    normalizeCapabilityManifest({
      required: ['network.http.elevated'],
    } as unknown as CapabilityManifest),
  /unsupported capability class/
)

assert.throws(
  () =>
    normalizeCapabilityManifest({
      required: 'network.http',
    } as unknown as CapabilityManifest),
  /required capabilities must be an array/
)
