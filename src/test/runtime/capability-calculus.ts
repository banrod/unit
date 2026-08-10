import * as assert from 'assert'
import {
  compileLeastAuthority,
  isScopedCapabilityAtMost,
  joinScopedCapabilities,
  meetScopedCapabilities,
  normalizeCapabilityClass,
  normalizeCapabilityScope,
} from '../../runtime/capability-calculus'
import {
  Capability,
  CapabilityGrant,
  ScopedCapability,
} from '../../types/Capability'

const requested: ScopedCapability = {
  capability: 'network.http',
  scope: {
    resources: ['https://api.github.com', 'https://example.invalid'],
    selectors: { method: ['GET', 'POST'] },
    limits: { responseBytes: 900 },
    permissions: { privateNetwork: false },
  },
}

const hostCeiling: ScopedCapability = {
  capability: 'network.http',
  scope: {
    resources: ['https://api.github.com', 'https://internal.invalid'],
    selectors: { method: ['GET', 'POST'] },
    limits: { responseBytes: 1000 },
    permissions: { privateNetwork: false },
  },
}

const routeCeiling: ScopedCapability = {
  capability: 'network.http',
  scope: {
    resources: ['https://api.github.com'],
    selectors: { method: ['GET'] },
    limits: { responseBytes: 500 },
    permissions: { privateNetwork: false },
  },
}

assert.deepEqual(meetScopedCapabilities(requested, hostCeiling), {
  capability: 'network.http',
  scope: {
    resources: ['https://api.github.com'],
    selectors: { method: ['GET', 'POST'] },
    limits: { responseBytes: 900 },
    permissions: { privateNetwork: false },
  },
})

assert.deepEqual(joinScopedCapabilities(routeCeiling, hostCeiling), {
  capability: 'network.http',
  scope: {
    resources: ['https://api.github.com', 'https://internal.invalid'],
    selectors: { method: ['GET', 'POST'] },
    limits: { responseBytes: 1000 },
    permissions: { privateNetwork: false },
  },
})

assert.equal(isScopedCapabilityAtMost(routeCeiling, hostCeiling), true)
assert.equal(isScopedCapabilityAtMost(hostCeiling, routeCeiling), false)
assert.equal(normalizeCapabilityClass('extension.example'), 'extension.example')
assert.throws(
  () => normalizeCapabilityClass('network.http.elevated' as Capability),
  /unsupported capability class/
)
assert.throws(
  () => normalizeCapabilityClass('extension.' as Capability),
  /unsupported capability class/
)
assert.throws(
  () => normalizeCapabilityClass('extension.Example' as Capability),
  /unsupported capability class/
)
assert.throws(
  () => normalizeCapabilityScope({ resources: [] }),
  /at least one resource/
)
assert.throws(
  () => normalizeCapabilityScope({ selectors: { method: [] } }),
  /selector must allow at least one value/
)
assert.throws(
  () =>
    normalizeCapabilityScope({
      resources: ['https://api.github.com'],
      scopee: ['https://evil.invalid'],
    } as unknown as never),
  /capability scope contains unknown key: scopee/
)
assert.throws(
  () =>
    normalizeCapabilityScope({
      permissions: { privateNetwork: 'false' },
    } as unknown as never),
  /capability permission must be boolean/
)
assert.throws(
  () =>
    normalizeCapabilityScope({
      selectors: { constructor: ['GET'] },
    }),
  /reserved/
)

function grant(
  grantId: string,
  capabilities: ScopedCapability[],
  budget?: { networkBytes?: number; toolCalls?: number }
): CapabilityGrant {
  return {
    version: 'unit.capability-grant/1',
    grantId,
    principalId: 'principal-1',
    requestId: 'request-1',
    operationId: 'operation-1',
    capabilities,
    issuedAt: '2026-08-10T00:00:00.000Z',
    expiresAt: '2026-08-11T00:00:00.000Z',
    budget,
  }
}

const proof = compileLeastAuthority(
  { required: [requested] },
  {
    principalId: 'principal-1',
    requestId: 'request-1',
    operationId: 'operation-1',
    now: '2026-08-10T12:00:00.000Z',
    layers: [
      grant('host', [hostCeiling], { networkBytes: 1000, toolCalls: 4 }),
      grant('route', [routeCeiling], { networkBytes: 600, toolCalls: 2 }),
    ],
  }
)

assert.equal(proof.allowed, true)
assert.equal(proof.monotonic, true)
assert.deepEqual(proof.grantIds, ['host', 'route'])
assert.deepEqual(proof.effective, [routeCeiling])
assert.deepEqual(proof.residue, [requested])
assert.deepEqual(proof.budget, { networkBytes: 600, toolCalls: 2 })

const denied = compileLeastAuthority(
  {
    required: [{ capability: 'process.spawn' }],
    optional: [{ capability: 'network.http' }],
  },
  {
    principalId: 'principal-1',
    requestId: 'request-1',
    operationId: 'operation-1',
    now: '2026-08-10T12:00:00.000Z',
    layers: [grant('network-only', [hostCeiling])],
  }
)

assert.equal(denied.allowed, false)
assert.deepEqual(denied.deniedRequired, [{ capability: 'process.spawn' }])

const noGrantRequired = compileLeastAuthority(
  { required: [{ capability: 'network.http' }] },
  {
    principalId: 'principal-1',
    requestId: 'request-1',
    operationId: 'operation-1',
    now: '2026-08-10T12:00:00.000Z',
    layers: [],
  }
)

assert.equal(noGrantRequired.allowed, false)
assert.deepEqual(noGrantRequired.effective, [])
assert.deepEqual(noGrantRequired.deniedRequired, [
  { capability: 'network.http' },
])

const noGrantOptional = compileLeastAuthority(
  { optional: [{ capability: 'network.http' }] },
  {
    principalId: 'principal-1',
    requestId: 'request-1',
    operationId: 'operation-1',
    now: '2026-08-10T12:00:00.000Z',
    layers: [],
  }
)

assert.equal(noGrantOptional.allowed, true)
assert.deepEqual(noGrantOptional.effective, [])
assert.deepEqual(noGrantOptional.deniedOptional, [
  { capability: 'network.http' },
])

const noGrantNoAuthority = compileLeastAuthority(
  {},
  {
    principalId: 'principal-1',
    requestId: 'request-1',
    operationId: 'operation-1',
    now: '2026-08-10T12:00:00.000Z',
    layers: [],
  }
)

assert.equal(noGrantNoAuthority.allowed, true)
assert.deepEqual(noGrantNoAuthority.effective, [])

const conflict = compileLeastAuthority(
  {
    required: [
      { capability: 'network.http' },
      { capability: 'process.spawn' },
    ],
  },
  {
    principalId: 'principal-1',
    requestId: 'request-1',
    operationId: 'operation-1',
    now: '2026-08-10T12:00:00.000Z',
    layers: [
      grant('broad-host', [
        { capability: 'network.http' },
        { capability: 'process.spawn' },
      ]),
    ],
    conflictRules: [
      {
        id: 'unrestricted-network-plus-process',
        allOf: ['network.http', 'process.spawn'],
      },
    ],
  }
)

assert.equal(conflict.allowed, false)
assert.deepEqual(conflict.conflicts, ['unrestricted-network-plus-process'])

assert.throws(
  () =>
    compileLeastAuthority(
      { required: [{ capability: 'network.http' }] },
      {
        principalId: 'principal-1',
        requestId: 'request-1',
        operationId: 'operation-1',
        now: '2026-08-10T12:00:00.000Z',
        layers: [
          grant('duplicate', [hostCeiling]),
          grant('duplicate', [routeCeiling]),
        ],
      }
    ),
  /duplicate capability grant id/
)

assert.throws(
  () =>
    compileLeastAuthority(
      { required: [{ capability: 'network.http' }] },
      {
        principalId: 'principal-1',
        requestId: 'request-1',
        operationId: 'operation-1',
        now: '2026-08-10T12:00:00.000Z',
        layers: [
          {
            ...grant('unknown-grant-key', [hostCeiling]),
            parentGrantId: 'not-supported-in-v0.1',
          } as unknown as CapabilityGrant,
        ],
      }
    ),
  /capability grant contains unknown key: parentGrantId/
)

assert.throws(
  () =>
    compileLeastAuthority(
      { required: [{ capability: 'network.http' }] },
      {
        principalId: 'principal-1',
        requestId: 'request-1',
        operationId: 'operation-1',
        now: '2026-08-10T12:00:00',
        layers: [grant('ambiguous-time', [hostCeiling])],
      }
    ),
  /explicit UTC or numeric timezone offset/
)

assert.throws(
  () =>
    compileLeastAuthority(
      { required: [{ capability: 'network.http' }] },
      {
        principalId: 'principal-1',
        requestId: 'request-1',
        operationId: 'operation-1',
        now: '2026-08-10T12:00:00.000Z',
        layers: [
          {
            ...grant('grant-ambiguous-time', [hostCeiling]),
            issuedAt: '2026-08-10T00:00:00',
          },
        ],
      }
    ),
  /explicit UTC or numeric timezone offset/
)

assert.throws(
  () =>
    compileLeastAuthority(
      { required: [{ capability: 'network.http' }] },
      {
        principalId: 'principal-1',
        requestId: 'request-1',
        operationId: 'operation-1',
        now: '2026-08-10T12:00:00.000Z',
        layers: [grant('duplicate-conflict-host', [hostCeiling])],
        conflictRules: [
          { id: 'same-rule', allOf: ['network.http'] },
          { id: 'same-rule', allOf: ['network.http'] },
        ],
      }
    ),
  /duplicate capability conflict rule id/
)

assert.throws(
  () =>
    compileLeastAuthority(
      { required: [{ capability: 'network.http' }] },
      {
        principalId: 'principal-1',
        requestId: 'request-1',
        operationId: 'operation-1',
        now: '2026-08-12T00:00:00.000Z',
        layers: [grant('expired', [hostCeiling])],
      }
    ),
  /expired/
)

assert.throws(
  () =>
    compileLeastAuthority(
      { required: [{ capability: 'network.http' }] },
      {
        principalId: 'principal-2',
        requestId: 'request-1',
        operationId: 'operation-1',
        now: '2026-08-10T12:00:00.000Z',
        layers: [grant('wrong-principal', [hostCeiling])],
      }
    ),
  /principal mismatch/
)

const scopeCases = [
  ['https://api.github.com'],
  ['https://api.github.com', 'https://example.invalid'],
  ['https://example.invalid'],
]

for (const resources of scopeCases) {
  const requestCapability: ScopedCapability = {
    capability: 'network.http',
    scope: { resources },
  }
  const propertyProof = compileLeastAuthority(
    { required: [requestCapability] },
    {
      principalId: 'principal-1',
      requestId: 'request-1',
      operationId: 'operation-1',
      now: '2026-08-10T12:00:00.000Z',
      layers: [grant('property-host', [hostCeiling])],
    }
  )

  for (const effective of propertyProof.effective) {
    assert.equal(isScopedCapabilityAtMost(effective, requestCapability), true)
    assert.equal(isScopedCapabilityAtMost(effective, hostCeiling), true)
  }
}
