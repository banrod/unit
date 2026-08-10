# Repository Boundaries

## Canonical responsibility

`banrod/unit` owns the general-purpose Unit language and execution kernel:

- unit, primitive, functional, semifunctional, and graph semantics;
- graph specification and bundle interpretation;
- canonical system registries;
- generally useful logical compositions;
- platform adapters for Web, Node, Worker, and extensions;
- the visual graph editor and its reusable interaction foundations;
- capability enforcement at the runtime boundary;
- low-level execution events, snapshots, and graph identity;
- normalized source descriptors, portable runtime invocation envelopes, and generic execution evidence that do not encode product policy.

## Downstream responsibility

Product repositories own concepts that depend on a particular organization or product.
For FlowGPT OS and IAM, those concerns belong in `/new` or its descendants:

- identities, personas, and personality profiles;
- workers, queues, schedules, and orchestration;
- organizational permissions and policy decisions;
- memory, retrieval, and knowledge governance;
- prompts, goal compilation, and synthetic forums;
- proof bundles and product-level receipts;
- dashboards, mission control, branding, and application navigation;
- product-specific AI providers and business logic;
- specialist routing presets, authority ceilings, publication boundaries, and approval or release gates.

Downstream systems may translate their contracts into Unit graphs, normalized runtime
invocations, and capabilities. Unit must not import those product concepts into the
kernel.

## Integration direction

The dependency direction is one-way:

```text
product intention and policy
          |
          v
product-owned Unit adapter
          |
          v
normalized sources + typed graph + capability grant
          |
          v
Unit kernel
          |
          v
ordered outputs + events + snapshot + generic evidence
```

A downstream adapter may:

- normalize multimodal or external sources before runtime entry;
- compile product steps into Unit graph bundles;
- request capabilities from product policy;
- instantiate and control graphs through `GraphRuntime` or `runRuntimeInvocation`;
- convert runtime events and generic evidence into product telemetry or receipts;
- store graph hashes and snapshots in product provenance systems.

The Unit kernel may not call back into a product policy engine or assume a specific
worker, identity, memory, routing preset, authority ceiling, publication boundary, or
receipt schema.

## Admission rule

A proposed change belongs in `/unit` only when all of the following are true:

1. It is useful outside a single product.
2. It can be expressed without product identity or organizational policy.
3. Its runtime behavior is testable through generic graph fixtures.
4. It preserves platform portability or declares a clear adapter capability.
5. It passes generated-registry parity, typecheck, runtime tests, and strict structural validation.

Otherwise, implement it in a downstream adapter, extension pack, experiment, or product
repository.

## Noncanonical material

Doctrine, speculative architecture, compendiums, visual themes, and historical research
may inform product design but are not executable kernel authority. They should be stored
outside the production runtime tree and linked by provenance when relevant.
