# Registry Playbook

This playbook documents how to keep the canonical `_ids`, `_classes`, `_components`, and `_specs` files fresh and trustworthy.

## When to Regenerate

- Upstream datasets change (new units, removed specs, component updates).
- You need to audit drift between local registries and their source of truth.
- A new experiment requires additional coverage that is missing from the current set.

## Regeneration Steps

1. Pull the authoritative dataset that defines IDs, classes, components, and serialized specs.
2. Run or adapt the existing build scripts that emit the four registry files under `src/system/`.
3. Commit the regenerated files together with any schema or data changes from the upstream dataset.
4. Execute validation:
   - `npm test` to exercise the registries through the existing test suite.
   - `TS_NODE_TRANSPILE_ONLY=1 npm exec ts-node -T workstation/scripts/verify-registries.ts` to confirm alignment and uniqueness across registries.
5. If validation fails, regenerate again or investigate missing upstream data before merging.

## Drift Mitigation

- Schedule periodic validation runs (local or CI) using `workstation/scripts/verify-registries.ts`.
- Keep a short changelog of upstream dataset updates so regressions can be traced quickly.
- Avoid manual edits to the generated registry files; rely on scripted generation to ensure consistency.

## Handoff Checklist

- [ ] Regenerated registries and confirmed the source dataset commit hash in commit message or PR description.
- [ ] Validation scripts (`npm test` and `verify-registries.ts`) both pass.
- [ ] Notes or docs that depend on registry content are updated (e.g., facilitation assessment, prototype readmes).
- [ ] Any downstream experiments are re-run if they rely on the regenerated entries.
