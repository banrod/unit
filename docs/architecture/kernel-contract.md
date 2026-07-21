# Unit Kernel Contract

Status: candidate contract for the post-consolidation kernel line.

## Purpose

Unit is the deterministic graph execution substrate. Product-specific orchestration,
identity, policy, memory, prompts, and user experience belong to downstream systems
and adapters.

A Unit program is a graph of multi-input, multi-output state machines. Hosts provide
platform capabilities; the kernel validates, instantiates, executes, snapshots, and
stops graphs without requiring knowledge of the host product.

## Supported host operations

The TypeScript interface is published in `src/runtime/contract.ts`.

A conforming host must provide the following operations:

1. `validate(spec)` — reject structurally invalid graph specifications.
2. `instantiate(spec, options)` — create an isolated graph instance after capability evaluation.
3. `start(graphId)` — transition an instantiated graph into execution.
4. `push(graphId, pinId, data)` — deliver data to an exposed input pin.
5. `take(graphId, pinId)` — consume data from an exposed output pin.
6. `snapshot(graphId)` — capture restorable state tied to a canonical graph hash.
7. `restore(snapshot)` — create an equivalent graph instance from a snapshot.
8. `stop(graphId)` — halt execution and release resources.
9. `events(graphId)` — expose the ordered low-level runtime event stream.

## Graph identity

`src/spec/identity.ts` defines canonical graph serialization and SHA-256 identity.

Canonicalization:

- sorts object keys recursively;
- preserves array order;
- normalizes negative zero to zero;
- rejects non-finite numbers and non-JSON runtime values;
- removes root-level generated `system` state by default;
- removes known nonsemantic editor metadata such as viewport, selection, layout,
  position, and generated timestamps by default.

Callers may override the omitted root and metadata keys. A graph hash is the lowercase
hex SHA-256 digest of its canonical UTF-8 JSON representation.

Graph hashes identify executable structure. Runtime snapshots additionally carry the
execution sequence and mutable state.

## Capability model

Capability types and manifests are defined in `src/types/Capability.ts`; generic
evaluation is implemented in `src/runtime/capability.ts`.

A graph or adapter may declare required and optional capabilities. Required capability
denial prevents instantiation. Optional denial is reported but does not prevent
execution.

The kernel evaluates grants. It does not decide organizational policy. The host is
responsible for deciding which capabilities are available to a graph.

Initial canonical capability names include:

- `dom.render`
- `filesystem.read`
- `filesystem.write`
- `media.camera`
- `media.microphone`
- `network.http`
- `network.tcp`
- `process.spawn`
- `storage.local`
- namespaced `extension.*` capabilities

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

Product adapters may translate these events into higher-order task, worker, receipt,
or telemetry records without modifying the kernel vocabulary.

## Determinism boundary

The kernel guarantees deterministic canonical identity and deterministic behavior only
for graphs whose units are deterministic under the same ordered inputs and granted
capabilities.

Time, randomness, network access, filesystems, media devices, and external processes
must be represented as explicit capabilities or injected host services. Their outputs
must be recorded by the host when replayability or proof is required.

## Compatibility

Breaking changes include:

- changing pin consumption or emission semantics;
- changing canonical identity defaults;
- changing snapshot interpretation;
- renaming existing capability identifiers;
- changing event ordering guarantees;
- removing a public runtime operation.

New optional capabilities, event fields, and runtime operations may be added compatibly
when existing behavior remains unchanged.

## Conformance

A runtime adapter is conformant when the same fixture produces equivalent:

- validation results;
- canonical graph hash;
- ordered pin outputs;
- lifecycle transitions;
- snapshot/restore behavior;
- required-capability denial behavior.

Cross-platform conformance fixtures should be executed against Node, Web, Worker, and
future host adapters as those adapters expose the contract.
