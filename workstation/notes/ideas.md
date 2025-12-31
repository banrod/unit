# Notes

- Explore improved build automation
- ✅ Resolved missing `_ids` module errors; keep monitoring for regressions
- Track `npm test` health to ensure the shim stays in sync with functional modules
- Document future enhancements
- Consider adding benchmarks for the image filter prototype *(see `benchmark-plan.md` for the current outline)*
- Outline potential CLI wrappers for quick demos (revisit after benchmarks)
- Review the facilitation assessment (`facilitation-assessment.md`) and turn high-impact recommendations into tasks *(see `next-steps.md`)*
- Reference `templates/experiment-readme-checklist.md` when spinning up new experiments
- ✅ Backfill `_specs`, `_classes`, and `_components` with realistic data so integration tests can run end-to-end
- ✅ Add registry validation so refreshes stay healthy *(run `npm run validate:registries`)*
- ✅ Add a registry data-quality snapshot so refreshes ship with counts and
  orphan detection *(run `npm run report:registries` and update
  `notes/registry-report.md` as needed)*
- Add smoke graph coverage so future refreshes stay healthy *(tracked in `next-steps.md`)*
- Resolve validator warnings (duplicate IDs, missing class mappings) before enabling strict gating *(tracked in `next-steps.md`)*
