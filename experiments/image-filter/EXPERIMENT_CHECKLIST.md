# Experiment Checklist — Image Filtering Prototype

## Metadata

- [x] Purpose and noncanonical status documented.
- [x] Runtime prerequisites documented: Node.js >=20.9 and workspace dependencies.
- [x] Benchmark command documented.

## Validation

- [x] Deterministic 100,000-image synthetic benchmark retained.
- [x] Index-safe replacement behavior implemented.
- [ ] Add direct replacement, removal, and index-consistency tests.
- [ ] Add memory budgets and retained-heap measurements.
- [ ] Establish latency thresholds on supported hardware classes.

## Promotion

- [x] Prototype moved outside `workstation/` and the production kernel.
- [ ] Identify an external consumer and package boundary.
- [ ] Add required CI coverage for behavior and performance budgets.
- [ ] Complete security and data-lifecycle review before production use.
