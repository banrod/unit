# Runtime Interoperability Contract

Status: candidate generic adapter contract for the post-consolidation kernel line.

## Purpose

Unit needs a stable seam between product-owned control surfaces and the portable graph
runtime without importing product policy into the kernel. The interoperability contract
provides that seam for normalized external sources, one-graph runtime invocations, and
portable execution evidence.

The TypeScript contract and helper are published in
`src/runtime/interoperability.ts`.

## Invocation envelope

A `RuntimeInvocation` contains only execution information that is portable across hosts:

- a caller-owned `requestId`;
- the `GraphSpec` to execute;
- normalized source descriptors used for provenance;
- ordered input-pin pushes, optionally linked to a source descriptor;
- output pins to consume;
- a capability manifest describing what the graph requires or may use;
- the capabilities already granted by the host.

`runRuntimeInvocation(runtime, invocation)` validates the generic envelope, evaluates
capabilities, executes the graph through `GraphRuntime`, verifies snapshot identity, and
returns outputs plus a `RuntimeEvidenceManifest`.

The helper is intentionally a one-graph operation. Higher-order pipelines remain outside
the kernel and may compile their work into one graph or a sequence of invocations.

## Source normalization

`RuntimeSource` separates source kind from data modality.

Canonical source kinds are:

- `inline`
- `file`
- `stream`
- `uri`
- namespaced `extension.*` kinds

Canonical modalities are:

- `text`
- `structured`
- `image`
- `audio`
- `video`
- `binary`
- namespaced `extension.*` modalities

When a modality is omitted, Unit derives it from a normalized media type. JSON and
`+json` media types classify as `structured`; text, image, audio, and video media
families classify directly; everything else defaults to `binary`.

Source identifiers must be non-empty and unique. Normalized sources are sorted by ID so
the evidence surface is stable regardless of intake order. Media types and supplied
digests are normalized to lowercase; locators are trimmed but otherwise opaque to the
kernel.

Unit does not dereference locators or hash source bytes. The adapter that has access to
the source is responsible for resolution and for supplying a digest when byte-level
provenance is required.

## Capability boundary

`availableCapabilities` represents grants already resolved by the host. It is not a
policy declaration and Unit does not decide why a capability was granted.

External resources should map to existing portable capabilities such as
`filesystem.read`, `filesystem.write`, and `network.http`, or to a namespaced
`extension.*` capability when a host-specific operation has no canonical Unit
capability.

The evidence manifest records the normalized required and optional capability manifest
along with the evaluated grant and denial sets. This makes the execution boundary
reconstructable without importing the host's policy rationale into Unit.

## Lifecycle cleanup

Once graph instantiation succeeds, `runRuntimeInvocation` attempts `stop(graphId)` exactly
once before returning or propagating an execution failure. This applies when `start`,
`push`, `take`, snapshot creation, or snapshot identity verification fails.

If execution succeeds but cleanup fails, the cleanup error is propagated. If execution
has already failed and cleanup also fails, the original execution failure remains the
primary error.

## Evidence manifest

`RuntimeEvidenceManifest` records generic execution evidence only:

- contract version;
- request ID;
- graph ID and canonical graph hash;
- normalized source descriptors and caller-supplied digests;
- ordered input-pin bindings, including source IDs when supplied, without input payloads;
- requested output pin IDs;
- normalized required and optional capabilities plus the evaluated grant and denial sets;
- snapshot graph ID, graph hash, and execution sequence.

Input payloads and output values are intentionally not duplicated into the evidence
manifest. Downstream systems may separately persist or hash those values when their
provenance policy requires it.

The manifest deliberately excludes product receipts, organizational identities, policy
rationale, approval records, and arbitrary output serialization. Downstream systems may
bind those records to the graph hash and snapshot sequence without changing Unit's
kernel vocabulary.

## Downstream policy boundary

The following concepts are intentionally not part of this contract:

- specialist or persona ownership;
- routing presets and product-specific route names;
- authority ceilings or organizational permission policy;
- public/private publication classification;
- review, approval, or release gates;
- worker, queue, or schedule semantics;
- higher-order stage DAGs such as `depends_on`, `reads`, and `writes` policy records.

A downstream adapter may use all of those concepts while producing portable
`RuntimeInvocation` values. The dependency direction remains product policy -> adapter
-> Unit runtime, never the reverse.

## Conformance

A conforming interoperability adapter should produce equivalent normalized source
metadata and runtime evidence for the same graph, ordered inputs, outputs, and granted
capabilities across Node, Web, Worker, and future hosts.

Repository tests cover modality classification, deterministic source normalization,
duplicate-source rejection, source-to-pin provenance validation, capability enforcement,
capability evidence, output capture, snapshot identity binding, and cleanup after both
successful and failed execution.
