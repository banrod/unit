# Unit Kernel Contract

Status: candidate contract for the post-consolidation kernel line.

## Purpose

Unit is the deterministic graph execution substrate. Product-specific orchestration,
identity, policy, memory, prompts, approvals, and user experience belong to downstream
systems and adapters.

A Unit program is a graph of multi-input, multi-output state machines. Hosts provide
platform capabilities and authority inputs; the kernel validates, instantiates, executes,
snapshots, and stops graphs without requiring knowledge of the host product.

## Supported host operations

The TypeScript interface is published in `src/runtime/contract.ts`.

A conforming host provides:

1. `validate(spec)` — reject structurally invalid graph specifications.
2. `instantiate(spec, options)` — create an isolated graph instance after capability evaluation.
3. `start(graphId)` — transition an instantiated graph into execution.
4. `push(graphId, pinId, data)` — deliver data to an exposed input pin.
5. `take(graphId, pinId)` — consume data from an exposed output pin.
6. `snapshot(graphId)` — capture restorable state tied to a canonical graph hash.
7. `restore(snapshot)` — create an equivalent graph instance from a snapshot.
8. `stop(graphId)` — halt execution and release resources.
9. `events(graphId)` — expose the ordered low-level runtime event stream.

A runtime may additionally advertise authority-enforcement conformance through
`authorityEnforcement`:

```text
unit.scoped-capabilities/1
unit.resource-budgets/1
```

Advertising a marker means the runtime or attached resource adapters enforce that
contract. The interoperability helper refuses a scoped/budgeted invocation when the
required marker is missing.

## Graph identity

`src/spec/identity.ts` defines canonical graph serialization and SHA-256 identity.

Canonicalization:

- sorts object keys recursively;
- preserves array order;
- normalizes negative zero to zero;
- accepts only plain JSON-shaped objects and arrays;
- rejects non-finite numbers, functions, symbols, bigint values, class instances,
  accessors, and symbol keys;
- creates canonical object keys as data properties so names such as `__proto__` do not
  mutate the canonical object's prototype;
- removes root-level generated `system` state by default;
- removes known nonsemantic editor metadata such as viewport, selection, layout,
  position, and generated timestamps by default.

Callers may override omitted root and metadata keys. The hardened interoperability path
uses no omission lists for the execution copy, so all supplied graph fields participate in
that execution hash.

A graph hash is the lowercase hexadecimal SHA-256 digest of canonical UTF-8 JSON. Runtime
snapshots additionally carry execution sequence and mutable state.

## Capability model

Capability types are defined in `src/types/Capability.ts`.

Two related surfaces exist:

1. `src/runtime/capability.ts` provides class-level manifest normalization/evaluation for
   generic and legacy runtime use.
2. `src/runtime/capability-calculus.ts` provides scoped least-authority evaluation for the
   hardened interoperability path.

Both surfaces runtime-validate capability vocabulary rather than relying only on TypeScript
unions.

In `runRuntimeInvocation`, the capability-class manifest is supplied by the trusted host in
`RuntimeAuthorization`, not by the caller-visible `RuntimeInvocation`. The caller may only
refine a host-declared capability with scope. Required host declarations cannot be removed
through caller omission.

The kernel evaluates generic authority contracts. It does not decide organizational policy.
The host is responsible for deriving principal identity, required/optional capability
classes, grants, ceilings, conflict rules, resource-specific canonicalization, and approval
policy.

Canonical capability classes include:

- `dom.render`
- `filesystem.read`
- `filesystem.write`
- `media.camera`
- `media.microphone`
- `network.http`
- `network.tcp`
- `process.spawn`
- `storage.local`
- syntactically valid namespaced `extension.*` capabilities

See [Capability Calculus v0.1](capability-calculus.md) for scoped meet/partial-order
semantics, host-bound grants, default denial, resource budgets, and generic conflict rules.

## Authority boundary

A caller-visible invocation cannot carry host-granted authority. Effective authority is the
intersection of requested scope and all trusted grant/ceiling layers. Required authority
without a trusted grant fails closed.

Flat capability classes must not be used to erase surviving scope. A scoped or budgeted
proof is executable only on a runtime advertising the corresponding enforcement contract.
Resource-specific enforcement remains the responsibility of the relevant adapter/runtime.

Unit does not provide organization policy, credential brokerage, durable replay/revocation,
SSRF/DNS policy, filesystem path policy, browser-profile isolation, or an OS hostile-code
sandbox.

## Event ordering

Events are monotonically ordered by `sequence` within a graph instance. Timestamps are
observational and must not be used as the sole ordering mechanism.

The initial event vocabulary is:

- `graph.created`
- `graph.started`
- `unit.activated`
- `pin.received`
- `pin.emitted`
- `merge.propagated`
- `capability.requested`
- `error.raised`
- `snapshot.created`
- `graph.stopped`

Product adapters may translate these events into higher-order tasks, workers, receipts, or
telemetry without modifying kernel vocabulary.

## Determinism boundary

The kernel guarantees deterministic canonical identity and deterministic behavior only for
graphs whose units are deterministic under the same ordered inputs and effective
capabilities.

Time, randomness, network access, filesystems, media devices, and external processes must
be explicit capabilities or injected host services. Their external outputs must be
recorded by the host when replayability or effect proof is required.

## Compatibility

Breaking changes include:

- changing pin consumption or emission semantics;
- changing canonical identity defaults;
- changing snapshot interpretation;
- renaming existing capability identifiers;
- changing authority proof/enforcement semantics for an existing contract version;
- changing event ordering guarantees;
- removing a public runtime operation.

New optional capabilities, event fields, and runtime operations may be added compatibly
when existing behavior remains unchanged. New authority semantics that cannot preserve the
existing contract should use a new contract version rather than silently changing meaning.

## Conformance

A runtime adapter is conformant when the same fixture produces equivalent:

- validation results;
- canonical graph hash;
- ordered pin outputs;
- lifecycle transitions;
- snapshot/restore behavior;
- required-capability denial behavior;
- scoped capability enforcement when advertised;
- resource-budget enforcement when advertised.

Cross-platform conformance fixtures should be executed against Node, Web, Worker, and
future host adapters as those adapters expose the contract.
