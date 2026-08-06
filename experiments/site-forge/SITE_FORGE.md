# AlienOS Systems Atlas — Site Forge Experiment

Status: active experiment; noncanonical; public-safe.

## Objective

Build a responsive, accessible, dependency-light website that presents the AlienOS ecosystem as an interactive systems narrative. The first milestone is a reviewable static MVP, not a production deployment.

## Public-safe scope

The site may describe AlienOS, Project Q, IAM, InfiniChain, PBOS, and related concepts only at an abstract architectural level. It must not expose credentials, private repository details, internal URLs, operational digests, personal data, unpublished security findings, or claims of canonical authority.

## MVP

The reviewable MVP includes:

1. Semantic page structure and responsive navigation.
2. A distinctive hero and concise systems thesis.
3. An interactive, keyboard-operable systems map.
4. Module cards sourced from structured content.
5. A build-lineage timeline and principles section.
6. Reduced-motion support, visible focus states, and practical contrast safeguards.
7. Deterministic repository validation with no runtime dependencies.

## Technical boundary

- Root: `experiments/site-forge/`
- Integration branch: `experiment/site-forge`
- Runtime: static HTML, CSS, and browser JavaScript.
- Content source: `content.json`, with a safe JavaScript fallback.
- Remote runtime assets, trackers, external fonts, and production deployment are out of scope.
- The only allowed repository-external experiment file is `.github/workflows/site-forge-validation.yml`.

## Lane ownership

- `Site Forge — Blueprint`: `SITE_FORGE.md`, `work-queue.json`, `lane-status/blueprint.json`.
- `Site Forge — Build`: `index.html`, `app.js`, scoped `package.json`, `README.md`, `tests/**`, `lane-status/build.json`, and the Site Forge validation workflow.
- `Site Forge — Experience`: `styles.css`, `content.json`, `assets/**`, and `lane-status/experience.json`.
- `Site Forge — Integrate`: pull-request review/merge plus queue and integration-status reconciliation.

Implementation lanes must not merge their own pull requests. Integrate must never merge the experiment into `main` or deploy it without explicit user authorization.

## Current milestone

`M0 — FOUNDATION`: establish compatible structural and experience layers, deterministic validation, and a first integrated page.