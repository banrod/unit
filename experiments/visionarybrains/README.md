# VisionaryBrains public teaching site

A dependency-light static site for public-safe IAM teaching. The site reads only integrated public content from `content/*.json` and uses bounded built-in fallback copy when content cannot be loaded.

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

The validator checks required files, JSON shape, internal anchors, unsafe remote references, unsafe HTML-injection primitives, accessibility safeguards, public-claim guardrails, and consumption of the integrated Teacher v1.1 visitor paths plus nature/stewardship copy.

## Browser qualification checklist

Use keyboard-only navigation to verify the skip link, menu toggle, navigation links, and visible focus. Check narrow and wide viewport layouts, operating-system reduced-motion preference, readable foreground/background contrast intent in both light and dark color schemes, and the live content-loading status. Browser observations are evidence only when actually performed; deterministic checks do not substitute for browser qualification.
