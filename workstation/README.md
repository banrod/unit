# Personal Working Station

This folder provides a lightweight sandbox for development experiments.

- **notes/** – design ideas, facilitation reviews, benchmarking plans, and scratch documents
- **scripts/** – helper utilities and test runners
- **image-filter/** – prototype for high-volume image filtering

The goal is to collect small experiments and tooling without cluttering the
main codebase. You can run tests via `./scripts/run-tests.sh` (or
`npm run test:workstation`), consult `notes/facilitation-assessment.md` for
current facilitation levels, review the
benchmark schedule in `notes/benchmark-plan.md`, and iterate on new ideas
inside `notes/` before they mature. When documenting a fresh experiment, use
`templates/experiment-readme-checklist.md` to verify hand-off readiness; the
image-filter prototype ships with a completed example in
`image-filter/EXPERIMENT_CHECKLIST.md`.
Run `npm run validate:registries` to sanity-check ID coverage and spec → class
bindings after regenerating any registry; output now includes exported ID
names, per-ID reference counts, and a separate warning bucket for composite
spec references (which do not require class mappings). Use
`npm run validate:registries:strict` (or the workstation test script) to gate
on true validation errors in automated runs.

GitHub Actions mirrors this locally supported sequence in
`.github/workflows/workstation-validation.yml` and uploads
`workstation/notes/registry-report.md` as a CI artifact for auditability.

Generate a snapshot data quality report with `npm run report:registries` to
capture counts, coverage ratios, and any orphaned IDs. The most recent output
lives in `notes/registry-report.md`. To profile the image-filter prototype at
100k scale, run `npm run bench:image-filter` and inspect the emitted Markdown
under `notes/benchmark-results/`.

To keep the broader test suite bootable, regenerated registries live under
`../src/system/_ids.ts`, `_classes.ts`, `_components.ts`, and `_specs.ts`.
Treat them as the current source of truth and follow the workspace next steps
in `notes/next-steps.md` to keep future refreshes validated.
