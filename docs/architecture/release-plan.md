# Kernel Release Administration

## Baseline tag

The consolidated `main` merge commit is:

`1e6aaaf6e1660af11eb1ffbaab6f1f24a9caf35a`

After release ownership and version semantics are confirmed, create the annotated tag:

```sh
git tag -a unit-kernel-v0.1.0 1e6aaaf6e1660af11eb1ffbaab6f1f24a9caf35a \
  -m "Canonical post-consolidation Unit kernel baseline"
git push origin unit-kernel-v0.1.0
```

The tag deliberately targets the consolidation baseline rather than the subsequent
hardening branch, preserving an exact recovery boundary.

## Branch protection

Configure `main` to require pull requests and the following checks before merge:

- `test`
- `Workstation Validation`

Recommended settings:

- require branches to be up to date before merging;
- require all review conversations to be resolved;
- prevent force pushes and deletion;
- include administrators unless emergency ownership policy requires otherwise;
- do not permit bypass by automation that also authors the change.

Repository rules and tag creation are administrative operations and are intentionally not
implemented through source-controlled workflow self-mutation.
