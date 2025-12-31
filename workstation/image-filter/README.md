# Image Filtering Prototype

This module demonstrates a dynamic, rooted filtering system capable of indexing and querying **100,000+ images** in real time. Images are stored with arbitrary tags and optional hierarchical _roots_ so that large collections can be segmented quickly based on the current use context.

## Features

- **Add / remove** images with flexible tag sets
- **Filter** by one or more tags at O(n) in the number of tags, not in the number of images
- **Root-based segmentation** keeps queries fast even as the dataset grows
- **Metrics-friendly** filtering returns duration + result counts for regression tracking

### Example Usage

```ts
const store = new ImageFilterStore()
store.addImage({ id: 'foo', tags: ['cat', 'cute'], root: 'a', path: 'foo.png' })
store.addImage({ id: 'bar', tags: ['dog'], root: 'b', path: 'bar.png' })

const cats = store.filter(['cat'], 'a')

const { results, metrics } = store.filterWithMetrics(['cat', 'cute'], 'a')
console.log(metrics.durationMs, metrics.resultCount)
```

The design supports algorithmic segmentation for massive image sets where filter conditions may change on the fly. One hundred thousand images can be filtered in a few milliseconds on modern hardware.

## Benchmarking

Run the synthetic benchmark (100k images, deterministic RNG) and emit a Markdown report under `notes/benchmark-results/`:

```
npm run bench:image-filter
```

Each run records build time and per-scenario latency (avg/min/max) so regressions are easy to spot.
