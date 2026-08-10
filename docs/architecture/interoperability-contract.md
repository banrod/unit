# Runtime Interoperability Contract

Status: candidate generic adapter contract for the post-consolidation kernel line.

## Purpose

Unit needs a stable seam between product-owned control surfaces and the portable graph
runtime without importing product policy into the kernel. This contract defines normalized
external sources, one-graph invocations, host-separated authority, enforcement compatibility,
and portable execution evidence.

The TypeScript surface is published in `src/runtime/interoperability.ts`. Scoped authority
semantics are defined by [Capability Calculus v0.1](capability-calculus.md).

## Trust boundary

`RuntimeInvocation` is caller-visible. Its exact wire schema contains only:

- `requestId` and `operationId`;
- `GraphSpec`;
- sources;
- ordered inputs;
- requested outputs;
- optional scoped capability refinements.

The caller does **not** supply the authoritative capability manifest, available/granted
capabilities, principal identity, or policy decision.

`RuntimeAuthorization` is a distinct trusted-host input containing:

- the host-resolved principal ID;
- the authoritative required/optional `CapabilityManifest`;
- zero or more host-issued grant/ceiling layers;
- optional generic conflict rules;
- optional trusted evaluation time.

Unknown keys are rejected on the invocation, authorization, source, input, output, manifest,
capability request, scope, grant, budget, and conflict-rule surfaces. This prevents a typo or
historical authority field from being silently ignored at a security boundary.

`runRuntimeInvocation(runtime, invocation, authorization)`:

1. validates the exact external schemas;
2. clones the graph into plain JSON-shaped data;
3. normalizes source and pin metadata;
4. binds caller scope refinements to the host capability manifest;
5. compiles least authority across trusted layers;
6. checks runtime scope/budget enforcement compatibility;
7. validates and instantiates the graph;
8. executes ordered inputs/outputs;
9. verifies snapshot graph identity;
10. stops the graph exactly once after successful instantiation;
11. returns outputs and `unit.runtime-evidence/2`.

The helper intentionally executes one graph. Higher-order pipelines remain downstream.

## Host-authoritative capability declaration

The trusted host manifest declares which capability classes the graph/adapter requires or
may use. The caller may only refine a declared class with resource, selector, limit, or
permission scope.

A scoped required capability must correspond to a host-required class. A scoped optional
capability must correspond to a host-optional class. Undeclared scoped requests are rejected.

If the caller omits a refinement for a host-declared capability, the class requirement still
exists as an unscoped request. Therefore under-requesting cannot suppress host-required
authority checks.

Required authority without a trusted grant layer fails closed. Optional authority can be
removed without failing the invocation.

## Enforcement compatibility

Flat capability strings are not a valid downgrade representation for scoped authority.
They are class-level activation hints only.

`GraphRuntime.authorityEnforcement` declares which enforcement contracts the runtime or its
resource adapters support:

```text
unit.scoped-capabilities/1
unit.resource-budgets/1
```

A proof containing scoped effective authority requires `unit.scoped-capabilities/1`. A proof
containing a resource budget requires `unit.resource-budgets/1`. Missing support causes a
refusal before graph validation or instantiation.

These markers are conformance assertions, not proof that an adapter is correctly
implemented. Adapter-specific tests must verify actual scope and budget enforcement.

## Graph ingress and identity

Before execution, the supplied graph is canonicalized with no semantic/editor omissions to
produce an isolated plain-data execution copy. This rejects non-JSON object classes, symbol
keys, accessors, non-finite numbers, functions, symbols, and bigint values before they reach
the runtime.

Canonical object keys are defined as data properties rather than assigned through prototype
setters, so a JSON key such as `__proto__` remains data and does not mutate the canonical
object's prototype.

The execution copy is hashed and supplied to `validate`/`instantiate`; the snapshot hash
must match that execution hash.

## Source normalization and provenance

`RuntimeSource` separates source kind from modality.

Kinds:

- `inline`;
- `file`;
- `stream`;
- `uri`;
- syntactically valid `extension.*` kinds.

Modalities:

- `text`;
- `structured`;
- `image`;
- `audio`;
- `video`;
- `binary`;
- syntactically valid `extension.*` modalities.

When modality is absent, media type determines common families; JSON and `+json` classify
as `structured`, and unknown families become `binary`.

Source IDs are non-empty and unique. Media types are lowercased. Locators and digests are
trimmed but otherwise preserved as opaque metadata.

Unit does not dereference locators or hash source bytes. A source digest in this contract is
a claim unless a downstream verifier separately attests that it recomputed the digest from
resolved bytes. Evidence systems must not equate `digest present` with `digest verified`.

Resource identifiers inside capability scopes are likewise opaque to Unit. Network,
filesystem, Git, browser, and other adapters must canonicalize resource identity before
creating or enforcing a grant.

## Grant boundary

`unit.capability-grant/1` authority is bound to principal, request, operation, issuance, and
expiry. Grant IDs must be unique within one authorization chain. Multiple trusted grant
layers are conjunctive ceilings.

V0.1 deliberately does not expose delegation lineage, revocation, nonce/max-use, or
single-use semantics because those are not durably enforced by the stateless kernel. It
also does not cryptographically bind a grant to a graph digest; the trusted host must keep
request/operation identity immutable while a grant is valid.

## Lifecycle cleanup

After graph instantiation succeeds, `runRuntimeInvocation` attempts `stop(graphId)` exactly
once before returning or propagating execution failure. This covers failures during start,
push, take, snapshot creation, and snapshot identity verification.

If execution succeeds but cleanup fails, cleanup failure is propagated. If execution has
already failed and cleanup also fails, the original execution failure remains primary.

Schema, authority, and enforcement-compatibility refusals occur before instantiation and
therefore require no runtime cleanup.

## Evidence manifest

`unit.runtime-evidence/2` records generic execution evidence:

- request and operation IDs;
- trusted principal ID;
- graph ID and graph hash;
- normalized source descriptors;
- ordered input-pin/source bindings without input payloads;
- requested output pin IDs;
- complete `unit.capability-proof/1`;
- grant IDs, residue, conflicts, monotonicity, and effective budget;
- runtime scope/budget enforcement profile;
- snapshot graph ID, graph hash, and sequence.

Input payloads and output values are not duplicated into evidence. Product receipts,
organizational policy rationale, approvals, credentials, publication state, and arbitrary
output serialization remain downstream concerns.

## Product boundary

The following remain outside this contract:

- IAM personas/specialists and routing presets;
- organizational role and approval policy;
- publication boundaries;
- workers, queues, and schedules;
- credential brokerage;
- durable replay, idempotency, and revocation registries;
- browser-profile policy;
- SSRF/DNS and filesystem-path policy;
- repository-specific GitHub semantics;
- higher-order stage DAGs.

Dependency direction remains:

```text
product intention/policy
  -> trusted host manifest + grants + adapter
  -> Unit interoperability contract
  -> runtime/resource enforcement
```

never the reverse.

## Conformance

A conforming adapter/runtime pair should produce equivalent normalization, least-authority
decisions, enforcement behavior, graph identity, lifecycle behavior, and evidence for the
same trusted inputs across Node, Web, Worker, and future hosts.

Repository tests cover source normalization, exact-schema rejection, graph-ingress identity
hardening, caller/host authority separation, default-deny behavior, scope attenuation,
principal/request/operation/expiry binding, forged authority fields, capability-vocabulary
validation, toxic combinations, scope/budget downgrade refusal, output capture, snapshot
identity, and cleanup after execution failures.
