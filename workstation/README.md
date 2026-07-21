# Personal Working Station

This folder contains repository-maintenance tooling and generated diagnostic notes.
Product experiments do not belong here; noncanonical prototypes live under
`../experiments/`.

- **notes/** — facilitation reviews, benchmark plans, and generated registry diagnostics
- **scripts/** — registry validation, classification, reporting, benchmarks, and test runners
- **templates/** — experiment hand-off templates

Run the complete local gate with:

```sh
npm run test:workstation
```

The gate runs the project test suite, generates registry integrity and coverage reports,
checks report compatibility, enforces strict structural validation, and exercises the
audit invariants. GitHub Actions mirrors this sequence in
`.github/workflows/workstation-validation.yml` and publishes the generated reports as
artifacts.

Useful commands:

```sh
npm run validate:registries
npm run validate:registries:strict
npm run report:registries
npm run classify:registries
```

`report:registries` describes structural integrity and raw coverage gaps.
`classify:registries` resolves every exported ID into one primary implementation class:
direct primitive, optimized primitive, composite graph, component only, the canonical
empty-graph sentinel, or unimplemented.

Generated files under `notes/registry-report.*` and `notes/registry-coverage.*` are not
canonical source and are ignored by Git.

The image-filter prototype is quarantined at `../experiments/image-filter/`. Its
synthetic benchmark remains available through `npm run bench:image-filter`; generated
benchmark reports are written under `notes/benchmark-results/`.

Canonical generated registries live under `../src/system/_ids.ts`, `_classes.ts`,
`_components.ts`, and `_specs.ts`. Regeneration must remain byte-for-byte stable in the
primary CI workflow.
