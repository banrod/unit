# Image Filter Benchmark Plan

This plan converts the facilitation next step into actionable work so we can quantify system performance.

## Objective
Measure query latency and memory usage for the `ImageFilterStore` prototype while indexing 100k+ images under different tagging densities.

## Scenarios
1. **Uniform Tagging** – Every image has the same number of tags.
2. **Skewed Tagging** – 10% of images carry 80% of the tags.
3. **Root Fan-out Stress** – Each root aggregates thousands of descendants to test traversal overhead.

## Metrics
- Response time for common queries (tag-only, root-only, combined filters).
- Memory footprint of the store and indices.
- Throughput when applying batched updates (adds/removals).

## Tooling
- Add lightweight `performance.now()` instrumentation around `ImageFilterStore` operations before the first recorded run.
- Capture metrics with the existing example script and export JSON snapshots per scenario.
- Track runs in `workstation/notes/benchmark-results/` (create a dated subfolder per execution).

## Timeline
- **Day 1:** Implement instrumentation hooks in `ImageFilterStore`.
- **Day 2:** Run scenarios, archive results, and summarize findings.
- **Day 3:** Review metrics, adjust data structures if bottlenecks appear.

## Follow-up
- Integrate key metrics into the facilitation assessment once the first run completes.
- Use insights to prioritize future tooling (e.g., watchers, alerting for regressions).
