# Personal Working Station

This folder provides a lightweight sandbox for development experiments.

- **notes/** – design ideas, facilitation reviews, benchmarking plans, and scratch documents
- **scripts/** – helper utilities and test runners
- **image-filter/** – prototype for high-volume image filtering

The goal is to collect small experiments and tooling without cluttering the
main codebase. You can run tests via `./scripts/run-tests.sh`, consult
`notes/facilitation-assessment.md` for current facilitation levels, review the
benchmark schedule in `notes/benchmark-plan.md`, and iterate on new ideas
inside `notes/` before they mature. When documenting a fresh experiment, use
`templates/experiment-readme-checklist.md` to verify hand-off readiness.

To keep the broader test suite bootable, placeholder registries now live under
`../src/system/_ids.ts`, `_classes.ts`, `_components.ts`, and `_specs.ts`.
These shims unblock imports while we reconstruct the authoritative datasets.
