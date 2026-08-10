# Capability Calculus v0.1

Status: candidate generic authority calculus for the portable Unit runtime.

## Purpose

Unit needs to accept execution requirements from downstream systems without becoming the
product policy engine and without allowing a serialized invocation to manufacture its own
authority. Capability Calculus v0.1 defines the generic algebra that a trusted host policy
engine, route negotiator, sandbox, and resource adapter can share.

The governing equation is:

```text
EffectiveAuthority
  = RequestedScope
  ∧ HostGrant
  ∧ AdditionalTrustedCeilings
```

Route and sandbox ceilings may be represented as additional grant layers. Every layer is
conjunctive: a later layer may attenuate authority but may not increase it.

The authority identity element is **not** supplied implicitly. When an operation requires a
capability and there is no trusted grant layer, the effective authority is empty and the
required capability fails closed. An operation that requires no capability authority may
execute with an empty grant chain.

## Trust split

Capability class declaration and authority are host-side concerns.

`RuntimeInvocation` is caller-visible and may contain only:

- request and operation IDs;
- a graph specification;
- sources, inputs, and requested outputs;
- optional scoped capability refinements.

`RuntimeAuthorization` is a separate trusted-host input containing:

- the resolved principal;
- the authoritative required/optional capability-class manifest;
- one or more grant/ceiling layers when authority is required;
- optional generic conflict rules;
- optional trusted evaluation time.

The caller cannot suppress a host-required capability by omitting it from the scoped
request. A missing scoped refinement expands to the host-declared class requirement.
Caller fields that attempt to provide grants, available capabilities, or a replacement
manifest are rejected by the exact invocation schema.

## Runtime schema firewall

All authority-bearing structures are validated at runtime rather than relying on
TypeScript types after deserialization. The calculus rejects:

- unknown object keys;
- non-plain authority objects;
- malformed arrays and scalar types;
- unknown capability classes;
- empty resource or selector allowlists;
- non-boolean permission values;
- negative or non-finite numeric ceilings;
- duplicate grant IDs and duplicate conflict-rule IDs;
- reserved map keys that could create prototype or object-method ambiguity;
- timezone-ambiguous authorization/grant timestamps.

Grant and authorization timestamps must carry an explicit `Z` or numeric UTC offset.

Capability classes are either one of the canonical classes or a syntactically valid,
non-empty lower-case `extension.*` class. An extension name passing syntax validation is
not automatically grantable; a trusted host registry must define its semantics.

## Capability lattice

A `ScopedCapability` has a capability class and an optional generic scope. Scope fields are
intentionally monotone so their meet always means "no more authority":

- `resources`: a non-empty allowlist of opaque resource identifiers;
- `selectors`: non-empty allowlists for dimensions such as method, ref, or operation;
- `limits`: non-negative numeric **maximum** ceilings;
- `permissions`: positive-polarity booleans where `true` permits and `false` prohibits the
  named feature.

Resource strings are opaque to Unit. A network, filesystem, repository, browser, or other
resource adapter must canonicalize resource identity before requesting or granting a scope.
Unit does not equate URL aliases, resolve DNS, normalize filesystem traversal, or infer Git
object equivalence.

Permission names must describe the permission itself, not a negated policy. For example,
use `privateNetwork: false`, not `denyPrivateNetwork: true`.

For two values in the same capability class, meet (`∧`) is the authorization operation:

- resource allowlists intersect;
- selector allowlists intersect per key;
- numeric ceilings choose the smaller maximum;
- permission booleans use logical AND;
- incompatible resource or selector intersections eliminate the capability.

Join (`∨`) is exposed for lattice analysis only. **Authorization never uses join**, because
joining grants can amplify authority.

The partial order `child <= parent` means all authority in `child` is permitted by
`parent`. Every effective capability is checked against the original request and every
trusted layer.

## Least-authority compiler

`compileLeastAuthority(request, context)` emits `unit.capability-proof/1` containing:

- normalized requested capabilities;
- effective scoped capabilities;
- denied required and optional capabilities;
- capability residue;
- unique grant IDs;
- matched conflict rules;
- monotonicity result;
- effective resource budget;
- final allow/refuse decision.

Capability residue records requested authority that did not survive unchanged. A required
capability denied by any layer refuses the operation. Optional capabilities may disappear
without refusing the operation. A matched conflict rule refuses execution even when each
capability was individually grantable.

## Grants and freshness

A `unit.capability-grant/1` contains only semantics enforced in v0.1:

- `grantId`;
- `principalId`;
- `requestId`;
- `operationId`;
- scoped capabilities;
- `issuedAt`;
- `expiresAt`;
- optional resource budget.

A grant is rejected if its principal, request, or operation differs from the trusted
context, if its time window is invalid or inactive, or if its ID is duplicated in the
chain.

Delegation lineage, revocation, nonce use, and single-use grants are intentionally absent
from this schema because v0.1 does not yet enforce those semantics. Security-looking fields
must not exist merely as metadata.

The grant is also not yet cryptographically bound to a graph/request-content digest. The
trusted host must therefore ensure that `requestId` and `operationId` resolve to an
immutable authorized request. Digest-bound grants are a candidate for a later contract
version.

## Resource budgets

Budgets are authority ceilings, not advisory telemetry. The generic vocabulary includes:

- wall-clock time;
- CPU time;
- memory bytes;
- process count;
- graph steps;
- input and output bytes;
- network bytes;
- filesystem bytes;
- tool calls.

Across layers, each effective budget dimension is the smallest defined maximum.

A proof containing a budget is executable only when the target `GraphRuntime` advertises
`unit.resource-budgets/1`. Otherwise `runRuntimeInvocation` refuses before graph validation
or instantiation.

## Enforcement conservation

A scoped proof must not be downgraded to a flat capability string. Flat capability classes
are activation hints only.

`GraphRuntime.authorityEnforcement` advertises the enforcement contracts supported by the
runtime or its attached resource adapters:

```text
unit.scoped-capabilities/1
unit.resource-budgets/1
```

When effective authority is scoped, `unit.scoped-capabilities/1` is required. When an
effective budget exists, `unit.resource-budgets/1` is required. Missing support causes a
pre-execution refusal.

These markers are conformance claims, not cryptographic proofs. A runtime advertising a
marker must actually enforce the corresponding scope/budget at the resource boundary.

## Capability type system and forbidden compositions

Unit does not encode IAM or organization policy. A trusted host may compile product policy
into generic `CapabilityConflictRule` values. For example, a host can refuse a particular
combination of network and process authority without embedding that product rule in Unit.

The dependency direction is:

```text
product policy
  -> host manifest + grants + generic conflict rules
  -> Unit proof
```

never:

```text
product policy embedded in Unit
```

## Graph and provenance boundary

The interoperability path clones and validates the graph as plain JSON-shaped data before
hashing or execution. Canonical graph identity rejects non-JSON object classes, symbol
keys, accessor properties, non-finite numbers, functions, symbols, and bigint values. Key
creation during canonicalization does not use prototype setters.

Source `digest` fields remain caller/adapter metadata. Unit does not dereference the source
or recompute the digest. Downstream evidence systems must distinguish a claimed digest from
a separately verified digest.

## Attack-model qualification

The v0.1 suite exercises:

1. authority amplification;
2. missing-grant default denial;
3. scope escape and empty-scope collapse;
4. runtime scope/budget enforcement downgrade;
5. expired or not-yet-active grants;
6. principal/request/operation mismatch;
7. caller-forged authority or manifest fields;
8. unknown-key and runtime-type confusion;
9. duplicate grant/conflict identity;
10. unknown capability vocabulary and malformed extension names;
11. toxic capability combinations;
12. resource-budget amplification;
13. graph prototype pollution and non-JSON identity confusion.

## Required properties

```text
DEFAULT_DENY_WITHOUT_GRANT
NEVER_AMPLIFY
NEVER_ESCAPE_SCOPE
NEVER_COLLAPSE_EMPTY_SCOPE_TO_FLAT_AUTHORITY
NEVER_DOWNGRADE_SCOPED_AUTHORITY
NEVER_DOWNGRADE_RESOURCE_BUDGET
NEVER_EXECUTE_EXPIRED
NEVER_CROSS_PRINCIPAL
NEVER_TREAT_CALLER_DATA_AS_GRANT
NEVER_ACCEPT_AMBIGUOUS_GRANT_IDENTITY
NEVER_ACCEPT_UNKNOWN_CAPABILITY_CLASS
NEVER_ACCEPT_UNKNOWN_AUTHORITY_SCHEMA
NEVER_BYPASS_CONFLICT_REFUSAL
NEVER_INCREASE_RESOURCE_BUDGET
NEVER_HASH_NON_JSON_EXECUTION_OBJECTS
```

Future contracts still need durable or adapter-specific properties:

```text
NEVER_REUSE_SINGLE_USE_GRANT
NEVER_DELEGATE_MORE_THAN_PARENT
NEVER_EXECUTE_REVOKED_GRANT
NEVER_DOWNGRADE_SECURITY_IN_ROUTE_DESCENT
NEVER_BYPASS_RESOURCE_CANONICALIZATION
```

Those require durable host state, explicit delegation-chain semantics, route-security proof
objects, or resource-specific canonicalizers and are intentionally not faked inside the
stateless Unit kernel.

## Security conservation boundary

Capability Calculus proves generic attenuation and checks declared runtime enforcement
compatibility. It does not provide a hostile-code sandbox or prove an adapter implementation
correct.

```text
Host Policy
    -> Host Capability Manifest
    -> Capability Grant/Ceilings
    -> Least-Authority Proof
    -> Enforcement Compatibility Check
    -> Unit Runtime
    -> Resource Adapter Enforcement
    -> Effect Verification
    -> Evidence / Receipt
```

A runtime or adapter must refuse when it cannot preserve the effective scope or budget.
Graceful transport descent is valid only when required security invariants survive.

## Non-goals of v0.1

The following remain outside Unit or outside this contract version:

- human/agent goal interpretation;
- IAM roles, personas, approval policy, and organizational permissions;
- credential brokerage;
- durable replay/idempotency/revocation registries;
- delegation lineage;
- browser-profile isolation;
- OS-level hostile-code sandboxing;
- network SSRF/DNS policy;
- filesystem traversal/symlink policy;
- repository-specific GitHub semantics;
- publication/release authority;
- cryptographic grant-to-graph/request digest binding.

Downstream systems may compile those policies into host manifests, scoped requirements,
grants, conflict rules, budgets, and resource-adapter enforcement without changing Unit's
generic vocabulary.
