# Experiment README Checklist — Image Filtering Prototype

## Metadata
- [x] Title reflects the experiment's purpose (high-volume image filtering with rooted tags).
- [x] Authors and contact handles are listed (working station maintainers; contact via repo maintainers).
- [x] Status flag set (status: prototype with benchmark coverage).

## Environment
- [x] Enumerate prerequisites (Node.js >=20.9, npm, TypeScript toolchain via workspace devDependencies).
- [x] Document setup commands and teardown steps (`npm install`, optional `npm run bench:image-filter`; no teardown beyond removing generated reports).
- [x] Link to any helper scripts in `workstation/scripts/` (`bench-image-filter.ts`, `run-tests.sh`).

## Validation
- [x] Include step-by-step instructions for running tests or demos (`npm test`, `npm run bench:image-filter`).
- [x] Summarize expected outputs or acceptance criteria (tests green; benchmark emits Markdown report with scenario timings and result counts).
- [x] Capture benchmarking or profiling notes when available (latest report in `notes/benchmark-results/`).

## Knowledge Transfer
- [x] Reference related notes or assessments for additional context (`notes/facilitation-assessment.md`, `notes/benchmark-plan.md`, `notes/ideas.md`).
- [x] Highlight open questions or follow-up tasks (extend metrics to memory usage; wire benchmark into CI once stable).
- [x] Provide guidance on how to promote the experiment into the main product surface (treat registries in `src/system/_*.ts` as canonical, and graduate scripts/tests through CI once gating is configured).
