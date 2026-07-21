# Image Filtering Prototype

Status: experiment; not part of the Unit production kernel or standard library.

This module demonstrates a dynamic rooted filtering system for indexing and querying
large image collections. Images carry arbitrary tags and an optional root so collections
can be segmented by use context.

## Features

- add, replace, and remove images while maintaining reverse indices;
- intersect one or more tag indices;
- optionally filter by root;
- emit lightweight timing and result-count metrics;
- benchmark deterministic synthetic collections of 100,000 images.

## Run

```sh
npm run bench:image-filter
```

Generated benchmark reports are written under `workstation/notes/benchmark-results/`
and are intentionally ignored by Git. CI or local tooling may publish them as artifacts.

## Promotion rule

This prototype may enter a production package only after it has:

1. replacement and removal regression tests;
2. memory and latency budgets;
3. a documented consumer outside the experiment itself;
4. an explicit package boundary that does not add image-domain concepts to the graph kernel;
5. required CI coverage.

Until those conditions are met, downstream products should consume it as an experiment
or extract it into a separate package.
