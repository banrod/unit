# Next Steps (Post-Registry Regeneration)

This checklist captures the immediate follow-ups after restoring the canonical
system registries.

## Data Quality & Coverage
- [x] Add automated validation to confirm `_specs`, `_classes`, and `_components`
      stay in sync (e.g., ID uniqueness, missing implementation checks). *(Run
      `npm run validate:registries`.)*
- [x] Produce a short data quality report (counts, orphan detection) after each
      registry refresh. *(See `notes/registry-report.md`; regenerate with
      `npm run report:registries`.)*
- [x] Improve registry diagnostics so missing mappings are reported with
      exported ID names and per-ID reference counts for prioritization.
- [x] Distinguish composite spec references from true unmapped IDs in
      registry diagnostics to reduce false-positive class-mapping errors.
- [x] Consolidate shared registry-audit logic so validation and reporting stay
      consistent and avoid drift between scripts.
- [x] Tune validator output for triage (actionable mapping diagnostics in
      validate script; full coverage warnings in report output).
- [x] Add a regression check for audit option behavior so focused validation
      cannot accidentally reintroduce coverage-noise warnings. *(Also asserts
      focused/full severity invariants and presence logic tied to audit counts.)*
- [x] Preserve CI registry diagnostics by uploading `registry-report.md` and
      `registry-report.json` as workflow artifacts for each validation run.
- [x] Emit a machine-readable JSON registry report for automation alongside
      the Markdown snapshot.
- [x] Resolve duplicate IDs flagged by the validator in `_ids.ts`.
- [ ] Close gaps where specs reference unit IDs that are not yet mapped in
      `_classes.ts`. *(Mapped `ID_IF_NOT` to reduce missing coverage; continue
      filling remaining control/array builders.)*
  - Progress: mapped `ID_N_ARRAY_BUILDER` and `ID_LEVER` into `_classes.ts`,
    trimming the missing class count to **234** and adding `ID_IF_ELSE` to
    cover core branching. Continue with the control/array builder IDs still
    flagged by the validator.

## Testing & Tooling
- [x] Extend the test suite with a smoke graph that exercises a representative
      subset of specs to ensure runtime coverage. *(See
      `src/test/system/registry/SmokeGraph.ts`.)*
- [x] Wire the workstation `./scripts/run-tests.sh` into a CI-friendly target so local
      and remote runs stay aligned. *(Exposed via `npm run test:workstation` and now
      executed in `.github/workflows/workstation-validation.yml`.)*

## Documentation & Handoff
- [x] Adopt `templates/experiment-readme-checklist.md` for new experiments and
      link filled checklists from each prototype folder.
- [x] Update the facilitation assessment once validation + smoke tests land to
      reflect the new tooling maturity. *(Assessment now reflects strict registry
      gating via `npm run test:workstation` and composite-spec warning handling.)*

## Image Filter Prototype
- [x] Instrument `ImageFilterStore` with timing hooks per benchmark scenario.
- [x] Capture benchmark outputs under `notes/benchmark-results/` and summarize
      the first run in `notes/facilitation-assessment.md`.
