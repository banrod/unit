# Repository Boundaries

## Canonical responsibility

`banrod/unit` owns the general-purpose Unit language and execution kernel:

- unit, primitive, functional, semifunctional, and graph semantics;
- graph specification and bundle interpretation;
- canonical system registries;
- generally useful logical compositions;
- platform adapters for Web, Node, Worker, and extensions;
- the visual graph editor and its reusable interaction foundations;
- generic capability classes, scoped attenuation, proof, and enforcement contracts;
- low-level execution events, snapshots, and graph identity;
- normalized source descriptors, portable invocation envelopes, host-authorization inputs,
  and generic execution evidence that do not encode product policy.

Unit may enforce a generic authority contract that a trusted host has already derived. It
does not determine why a person, worker, product, or organization should possess that
authority.

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
- specialist routing presets, authority ceilings, publication boundaries, and approval or
  release gates;
- credential brokerage and durable replay/revocation policy;
- resource-specific policy such as SSRF, filesystem traversal, browser profiles, and
  repository-specific write controls.

Downstream systems may compile these policies into generic Unit host manifests, scoped
capability requirements, grant/ceiling layers, conflict rules, budgets, and resource
adapter enforcement. Unit must not import the product concepts that produced those generic
contracts.

## Integration direction

The dependency direction is one-way:

```text
product intention + organizational policy
          |
          v
trusted product-owned adapter / authority compiler
          |
          +--> caller-visible RuntimeInvocation
          |
          +--> trusted RuntimeAuthorization
          |      - principal
          |      - capability manifest
          |      - grants / ceilings
          |      - conflict rules / budgets
          v
Unit kernel
          |
          v
resource/runtime enforcement
          |
          v
ordered outputs + events + snapshot + generic evidence
```

A downstream adapter may:

- normalize multimodal or external sources before runtime entry;
- compile product steps into Unit graph bundles;
- determine the authoritative capability-class manifest;
- request and mint generic grants under product policy;
- canonicalize resource identifiers before scoping them;
- instantiate and control graphs through `GraphRuntime` or `runRuntimeInvocation`;
- enforce resource-specific constraints represented by the generic proof;
- convert runtime events and generic evidence into product telemetry or receipts;
- store graph hashes and snapshots in product provenance systems.

The Unit kernel may not call back into a product policy engine or assume a specific worker,
identity, memory, routing preset, organizational authority ceiling, publication boundary,
or receipt schema.

## Admission rule

A proposed change belongs in `/unit` only when all of the following are true:

1. It is useful outside a single product.
2. It can be expressed without product identity or organizational policy.
3. Its runtime behavior is testable through generic graph/authority fixtures.
4. It preserves platform portability or declares a clear adapter enforcement capability.
5. It fails closed when a required authority invariant cannot be represented or enforced.
6. It passes generated-registry parity, typecheck, runtime tests, and strict structural
   validation.

Otherwise, implement it in a downstream adapter, extension pack, experiment, or product
repository.

## Noncanonical material

Doctrine, speculative architecture, compendiums, visual themes, and historical research
may inform product design but are not executable kernel authority. They should be stored
outside the production runtime tree and linked by provenance when relevant.
