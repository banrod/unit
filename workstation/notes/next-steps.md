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
- [x] Resolve duplicate IDs flagged by the validator in `_ids.ts`.
- [ ] Close gaps where specs reference unit IDs that are not yet mapped in
      `_classes.ts`.

## Testing & Tooling
- [x] Extend the test suite with a smoke graph that exercises a representative
      subset of specs to ensure runtime coverage. *(See
      `src/test/system/registry/SmokeGraph.ts`.)*
- [ ] Wire the workstation `./scripts/run-tests.sh` into a CI target so local
      and remote runs stay aligned.

## Documentation & Handoff
- [ ] Adopt `templates/experiment-readme-checklist.md` for new experiments and
      link filled checklists from each prototype folder.
- [ ] Update the facilitation assessment once validation + smoke tests land to
      reflect the new tooling maturity.

## Image Filter Prototype
- [x] Instrument `ImageFilterStore` with timing hooks per benchmark scenario.
- [x] Capture benchmark outputs under `notes/benchmark-results/` and summarize
      the first run in `notes/facilitation-assessment.md`.
