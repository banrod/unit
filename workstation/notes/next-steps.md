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
- [x] Publish a concise registry dashboard to the CI step summary (derived
      from JSON diagnostics) for quick scan without downloading artifacts.
- [x] Add a regression check for CI step-summary generation so JSON-driven
      summary output remains in sync with report counts/coverage.
- [x] Emit a machine-readable JSON registry report for automation alongside
      the Markdown snapshot.
- [x] Expand JSON report payload with structured gap arrays so automation can
      consume IDs and counts without parsing free-form messages.
- [x] Keep committed JSON diagnostics compact by emitting totals plus preview
      slices for large gap arrays.
- [x] Add a report-schema guard to ensure JSON diagnostics stay compatible
      for automation consumers as the report evolves, including JSON↔Markdown parity checks
      for counts, coverage, and top composite reference summaries.
- [x] Resolve duplicate IDs flagged by the validator in `_ids.ts`.
- [ ] Continue triaging registry coverage without conflating composite graphs
      with missing primitive implementations.
  - Recorded direct class coverage gap: **495 IDs**.
  - Recorded direct component coverage gap: **861 IDs**.
  - Recorded composite references: **234 unique referenced specs**.
  - Recorded fatal unresolved references: **0**.
  - Recorded duplicate IDs: **0**.
  - Many class-coverage entries may be graph specs rather than missing
    primitives; classify each entry before promoting it to runtime-defect status.

## Testing & Tooling
- [x] Extend the test suite with a smoke graph that exercises a representative
      subset of specs to ensure runtime coverage. *(See
      `src/test/system/registry/SmokeGraph.ts`.)*
- [x] Wire the workstation `./scripts/run-tests.sh` into a CI-friendly target so local
      and remote runs stay aligned. *(Exposed via `npm run test:workstation` and now
      executed in `.github/workflows/workstation-validation.yml`.)*
- [ ] Require both the project test workflow and workstation validation workflow
      to complete successfully before promotion to `main`.

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
- [x] Make image replacement an index-safe upsert by removing stale tag/root
      entries before re-indexing an existing ID.
- [ ] Keep the prototype outside the production kernel until its replacement,
      removal, and benchmark tests are part of the required validation path.
