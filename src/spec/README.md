# Graph Specification Utilities

Canonical executable identity is defined by `identity.ts`.

Use `canonicalGraphString(spec)` for deterministic serialization and
`hashGraphSpec(spec)` for the lowercase SHA-256 graph identity. Editor-only metadata and
generated root `system` state are omitted by default; callers may override the omitted
key sets when a stricter identity domain is required.
