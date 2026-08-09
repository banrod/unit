# VisionaryBrains public teaching site

A dependency-light static site for public-safe IAM teaching. The site reads only integrated public content from `content/*.json` and uses bounded built-in fallback copy when content cannot be loaded.

## Public distribution boundary

This tree is a public projection, not the source workspace. Public distribution may contain the visitor site, integrated public teaching content, validation code, and `provenance/public-source-index.json`.

Raw excavation notes, `INTERNAL_ONLY` material, exact private artifact names or locations, worker queues, lane-status records, receipts, and other control-plane residue stay outside the public projection.

The public provenance index contains only `PUBLIC_CANON` and `PUBLIC_DERIVED` records. Private provenance for derived material is retained outside this repository.

This cleanup governs the forward tree. Git history is not rewritten.

## Run locally

From `experiments/visionarybrains/`:

```sh
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/` in a browser.

## Deterministic validation

```sh
npm run validate
```

Validation checks the public shell plus the distribution boundary: required files, JSON shape, internal anchors, unsafe remote references, unsafe HTML-injection primitives, accessibility safeguards, public-claim guardrails, integrated teaching consumption, allowed public provenance classifications, and absence of private/control-plane residue.

## Browser qualification checklist

Use keyboard-only navigation to verify the skip link, menu toggle, navigation links, and visible focus. Check narrow and wide viewport layouts, operating-system reduced-motion preference, readable foreground/background contrast intent in both light and dark color schemes, and the live content-loading status. Browser observations are evidence only when actually performed; deterministic checks do not substitute for browser qualification.
