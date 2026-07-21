# Unit Kernel — Post-Consolidation Roadmap

The registry recovery and canonical-main consolidation are complete. This checklist now
tracks hardening work for Unit as a portable graph execution kernel.

## Completed baseline

- [x] Restore canonical generated `_ids`, `_classes`, `_components`, and `_specs` registries.
- [x] Enforce generated-registry parity in CI.
- [x] Reject duplicate source spec IDs during generation.
- [x] Validate unit pins, merge memberships, and exposed plugs structurally.
- [x] Resolve all fatal unresolved references, duplicate IDs, and invalid pin references.
- [x] Require successful project and workstation workflows before the consolidation merge.
- [x] Publish registry diagnostics as CI artifacts instead of canonical source files.
- [x] Establish canonical repository boundaries for kernel and downstream product work.
- [x] Publish the initial adapter-neutral `GraphRuntime` contract.
- [x] Add canonical graph serialization and SHA-256 identity.
- [x] Add generic capability manifests, grant evaluation, and required-capability enforcement.
- [x] Add a reusable headless runtime conformance harness.
- [x] Generate per-ID registry coverage classifications.
- [x] Move the image-filter prototype to `experiments/image-filter/`.

## Current registry posture

The last promoted baseline recorded:

- 974 unique exported IDs and specs;
- 479 direct class mappings;
- 113 component mappings;
- 234 composite-spec references;
- 0 fatal unresolved references;
- 0 invalid pin references;
- 0 duplicate IDs.

Raw class and component gaps are not automatically defects. Use
`npm run classify:registries` to classify each ID as a direct primitive, optimized
primitive, composite graph, component-only entry, or unimplemented entry before opening
a runtime defect.

## Next kernel work

- [ ] Enable repository branch protection requiring `test` and `Workstation Validation`.
- [ ] Tag the consolidated baseline as `unit-kernel-v0.1.0` after release ownership is confirmed.
- [ ] Add concrete Node and Web adapters implementing `GraphRuntime` directly.
- [ ] Execute the same conformance fixtures against Node, Web, and Worker adapters.
- [ ] Define canonical snapshot serialization and compatibility versioning.
- [ ] Add deterministic replay fixtures for time, randomness, and external I/O injection.
- [ ] Add graph boot, propagation, snapshot, and memory performance baselines.
- [ ] Classify and review the `unimplemented` coverage category produced by CI.
- [ ] Publish a stable package export surface for runtime contracts and graph identity.

## Downstream integration

The FlowGPT OS/IAM adapter belongs outside this repository, preferably under
`/new/packages/unit-runtime-adapter/`.

That adapter should:

- compile typed product steps into Unit graph bundles;
- obtain capability grants from product policy;
- invoke Unit through the generic runtime contract;
- convert low-level Unit events into product receipts and telemetry;
- store canonical graph hashes and snapshots with execution provenance.

Unit must not import IAM identities, workers, prompts, queues, memory, or policy schemas.

## Experiment posture

`experiments/image-filter/` remains noncanonical. Promotion requires direct behavioral
tests, latency and memory budgets, a documented external consumer, an explicit package
boundary, and required CI coverage.
